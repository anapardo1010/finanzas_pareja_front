// Agrega el modelo MSI a tu core/models si no existe
export interface UpcomingInstallment {
  installmentId: number;
  transactionDescription: string;
  installmentNumber: number;
  totalInstallments: number;
  installmentAmount: number;
  projectedDate: string;
  paymentMethodName: string;
}
import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, BarChart3, DollarSign, Calendar, CreditCard, ChevronDown, ChevronUp, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Chart from 'chart.js/auto';
import { CreditCardProportionalPayment, CreditCardPeriodDetail, CreditCardPaymentItem, PaymentMethod, Transaction } from '../../core/models';
import { FinanceReportService } from '../../core/services/finance-report.service';
import { CreditCardPaymentService } from '../../core/services/credit-card-payment.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { TransactionService } from '../../core/services/transaction.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit, OnDestroy {
        // Filtros para Débito y Efectivo
        filterDebitUser = '';
        filterDebitAccount = '';
        // Rango de fechas para filtrar (YYYY-MM-DD)
        filterStartDate = '';
        filterEndDate = '';
        users = signal<any[]>([]); // Usuarios para los filtros
        debitBalances = signal<any[]>([]); // Aquí se guardan los saldos/deudas
        debitAccounts = signal<{ id: number; name: string }[]>([]);
        loading = signal(false);
        readonly icons = { CreditCard, BarChart3, DollarSign, Calendar, Wallet: DollarSign, ChevronDown, ChevronUp, Plus, Trash2, TrendingUp, TrendingDown };

        // Cargar saldos de débito y efectivo
        loadDebitBalances() {
          const tenantId = this.authService.getTenantId();
          if (!tenantId) return;
          this.loading.set(true);
          const start = this.filterStartDate || undefined;
          const end = this.filterEndDate || undefined;
          this.financeService.getNonCreditProportionalPayments(tenantId, start, end).subscribe({
            next: (items) => {
              const list = (items ?? []).map(i => ({
                paymentMethodId: i.paymentMethodId,
                userId: i.userId, // titular
                paymentMethodName: i.bankName || i.alias || '' ,
                alias: i.alias,
                accountType: i.accountType,
                balance: i.currentBalance,
                currentBalance: i.currentBalance,
                transactionCount: i.transactionCount,
                userShares: i.userShares || []
              }));

              this.debitBalances.set(list);
              // Poblar usuarios y cuentas para los selects
              this.loadUsers();
              this.debitAccounts.set(list.map(b => ({ id: b.paymentMethodId, name: b.alias || b.paymentMethodName || (b.accountType === 'CASH' ? 'Efectivo' : 'Cuenta') })));
              this.loading.set(false);
            },
            error: () => this.loading.set(false)
          });
        }

        // Cálculo de deudas entre personas (estructura inicial)
        getDebitDebts() {
          // Filtrado dinámico por usuario y cuenta
          return this.debitBalances().filter(b => {
            const matchUser = !this.filterDebitUser || b.userId === +this.filterDebitUser;
            const matchAccount = !this.filterDebitAccount || b.paymentMethodId === +this.filterDebitAccount;
            return matchUser && matchAccount;
          });
        }

        // Helpers para deuda/owner
        getDebtors(balance: any) {
          // Devuelve solo los shares de usuarios que NO son el titular (quienes deben)
          return (balance.userShares || [])
            .filter((s: any) => s.userId !== balance.userId && (s.amountToPay ?? 0) > 0)
            .sort((a: any, b: any) => (b.amountToPay || 0) - (a.amountToPay || 0));
        }

        getOwnerName(balance: any) {
          const owner = (balance.userShares || []).find((s: any) => s.userId === balance.userId);
          return owner?.userName || 'Titular';
        }

        getTotalOwed(balance: any) {
          return (balance.userShares || []).reduce((acc: number, s: any) => s.userId !== balance.userId ? acc + (s.amountToPay || 0) : acc, 0);
        }

        loadUsers() {
          // Cargar usuarios reales del tenant (UserService)
          const tenantId = this.authService.getTenantId();
          if (!tenantId) return this.users.set([]);
          this.userService.getUsersByTenant(tenantId).subscribe({
            next: (u) => this.users.set(u || []),
            error: () => this.users.set([])
          });
        }


      // MSI signals y computed
      msiInstallments = signal<UpcomingInstallment[]>([]);
      monthsToProject = signal(3);

      groupedMsi = computed(() => {
        const installments = this.msiInstallments();
        const groups: { [key: string]: { monthName: string, installments: any[], total: number } } = {};

        installments.forEach(item => {
          const date = new Date(item.projectedDate);
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          const monthName = date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

          if (!groups[key]) {
            groups[key] = { monthName, installments: [], total: 0 };
          }
          groups[key].installments.push(item);
          groups[key].total += item.installmentAmount;
        });

        return Object.values(groups);
      });

      totalMsiThisMonth = computed(() => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        return this.msiInstallments()
          .filter(i => {
            const d = new Date(i.projectedDate);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          })
          .reduce((acc, curr) => acc + curr.installmentAmount, 0);
      });

      loadMsi() {
        const tenantId = this.authService.getTenantId();
        if (!tenantId) return;
        this.loading.set(true);
        this.financeService.getUpcomingInstallments(tenantId, this.monthsToProject()).subscribe({
          next: (val) => {
            // Mapear a UpcomingInstallment si es necesario
            const mapped = (val ?? []).map((item: any) => ({
              installmentId: item.installmentId,
              transactionDescription: item.transactionDescription,
              installmentNumber: item.installmentNumber,
              totalInstallments: item.totalInstallments,
              installmentAmount: item.installmentAmount,
              projectedDate: item.projectedDate,
              paymentMethodName: item.paymentMethodName
            }));
            this.msiInstallments.set(mapped);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      }

      onMonthsChange(event: any) {
        this.monthsToProject.set(Number(event.target.value));
        this.loadMsi();
      }
    activeTab: 'cards' | 'msi' | 'debit' | 'visualization' = 'cards';
  private readonly financeService = inject(FinanceReportService);
  private readonly paymentService = inject(CreditCardPaymentService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly transactionService = inject(TransactionService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  // Eliminado duplicado, icons ya está declarado arriba con Wallet incluido

  cards = signal<CreditCardProportionalPayment[]>([]);
  // loading ya está declarado más abajo, no duplicar

  selectedCards = computed(() => this.cards().filter(c => c.selected));

  finalSettlement = computed(() => {
    const selected = this.selectedCards();
    if (!selected.length) return null;

    const currentUserId = this.authService.currentUser()?.id;
    let owedToMe = 0;
    let iOwe = 0;
    let partnerName = 'Pareja';

    selected.forEach(card => {
      const myShare = card.userShares.find(s => s.userId === currentUserId);
      const partnerShare = card.userShares.find(s => s.userId !== currentUserId);
      if (partnerShare) partnerName = partnerShare.userName;

      if (card.userId === currentUserId) {
        owedToMe += partnerShare?.amountToPay || 0;
      } else {
        iOwe += myShare?.amountToPay || 0;
      }
    });

    const diff = owedToMe - iOwe;
    return {
      partnerName, owedToMe, iOwe,
      netDifference: Math.abs(diff),
      message: diff === 0 ? 'Están a mano' : diff > 0 ? `${partnerName} te debe` : `Tú le debes a ${partnerName}`
    };
  });

  ngOnInit() {
    // Por defecto, mostrar el mes actual en el filtro de fecha
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    this.filterStartDate = firstDay;
    this.filterEndDate = lastDay;

    this.loadCards();
    this.loadUsers();
    if (this.activeTab === 'msi') {
      this.loadMsi();
    }
    // Cargar balances para la pestaña debit si está activa
    if (this.activeTab === 'debit') this.loadDebitBalances();
  }

  // Detectar cambio de submenú y cargar datos según pestaña
  set activeTabWithLoad(tab: 'cards' | 'msi' | 'debit' | 'visualization') {
    this.activeTab = tab;
    if (tab === 'msi') this.loadMsi();
    if (tab === 'debit') {
      this.loadDebitBalances();
      setTimeout(() => this.loadUsers(), 250);
    }
    if (tab === 'visualization') this.loadVisualizationData();
  }

  loadCards() {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;
    this.loading.set(true);
    this.financeService.getCreditCardProportionalPayments(tenantId).subscribe({
      next: (val) => {
        const items = val ?? [];
        const mappedItems = items.map(c => {
          const card = { 
            ...c, 
            selected: false,
            availablePeriods: [] as any[],
            loadingPeriods: true,
            overduePeriodsCount: 0
          };
          
          this.financeService.getAvailablePeriods(c.paymentMethodId).subscribe({
            next: (periods) => {
              card.availablePeriods = periods || [];
              card.loadingPeriods = false;
              
              const todayStr = new Date().toISOString().split('T')[0];
              const overdueCount = card.availablePeriods.filter(p => !p.paid && p.endDate <= todayStr && p.periodId !== c.periodId).length;
              card.overduePeriodsCount = overdueCount;
            },
            error: () => {
              card.loadingPeriods = false;
            }
          });
          
          return card;
        });
        
        this.cards.set(mappedItems);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  toggleSelection(card: CreditCardProportionalPayment) {
    card.selected = !card.selected;
    this.cards.set([...this.cards()]);
  }

  markAsPaid(card: CreditCardProportionalPayment, event: Event) {
    event.stopPropagation(); // Evita seleccionar la tarjeta al hacer clic en el botón
    if (!card.periodId) return;
    const name = card.alias || card.bankName;
    if (confirm(`¿Marcar como pagado el periodo de ${name}?`)) {
      this.financeService.markCardBalanceAsPaid(card.paymentMethodId, card.periodId).subscribe({
        next: () => this.loadCards(),
        error: (err) => console.error(err)
      });
    }
  }

  // ── Period detail (desglose de cargos por tarjeta) ──────────────────────
  expandedCardId = signal<number | null>(null);
  periodDetail = signal<CreditCardPeriodDetail | null>(null);
  loadingDetail = signal(false);

  // ── Payment panel ──────────────────────────────────────────────────────
  payingCardId = signal<number | null>(null);
  payingCard = signal<CreditCardProportionalPayment | null>(null);
  paidAmount = signal(0);
  loadingPaid = signal(false);
  submittingPayment = signal(false);
  paymentRows = signal<{ sourcePaymentMethodId: number | null; paidByUserId: number | null; amount: number; notes: string }[]>([]);
  nonCreditMethods = signal<PaymentMethod[]>([]);

  paymentTotal = computed(() => this.paymentRows().reduce((s, r) => s + (r.amount || 0), 0));
  paymentPending = computed(() => {
    const card = this.payingCard();
    if (!card) return 0;
    return Math.max(0, card.totalDue - this.paidAmount() - this.paymentTotal());
  });

  togglePaymentPanel(card: CreditCardProportionalPayment, event: Event): void {
    event.stopPropagation();
    const cardId = card.paymentMethodId;
    if (this.payingCardId() === cardId) {
      this.payingCardId.set(null);
      this.payingCard.set(null);
      return;
    }
    this.payingCardId.set(cardId);
    this.payingCard.set(card);
    this.paymentRows.set([{ sourcePaymentMethodId: null, paidByUserId: null, amount: 0, notes: '' }]);
    this.loadNonCreditMethods();
    this.loadPaidAmount(card);
  }

  loadNonCreditMethods(): void {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;
    this.paymentMethodService.getByTenant(tenantId, 0, 100).subscribe({
      next: (page) => {
        const methods = (page.content ?? []).filter(m => m.accountType !== 'CREDIT');
        this.nonCreditMethods.set(methods);
      },
      error: () => this.nonCreditMethods.set([])
    });
  }

  loadPaidAmount(card: CreditCardProportionalPayment): void {
    if (!card.periodId) { this.paidAmount.set(0); return; }
    this.loadingPaid.set(true);
    this.paymentService.getPaidAmount(card.paymentMethodId, card.periodId).subscribe({
      next: (val) => { this.paidAmount.set(val ?? 0); this.loadingPaid.set(false); },
      error: () => { this.paidAmount.set(0); this.loadingPaid.set(false); }
    });
  }

  addPaymentRow(): void {
    this.paymentRows.set([...this.paymentRows(), { sourcePaymentMethodId: null, paidByUserId: null, amount: 0, notes: '' }]);
  }

  removePaymentRow(index: number): void {
    const rows = this.paymentRows().filter((_, i) => i !== index);
    this.paymentRows.set(rows.length ? rows : [{ sourcePaymentMethodId: null, paidByUserId: null, amount: 0, notes: '' }]);
  }

  updatePaymentRow(index: number, field: string, value: any): void {
    const rows = [...this.paymentRows()];
    (rows[index] as any)[field] = value;
    this.paymentRows.set(rows);
  }

  isPaymentValid(): boolean {
    const rows = this.paymentRows();
    return rows.every(r => r.sourcePaymentMethodId && r.paidByUserId && r.amount > 0) && rows.length > 0;
  }

  submitPayment(): void {
    const card = this.payingCard();
    const tenantId = this.authService.getTenantId();
    if (!card || !tenantId || !card.periodId) return;

    const payments: CreditCardPaymentItem[] = this.paymentRows().map(r => ({
      sourcePaymentMethodId: r.sourcePaymentMethodId!,
      paidByUserId: r.paidByUserId!,
      amount: r.amount,
      notes: r.notes || null
    }));

    this.submittingPayment.set(true);
    this.paymentService.pay(tenantId, {
      creditCardId: card.paymentMethodId,
      periodId: card.periodId,
      totalDue: card.totalDue,
      payments
    }).subscribe({
      next: () => {
        const totalPaid = this.paidAmount() + this.paymentTotal();
        if (totalPaid >= card.totalDue) {
          this.financeService.markCardBalanceAsPaid(card.paymentMethodId, card.periodId).subscribe({
            next: () => { this.closePaymentAndReload(); },
            error: () => { this.closePaymentAndReload(); }
          });
        } else {
          this.closePaymentAndReload();
        }
      },
      error: (err) => {
        console.error('Error registrando pago:', err);
        this.submittingPayment.set(false);
      }
    });
  }

  private closePaymentAndReload(): void {
    this.payingCardId.set(null);
    this.payingCard.set(null);
    this.submittingPayment.set(false);
    this.loadCards();
  }

  onPeriodChange(card: any, periodId: string) {
    if (!periodId || card.periodId === periodId) return;

    // Forzar re-render del signal al mutar loadingPeriods
    card.loadingPeriods = true;
    this.cards.set([...this.cards()]);

    this.financeService.getCreditCardProportionalPayment(card.paymentMethodId, periodId).subscribe({
      next: (newCardData) => {
        const updatedCards = this.cards().map(c => {
          if (c.paymentMethodId === card.paymentMethodId) {
            return {
              ...c,
              ...newCardData,
              periodId: periodId,          // asegurar que el periodId queda actualizado
              availablePeriods: card.availablePeriods,
              loadingPeriods: false,
              overduePeriodsCount: card.overduePeriodsCount
            };
          }
          return c;
        });

        this.cards.set(updatedCards);

        // Si el desglose está abierto, recargar con el nuevo periodo
        if (this.expandedCardId() === card.paymentMethodId) {
          this.loadPeriodDetail(card.paymentMethodId, periodId);
        }

        if (this.payingCardId() === card.paymentMethodId) {
          const updatedPayingCard = updatedCards.find(c => c.paymentMethodId === card.paymentMethodId);
          if (updatedPayingCard) {
            this.payingCard.set(updatedPayingCard);
            this.loadPaidAmount(updatedPayingCard);
          }
        }
      },
      error: (err) => {
        console.error('Error cargando el periodo de la tarjeta:', err);
        card.loadingPeriods = false;
        this.cards.set([...this.cards()]); // restaurar estado en error
      }
    });
  }

  togglePeriodDetail(card: CreditCardProportionalPayment, event: Event): void {
    event.stopPropagation();
    const cardId = card.paymentMethodId;
    if (this.expandedCardId() === cardId) {
      this.expandedCardId.set(null);
      this.periodDetail.set(null);
      return;
    }
    this.expandedCardId.set(cardId);
    this.loadPeriodDetail(cardId, card.periodId);
  }

  loadPeriodDetail(cardId: number, periodId: string) {
    this.loadingDetail.set(true);
    this.financeService.getCreditCardPeriodDetail(cardId, periodId).subscribe({
      next: (detail) => {
        this.periodDetail.set(detail);
        this.loadingDetail.set(false);
      },
      error: () => {
        this.periodDetail.set(null);
        this.loadingDetail.set(false);
      }
    });
  }

  formatCurrency = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
  formatDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  getStatusClass = (s: string) => s === 'PAID' ? 'paid' : s === 'OVERDUE' ? 'overdue' : 'pending';

  // ── Navegación de periodos con flechas ──────────────────────────────────
  getPeriodIndex(card: any): number {
    if (!card.availablePeriods?.length) return 0;
    const idx = card.availablePeriods.findIndex((p: any) => p.periodId === card.periodId);
    return idx >= 0 ? idx : 0;
  }

  getPeriodLabel(card: any): string {
    if (!card.availablePeriods?.length) return '—';
    const period = card.availablePeriods.find((p: any) => p.periodId === card.periodId);
    if (!period) return '—';
    return `${this.formatDate(period.startDate)} – ${this.formatDate(period.endDate)}`;
  }

  isPeriodPaid(card: any): boolean {
    if (!card.availablePeriods?.length) return false;
    const period = card.availablePeriods.find((p: any) => p.periodId === card.periodId);
    return period?.paid ?? false;
  }

  navigatePeriod(card: any, direction: -1 | 1): void {
    const idx = this.getPeriodIndex(card);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= card.availablePeriods.length) return;
    const newPeriod = card.availablePeriods[newIdx];
    this.onPeriodChange(card, newPeriod.periodId);
  }

  // ── Visualización de gastos ─────────────────────────────────────────────
  vizPeriod = signal<number>(3);
  loadingViz = signal(false);
  private tarjetazosChart: Chart | null = null;
  private gastosRealesChart: Chart | null = null;
  showRealBreakdown = signal(false);
  realBreakdown = signal<{ type: 'income' | 'expense'; methodName: string; total: number }[]>([]);

  vizPeriodOptions = [
    { label: 'Mes actual', value: 1 },
    { label: '3 meses', value: 3 },
    { label: '6 meses', value: 6 },
    { label: '1 año', value: 12 }
  ];

  selectVizPeriod(months: number): void {
    this.vizPeriod.set(months);
    this.loadVisualizationData();
  }

  private allPaymentMethods = signal<PaymentMethod[]>([]);

  loadVisualizationData(): void {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;
    this.loadingViz.set(true);

    const months = this.vizPeriod();
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    forkJoin({
      transactions: this.transactionService.filterTransactions(tenantId, { startDate: startStr, endDate: endStr }),
      methods: this.paymentMethodService.getByTenant(tenantId, 0, 100)
    }).subscribe({
      next: ({ transactions, methods }) => {
        this.allPaymentMethods.set(methods.content ?? []);
        this.loadingViz.set(false);
        const monthLabels = this.buildMonthLabels(startDate, endDate);
        this.buildRealBreakdown(transactions);
        setTimeout(() => {
          this.renderTarjetazosChart(transactions, monthLabels);
          this.renderGastosRealesChart(transactions, monthLabels);
        }, 50);
      },
      error: () => this.loadingViz.set(false)
    });
  }

  private buildMonthLabels(start: Date, end: Date): { key: string; label: string }[] {
    const labels: { key: string; label: string }[] = [];
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d <= end) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
      labels.push({ key, label });
      d.setMonth(d.getMonth() + 1);
    }
    return labels;
  }

  private getMonthKey(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private renderTarjetazosChart(transactions: Transaction[], monthLabels: { key: string; label: string }[]): void {
    const expenses = transactions.filter(t => t.transactionType === 'EXPENSE');

    // Agrupar por paymentMethodId y mes
    const pmIds = [...new Set(expenses.map(t => t.paymentMethodId))];
    const methodMap = new Map(this.allPaymentMethods().map(m => [m.id, m.alias || m.bankName || `#${m.id}`]));
    const pmLabels = pmIds.map(id => methodMap.get(id) || `Método ${id}`);

    // data[monthKey][pmId] = amount
    const data: Record<string, Record<number, number>> = {};
    monthLabels.forEach(m => {
      data[m.key] = {};
      pmIds.forEach(id => data[m.key][id] = 0);
    });

    expenses.forEach(t => {
      const key = this.getMonthKey(t.date);
      if (data[key]?.[t.paymentMethodId] !== undefined) {
        data[key][t.paymentMethodId] += t.amount;
      }
    });

    // Paleta de colores por mes
    const palette = [
      'rgba(59, 130, 246, 0.75)',   // blue
      'rgba(239, 68, 68, 0.75)',    // red
      'rgba(34, 197, 94, 0.75)',    // green
      'rgba(168, 85, 247, 0.75)',   // purple
      'rgba(245, 158, 11, 0.75)',   // amber
      'rgba(236, 72, 153, 0.75)',   // pink
      'rgba(20, 184, 166, 0.75)',   // teal
      'rgba(249, 115, 22, 0.75)',   // orange
      'rgba(99, 102, 241, 0.75)',   // indigo
      'rgba(234, 179, 8, 0.75)',    // yellow
      'rgba(6, 182, 212, 0.75)',    // cyan
      'rgba(244, 63, 94, 0.75)',    // rose
    ];

    const datasets = monthLabels.map((m, i) => ({
      label: m.label,
      data: pmIds.map(id => data[m.key][id]),
      backgroundColor: palette[i % palette.length],
      borderColor: palette[i % palette.length].replace('0.75', '1'),
      borderWidth: 1,
      borderRadius: 6
    }));

    if (this.tarjetazosChart) this.tarjetazosChart.destroy();
    const ctx = document.getElementById('tarjetazosChart') as HTMLCanvasElement;
    if (!ctx) return;
    this.tarjetazosChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: pmLabels, datasets },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { usePointStyle: true, padding: 14, font: { weight: 'bold' as const } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${this.formatCurrency(ctx.parsed.x ?? 0)}`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { callback: (v) => this.formatCurrency(v as number) }
          },
          y: {
            grid: { display: false },
            ticks: { font: { weight: 'bold' as const } }
          }
        }
      }
    });
  }

  private renderGastosRealesChart(transactions: Transaction[], monthLabels: { key: string; label: string }[]): void {
    const creditCardIds = new Set(this.cards().map(c => c.paymentMethodId));
    const methodMap = new Map(this.allPaymentMethods().map(m => [m.id, m.alias || m.bankName || `#${m.id}`]));

    // Clasificar transacciones reales
    const realTxs = transactions.filter(t =>
      t.transactionType === 'INCOME' ||
      t.transactionType === 'CREDIT_PAYMENT' ||
      (t.transactionType === 'EXPENSE' && !creditCardIds.has(t.paymentMethodId))
    );

    // Separar ingresos y gastos, agrupar por paymentMethodId
    const incomePmIds = new Set<number>();
    const expensePmIds = new Set<number>();

    realTxs.forEach(t => {
      if (t.transactionType === 'INCOME') incomePmIds.add(t.paymentMethodId);
      else expensePmIds.add(t.paymentMethodId);
    });

    // data[pmId][monthKey] = amount
    const incomeData: Record<number, Record<string, number>> = {};
    const expenseData: Record<number, Record<string, number>> = {};

    incomePmIds.forEach(id => {
      incomeData[id] = {};
      monthLabels.forEach(m => incomeData[id][m.key] = 0);
    });
    expensePmIds.forEach(id => {
      expenseData[id] = {};
      monthLabels.forEach(m => expenseData[id][m.key] = 0);
    });

    realTxs.forEach(t => {
      const key = this.getMonthKey(t.date);
      if (t.transactionType === 'INCOME') {
        if (incomeData[t.paymentMethodId]?.[key] !== undefined)
          incomeData[t.paymentMethodId][key] += t.amount;
      } else {
        if (expenseData[t.paymentMethodId]?.[key] !== undefined)
          expenseData[t.paymentMethodId][key] += t.amount;
      }
    });

    // Paleta verde para ingresos, roja para gastos
    const greenPalette = [
      'rgba(34, 197, 94, 0.8)', 'rgba(22, 163, 74, 0.8)', 'rgba(21, 128, 61, 0.8)',
      'rgba(74, 222, 128, 0.8)', 'rgba(134, 239, 172, 0.8)', 'rgba(5, 150, 105, 0.8)'
    ];
    const redPalette = [
      'rgba(239, 68, 68, 0.8)', 'rgba(220, 38, 38, 0.8)', 'rgba(185, 28, 28, 0.8)',
      'rgba(248, 113, 113, 0.8)', 'rgba(252, 165, 165, 0.8)', 'rgba(153, 27, 27, 0.8)'
    ];

    const datasets: any[] = [];

    // Ingresos stacked
    [...incomePmIds].forEach((pmId, i) => {
      datasets.push({
        label: `↑ ${methodMap.get(pmId) || `Método ${pmId}`}`,
        data: monthLabels.map(m => incomeData[pmId][m.key]),
        backgroundColor: greenPalette[i % greenPalette.length],
        borderWidth: 0,
        borderRadius: i === incomePmIds.size - 1 ? 6 : 0,
        stack: 'income'
      });
    });

    // Gastos stacked (negativo para mostrar abajo)
    [...expensePmIds].forEach((pmId, i) => {
      datasets.push({
        label: `↓ ${methodMap.get(pmId) || `Método ${pmId}`}`,
        data: monthLabels.map(m => -expenseData[pmId][m.key]),
        backgroundColor: redPalette[i % redPalette.length],
        borderWidth: 0,
        borderRadius: i === expensePmIds.size - 1 ? 6 : 0,
        stack: 'expense'
      });
    });

    if (this.gastosRealesChart) this.gastosRealesChart.destroy();
    const ctx = document.getElementById('gastosRealesChart') as HTMLCanvasElement;
    if (!ctx) return;
    this.gastosRealesChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: monthLabels.map(m => m.label), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { usePointStyle: true, padding: 12, font: { size: 11, weight: 'bold' as const } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${this.formatCurrency(Math.abs(ctx.parsed.y ?? 0))}`
            }
          }
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: {
            stacked: true,
            ticks: { callback: (v) => this.formatCurrency(Math.abs(v as number)) }
          }
        }
      }
    });
  }

  private buildRealBreakdown(transactions: Transaction[]): void {
    const creditCardIds = new Set(this.cards().map(c => c.paymentMethodId));
    const methodMap = new Map(this.allPaymentMethods().map(m => [m.id, m.alias || m.bankName || `#${m.id}`]));

    const incomeByMethod: Record<number, number> = {};
    const expenseByMethod: Record<number, number> = {};

    transactions.forEach(t => {
      if (t.transactionType === 'INCOME') {
        incomeByMethod[t.paymentMethodId] = (incomeByMethod[t.paymentMethodId] || 0) + t.amount;
      } else if (t.transactionType === 'CREDIT_PAYMENT') {
        expenseByMethod[t.paymentMethodId] = (expenseByMethod[t.paymentMethodId] || 0) + t.amount;
      } else if (t.transactionType === 'EXPENSE' && !creditCardIds.has(t.paymentMethodId)) {
        expenseByMethod[t.paymentMethodId] = (expenseByMethod[t.paymentMethodId] || 0) + t.amount;
      }
    });

    const rows: { type: 'income' | 'expense'; methodName: string; total: number }[] = [];

    Object.entries(incomeByMethod)
      .sort(([, a], [, b]) => b - a)
      .forEach(([id, total]) => rows.push({ type: 'income', methodName: methodMap.get(+id) || `Método ${id}`, total }));

    Object.entries(expenseByMethod)
      .sort(([, a], [, b]) => b - a)
      .forEach(([id, total]) => rows.push({ type: 'expense', methodName: methodMap.get(+id) || `Método ${id}`, total }));

    this.realBreakdown.set(rows);
  }

  toggleRealBreakdown(): void {
    this.showRealBreakdown.set(!this.showRealBreakdown());
  }

  getBreakdownByType(type: 'income' | 'expense') {
    return this.realBreakdown().filter(r => r.type === type);
  }

  getBreakdownTotal(type: 'income' | 'expense'): number {
    return this.getBreakdownByType(type).reduce((s, r) => s + r.total, 0);
  }

  ngOnDestroy(): void {
    if (this.tarjetazosChart) this.tarjetazosChart.destroy();
    if (this.gastosRealesChart) this.gastosRealesChart.destroy();
  }
}
