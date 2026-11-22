import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule, Plus, FileUp, ChevronLeft, ChevronRight } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { UserService } from '../../core/services/user.service';
import { Category, PaymentMethod, Transaction, User } from '../../core/models';
import { todayIso } from '../../shared/utils/card-periods';
import {
  categoryBreakdown,
  monthLabel,
  monthOf,
  monthRange,
  monthStats,
  pace,
  personSplit,
  shiftMonth
} from './dashboard-stats';

const HISTORY_MONTHS = 6;
const AVERAGE_MONTHS = 3;
const SHARED_COLOR = '#14b8a6';
const PERSON_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#8b5cf6'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly icons = { Plus, FileUp, ChevronLeft, ChevronRight };
  readonly sharedColor = SHARED_COLOR;
  readonly currentYm = todayIso().slice(0, 7);

  userName = signal('');
  selectedYm = signal(this.currentYm);
  loading = signal(true);
  transactions = signal<Transaction[]>([]);
  categories = signal<Category[]>([]);
  paymentMethods = signal<PaymentMethod[]>([]);
  users = signal<User[]>([]);

  private readonly creditCardIds = computed(() =>
    new Set(this.paymentMethods().filter(m => m.accountType === 'CREDIT').map(m => m.id)));

  readonly monthTitle = computed(() => monthLabel(this.selectedYm()));
  readonly isCurrentMonth = computed(() => this.selectedYm() === this.currentYm);

  readonly stats = computed(() => monthStats(this.transactions(), this.selectedYm(), this.creditCardIds()));

  /** De dónde salió el gasto real: cada cuenta que no es tarjeta de crédito, más los pagos de tarjeta. */
  readonly spentSources = computed(() => {
    const ym = this.selectedYm();
    const credit = this.creditCardIds();
    const byMethod = new Map<number, number>();
    this.transactions()
      .filter(t => t.transactionType === 'EXPENSE' && monthOf(t.date) === ym && !credit.has(t.paymentMethodId))
      .forEach(t => byMethod.set(t.paymentMethodId, (byMethod.get(t.paymentMethodId) ?? 0) + Number(t.amount || 0)));
    const sources = [...byMethod.entries()]
      .map(([id, amount]) => ({ label: this.methodLabel(id), amount }))
      .sort((a, b) => b.amount - a.amount);
    if (this.stats().cardPayments > 0) sources.push({ label: 'Pagos de tarjeta', amount: this.stats().cardPayments });
    return sources;
  });

  readonly pace = computed(() => {
    const previous = monthRange(shiftMonth(this.selectedYm(), -1), AVERAGE_MONTHS)
      .map(ym => monthStats(this.transactions(), ym, this.creditCardIds()).spent);
    return pace(this.stats().spent, previous, this.selectedYm());
  });

  readonly split = computed(() => {
    const s = personSplit(this.transactions(), this.selectedYm());
    const total = s.shared + s.people.reduce((acc, p) => acc + p.amount, 0);
    const segments = [
      { label: 'Compartido', amount: s.shared, color: SHARED_COLOR },
      ...s.people.map(p => ({ label: this.userLabel(p.userId), amount: p.amount, color: this.personColor(p.userId) }))
    ].filter(x => x.amount > 0);
    return { total, segments };
  });

  readonly categoriesOfMonth = computed(() =>
    categoryBreakdown(this.transactions(), this.selectedYm(),
      id => this.categories().find(c => c.id === id)?.name ?? 'Sin categoría'));

  readonly history = computed(() =>
    monthRange(this.selectedYm(), HISTORY_MONTHS).reverse()
      .map(ym => ({ ...monthStats(this.transactions(), ym, this.creditCardIds()), label: monthLabel(ym, 'short') })));

  readonly historyMax = computed(() =>
    Math.max(1, ...this.history().map(h => Math.max(h.income, h.spent))));

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.userName.set(user?.name?.split(' ')[0] ?? '');
    if (user?.id) {
      this.userService.getUserById(user.id).subscribe({
        next: u => this.userName.set(u.name?.split(' ')[0] ?? ''),
        error: () => {}
      });
    }
    this.loadMonthData();
  }

  // ===========================================================================
  // Navegación de mes
  // ===========================================================================

  changeMonth(delta: number): void {
    const next = shiftMonth(this.selectedYm(), delta);
    if (next > this.currentYm) return;
    this.selectedYm.set(next);
    this.loadMonthData();
  }

  // ===========================================================================
  // Datos
  // ===========================================================================

  /** Trae los 6 meses que terminan en el mes elegido (más uno extra para comparar categorías y promedio). */
  async loadMonthData(): Promise<void> {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;
    this.loading.set(true);

    const firstYm = shiftMonth(this.selectedYm(), -HISTORY_MONTHS);
    const [ly, lm] = this.selectedYm().split('-').map(Number);
    const lastDay = new Date(ly, lm, 0).getDate();

    try {
      const [txs, cats, methods, users] = await Promise.all([
        firstValueFrom(this.transactionService.getTransactionsByDateRange(
          tenantId, `${firstYm}-01`, `${this.selectedYm()}-${String(lastDay).padStart(2, '0')}`)),
        this.categories().length ? Promise.resolve(null) : firstValueFrom(this.categoryService.getByTenant(tenantId, 0, 200)),
        this.paymentMethods().length ? Promise.resolve(null) : firstValueFrom(this.paymentMethodService.getByTenant(tenantId, 0, 100)),
        this.users().length ? Promise.resolve(null) : firstValueFrom(this.userService.getUsersByTenant(tenantId))
      ]);
      this.transactions.set(txs ?? []);
      if (cats) this.categories.set(cats.content ?? []);
      if (methods) this.paymentMethods.set(methods.content ?? []);
      if (users) this.users.set(users ?? []);
    } catch (e) {
      console.error('Error cargando el dashboard', e);
    } finally {
      this.loading.set(false);
    }
  }

  // ===========================================================================
  // Helpers de plantilla
  // ===========================================================================

  paceVerdictText(): string {
    const p = this.pace();
    if (p.verdict === 'none') return 'Todavía no hay meses anteriores para comparar.';
    const pct = Math.round(p.ratio * 100);
    if (p.inProgress) {
      return p.verdict === 'above'
        ? `Ya gastaron ${pct}% de lo habitual en un mes: van por arriba.`
        : `Llevan ${pct}% de lo que gastan normalmente en un mes.`;
    }
    return p.verdict === 'above' ? `Gastaron ${pct}% de lo habitual: más que otros meses.`
      : p.verdict === 'below' ? `Gastaron ${pct}% de lo habitual: menos que otros meses.`
      : `Gastaron ${pct}% de lo habitual: un mes normal.`;
  }

  barPercent(value: number, max: number): number {
    return max > 0 ? Math.min(100, (value / max) * 100) : 0;
  }

  private methodLabel(id: number): string {
    const m = this.paymentMethods().find(x => x.id === id);
    if (!m) return 'Otra cuenta';
    if (m.alias) return m.alias;
    return m.accountType === 'CASH' ? 'Efectivo' : m.bankName;
  }

  userLabel(userId: number): string {
    return this.users().find(u => u.id === userId)?.name?.split(' ')[0] ?? 'Persona';
  }

  personColor(userId: number): string {
    const ids = this.users().map(u => u.id).sort((a, b) => a - b);
    const index = ids.indexOf(userId);
    return PERSON_COLORS[(index >= 0 ? index : 0) % PERSON_COLORS.length];
  }

  go(path: string): void {
    this.router.navigate([path]);
  }
}
