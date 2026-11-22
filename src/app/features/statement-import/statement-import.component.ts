import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Category, PaymentMethod, Transaction, TransactionRequest, User } from '../../core/models';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { CLAUDE_INSTRUCTIONS } from './statement-import.prompt';
import {
  ReviewRow,
  buildRows,
  duplicateSearchRange,
  parseClaudeResponse,
  shiftDate
} from './statement-import.logic';

type View = 'setup' | 'review' | 'done';
type RowFilter = 'PENDING' | 'DISCARDED' | 'ALL';

/** Revisión en curso; se guarda en el navegador para no perderla si se cierra la página. */
interface ReviewDraft {
  version: 1;
  paymentMethodId: number;
  bank: string;
  periodStart: string;
  periodEnd: string;
  skipped: number;
  createdAt: string;
  rows: ReviewRow[];
}

const HISTORY_DAYS = 365;
const MSI_OPTIONS = [3, 6, 9, 12, 13, 18, 24, 36];

@Component({
  selector: 'app-statement-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './statement-import.component.html',
  styleUrl: './statement-import.component.scss'
})
export class StatementImportComponent implements OnInit {
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly instructions = CLAUDE_INSTRUCTIONS;
  readonly msiOptions = MSI_OPTIONS;

  // Catálogos
  paymentMethods = signal<PaymentMethod[]>([]);
  categories = signal<Category[]>([]);
  users = signal<User[]>([]);

  // Paso 1: pegar
  view = signal<View>('setup');
  selectedPaymentMethodId = signal<number | null>(null);
  pastedText = signal('');
  showInstructions = signal(false);
  copied = signal(false);
  loading = signal(false);
  loadError = signal<string | null>(null);
  savedDraft = signal<ReviewDraft | null>(null);

  // Paso 2: revisar
  draft = signal<ReviewDraft | null>(null);
  rows = signal<ReviewRow[]>([]);
  rowFilter = signal<RowFilter>('PENDING');
  selectedIds = signal<Set<number>>(new Set());

  // Paso 3: confirmar
  importing = signal(false);
  progress = signal({ done: 0, total: 0 });
  importedCount = signal(0);

  readonly visibleRows = computed(() => {
    const filter = this.rowFilter();
    const rows = this.rows();
    if (filter === 'ALL') return rows;
    if (filter === 'DISCARDED') return rows.filter(r => r.status === 'DISCARDED');
    return rows.filter(r => r.status === 'PENDING');
  });

  readonly counts = computed(() => {
    const rows = this.rows();
    return {
      pending: rows.filter(r => r.status === 'PENDING').length,
      discarded: rows.filter(r => r.status === 'DISCARDED').length,
      imported: rows.filter(r => r.status === 'IMPORTED').length,
      failed: rows.filter(r => r.status === 'PENDING' && r.error).length,
      all: rows.length
    };
  });

  readonly summary = computed(() => {
    const pending = this.rows().filter(r => r.status === 'PENDING');
    const sum = (list: ReviewRow[]) => list.reduce((acc, r) => acc + r.amount, 0);
    const expenses = pending.filter(r => r.transactionType === 'EXPENSE');
    return {
      count: pending.length,
      expenses: sum(expenses),
      incomes: sum(pending.filter(r => r.transactionType === 'INCOME')),
      shared: sum(expenses.filter(r => r.isShared)),
      personal: sum(expenses.filter(r => !r.isShared))
    };
  });

  readonly allVisibleSelected = computed(() => {
    const editable = this.visibleRows().filter(r => r.status !== 'IMPORTED');
    const selected = this.selectedIds();
    return editable.length > 0 && editable.every(r => selected.has(r.id));
  });

  ngOnInit(): void {
    this.loadCatalogs();
    this.savedDraft.set(this.readDraft());
  }

  // ===========================================================================
  // Catálogos
  // ===========================================================================

  private loadCatalogs(): void {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;
    this.paymentMethodService.getByTenant(tenantId, 0, 100).subscribe(page =>
      this.paymentMethods.set((page?.content || []).filter(pm => pm.isActive !== false)));
    this.categoryService.getByTenant(tenantId, 0, 200).subscribe(page =>
      this.categories.set([...(page?.content || [])].sort((a, b) => a.name.localeCompare(b.name))));
    this.userService.getUsersByTenant(tenantId).subscribe(users => this.users.set(users || []));
  }

  // ===========================================================================
  // Paso 1: copiar instrucciones y pegar la respuesta
  // ===========================================================================

  async copyInstructions(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.instructions);
    } catch {
      // Navegadores sin permiso de portapapeles: copia con un textarea temporal
      const area = document.createElement('textarea');
      area.value = this.instructions;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }

  async loadMovements(): Promise<void> {
    const tenantId = this.authService.getTenantId();
    const paymentMethodId = this.selectedPaymentMethodId();
    if (!tenantId || !paymentMethodId || this.loading()) return;

    this.loadError.set(null);
    let parsed;
    try {
      parsed = parseClaudeResponse(this.pastedText());
    } catch (e: any) {
      this.loadError.set(e?.message || 'No se pudo leer la respuesta.');
      return;
    }

    this.loading.set(true);
    try {
      const range = duplicateSearchRange(parsed.statement);
      const today = new Date().toISOString().slice(0, 10);
      const [existingOnCard, history] = await Promise.all([
        firstValueFrom(this.transactionService.filterTransactions(tenantId, { ...range, paymentMethodId })),
        firstValueFrom(this.transactionService.getTransactionsByDateRange(tenantId, shiftDate(today, -HISTORY_DAYS), today))
      ]);
      const owner = this.paymentMethods().find(pm => pm.id === paymentMethodId)?.userId
        ?? this.authService.currentUser()?.id ?? null;

      const rows = buildRows(parsed.statement, {
        ownerUserId: owner,
        existingOnCard: existingOnCard || [],
        history: history || []
      });

      this.startReview({
        version: 1,
        paymentMethodId,
        bank: parsed.statement.bank,
        periodStart: parsed.statement.periodStart,
        periodEnd: parsed.statement.periodEnd,
        skipped: parsed.skipped,
        createdAt: new Date().toISOString(),
        rows
      });
      this.pastedText.set('');
    } catch (err) {
      this.loadError.set(this.errorMessage(err, 'No se pudieron consultar tus transacciones. Intenta de nuevo.'));
    } finally {
      this.loading.set(false);
    }
  }

  resumeDraft(): void {
    const saved = this.savedDraft();
    if (saved) this.startReview(saved);
  }

  discardSavedDraft(): void {
    if (!confirm('¿Descartar la revisión sin terminar? No se importará nada de ella.')) return;
    this.clearDraft();
    this.savedDraft.set(null);
  }

  private startReview(draft: ReviewDraft): void {
    this.draft.set(draft);
    this.rows.set(draft.rows.map(r => ({ ...r })));
    this.selectedIds.set(new Set());
    this.rowFilter.set('PENDING');
    this.savedDraft.set(null);
    this.view.set('review');
    this.persist();
  }

  // ===========================================================================
  // Paso 2: revisión
  // ===========================================================================

  updateRow(row: ReviewRow, changes: Partial<ReviewRow>): void {
    if (row.status === 'IMPORTED' || this.importing()) return;
    this.rows.update(rows => rows.map(r => (r.id === row.id ? this.normalizeRow({ ...r, ...changes }) : r)));
    this.persist();
  }

  toggleDiscard(row: ReviewRow): void {
    this.updateRow(row, { status: row.status === 'DISCARDED' ? 'PENDING' : 'DISCARDED' });
  }

  onCategoryChange(row: ReviewRow, value: string): void {
    this.updateRow(row, { categoryId: value ? Number(value) : null });
  }

  onUserChange(row: ReviewRow, value: string): void {
    this.updateRow(row, { userId: value ? Number(value) : null });
  }

  onInstallmentsChange(row: ReviewRow, value: string): void {
    this.updateRow(row, { totalInstallments: Number(value) || null });
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: number): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selectedIds.set(next);
  }

  toggleSelectAll(): void {
    if (this.allVisibleSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.visibleRows().filter(r => r.status !== 'IMPORTED').map(r => r.id)));
    }
  }

  bulkUpdate(changes: Partial<ReviewRow>): void {
    const selected = this.selectedIds();
    if (!selected.size || this.importing()) return;
    this.rows.update(rows => rows.map(r =>
      selected.has(r.id) && r.status !== 'IMPORTED' ? this.normalizeRow({ ...r, ...changes }) : r));
    if (changes.status) this.selectedIds.set(new Set());
    this.persist();
  }

  bulkCategory(value: string): void {
    if (value === '') return;
    this.bulkUpdate({ categoryId: value === 'none' ? null : Number(value) });
  }

  bulkUser(value: string): void {
    if (value) this.bulkUpdate({ userId: Number(value) });
  }

  cancelReview(): void {
    const pending = this.counts().pending;
    const message = pending > 0
      ? `¿Cancelar la revisión? Los ${pending} movimientos por importar no se guardarán.`
      : '¿Cerrar esta revisión?';
    if (!confirm(message)) return;
    this.resetToSetup();
  }

  private normalizeRow(row: ReviewRow): ReviewRow {
    if (row.transactionType === 'INCOME') row.hasInstallments = false;
    if (row.hasInstallments && (!row.totalInstallments || row.totalInstallments < 2)) row.totalInstallments = 3;
    if (!row.hasInstallments && row.flag !== 'MSI_PREVIO') row.totalInstallments = null;
    return row;
  }

  // ===========================================================================
  // Paso 3: confirmar
  // ===========================================================================

  async confirmImport(): Promise<void> {
    const draft = this.draft();
    const tenantId = this.authService.getTenantId();
    const toImport = this.rows().filter(r => r.status === 'PENDING');
    if (!draft || !tenantId || toImport.length === 0 || this.importing()) return;
    if (!confirm(`Se crearán ${toImport.length} transacciones. ¿Continuar?`)) return;

    this.importing.set(true);
    this.selectedIds.set(new Set());
    this.progress.set({ done: 0, total: toImport.length });

    for (const row of toImport) {
      try {
        await firstValueFrom(this.transactionService.createTransaction(this.toRequest(row, tenantId, draft.paymentMethodId)));
        this.setRowState(row.id, { status: 'IMPORTED', error: null });
        this.importedCount.update(n => n + 1);
      } catch (err) {
        this.setRowState(row.id, { error: this.errorMessage(err, 'No se pudo guardar') });
      }
      this.progress.update(p => ({ ...p, done: p.done + 1 }));
      this.persist();
    }

    this.importing.set(false);
    if (this.counts().failed === 0) {
      this.clearDraft();
      this.view.set('done');
    } else {
      this.rowFilter.set('PENDING');
    }
  }

  private toRequest(row: ReviewRow, tenantId: number, paymentMethodId: number): TransactionRequest {
    const msi = row.hasInstallments && row.transactionType === 'EXPENSE' && !!row.totalInstallments;
    return {
      tenantId,
      userId: row.userId ?? this.authService.currentUser()!.id,
      categoryId: row.categoryId ?? undefined,
      paymentMethodId,
      description: row.description,
      amount: row.amount,
      date: row.date,
      isShared: row.isShared,
      transactionType: row.transactionType,
      hasInstallments: msi,
      totalInstallments: msi ? row.totalInstallments! : 1
    };
  }

  private setRowState(id: number, changes: Partial<ReviewRow>): void {
    this.rows.update(rows => rows.map(r => (r.id === id ? { ...r, ...changes } : r)));
  }

  importAnother(): void {
    this.resetToSetup();
  }

  goToTransactions(): void {
    this.router.navigate(['/main/transactions']);
  }

  private resetToSetup(): void {
    this.clearDraft();
    this.draft.set(null);
    this.rows.set([]);
    this.importedCount.set(0);
    this.view.set('setup');
  }

  // ===========================================================================
  // Guardado en el navegador
  // ===========================================================================

  private draftKey(): string {
    return `statementImportDraft:${this.authService.getTenantId() ?? 'none'}`;
  }

  private persist(): void {
    const draft = this.draft();
    if (!draft) return;
    const updated = { ...draft, rows: this.rows() };
    this.draft.set(updated);
    try {
      localStorage.setItem(this.draftKey(), JSON.stringify(updated));
    } catch {
      // Sin almacenamiento disponible: la revisión sigue funcionando, solo no se recupera al recargar
    }
  }

  private readDraft(): ReviewDraft | null {
    try {
      const raw = localStorage.getItem(this.draftKey());
      if (!raw) return null;
      const draft = JSON.parse(raw) as ReviewDraft;
      const hasWork = draft?.version === 1 && Array.isArray(draft.rows) && draft.rows.some(r => r.status === 'PENDING');
      return hasWork ? draft : null;
    } catch {
      return null;
    }
  }

  private clearDraft(): void {
    try {
      localStorage.removeItem(this.draftKey());
    } catch {
      // nada que limpiar
    }
  }

  // ===========================================================================
  // Helpers de plantilla
  // ===========================================================================

  paymentMethodName(id: number | null | undefined): string {
    const pm = this.paymentMethods().find(p => p.id === id);
    if (!pm) return 'Tarjeta/cuenta';
    return pm.alias ? `${pm.bankName} — ${pm.alias}` : pm.bankName;
  }

  flagLabel(flag: string | null): string {
    switch (flag) {
      case 'POSIBLE_DUPLICADO': return 'Posible duplicado';
      case 'PAGO_TARJETA': return 'Pago a tarjeta';
      case 'MSI_PREVIO': return 'Mensualidad de compra anterior';
      default: return '';
    }
  }

  flagHint(flag: string | null): string {
    switch (flag) {
      case 'POSIBLE_DUPLICADO': return 'Ya tienes una transacción con el mismo monto en esta tarjeta en fechas cercanas.';
      case 'PAGO_TARJETA': return 'Los pagos de tarjeta se registran desde el módulo de pagos de tarjeta.';
      case 'MSI_PREVIO': return 'Es una mensualidad de una compra a meses anterior; la app ya genera esas cuotas.';
      default: return '';
    }
  }

  isCustomMsi(total: number | null): boolean {
    return !!total && !MSI_OPTIONS.includes(total);
  }

  private errorMessage(err: any, fallback: string): string {
    return err?.originalError?.error?.message || err?.error?.message || err?.message || fallback;
  }
}
