import { Component, OnInit, OnDestroy, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FinanceReportService } from '../../core/services/finance-report.service';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { UserService } from '../../core/services/user.service';
import {
  LucideAngularModule, TrendingUp, TrendingDown,
  CreditCard, PieChart, Plus, Tag, Calendar, Wallet
} from 'lucide-angular';
import { Transaction, InstallmentMSI, Category, PaymentMethodBalance, PaymentMethod } from '../../core/models';
import Chart from 'chart.js/auto';

// Interfaz local que refleja exactamente el JSON del backend
interface MonthlyBalanceItem {
  tenantId:                number;
  yearMonth:               string;
  totalIncome:             number;
  totalExpenses:           number;
  netBalance:              number;
  incomeTransactionCount:  number;
  expenseTransactionCount: number;
}

export type PeriodMonths = 3 | 6 | 12;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {

  private readonly authService          = inject(AuthService);
  private readonly financeReportService = inject(FinanceReportService);
  private readonly transactionService   = inject(TransactionService);
  private readonly categoryService      = inject(CategoryService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly userService           = inject(UserService);
  private readonly router               = inject(Router);

  readonly icons = { TrendingUp, TrendingDown, CreditCard, PieChart, Plus, Tag, Calendar, Wallet };

  readonly today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  readonly periodOptions: { label: string; value: PeriodMonths }[] = [
    { label: '3 meses', value: 3 },
    { label: '6 meses', value: 6 },
    { label: '1 año',   value: 12 },
  ];

  // ── Signals ────────────────────────────────────────────────────────────────
  loading               = signal(false);
  userName              = signal('Usuario');
  selectedPeriod        = signal<PeriodMonths>(6);
  transactions          = signal<Transaction[]>([]);
  monthlyBalances       = signal<MonthlyBalanceItem[]>([]);
  upcomingInstallments  = signal<InstallmentMSI[]>([]);
  categories            = signal<Category[]>([]);
  paymentMethodBalances = signal<PaymentMethodBalance[]>([]);
  allPaymentMethods     = signal<PaymentMethod[]>([]);
  creditCardIds         = signal<Set<number>>(new Set());

  private chartRef: Chart | null = null;

  // ── Computed ───────────────────────────────────────────────────────────────
  summary = computed(() => {
    const txs = this.transactions();
    const ccIds = this.creditCardIds();
    const income  = txs.filter(t => t.transactionType === 'INCOME').reduce((s, t) => s + t.amount, 0);
    // Gastos reales: EXPENSE de no-crédito + CREDIT_PAYMENT
    const realExpense = txs
      .filter(t => t.transactionType === 'CREDIT_PAYMENT' || (t.transactionType === 'EXPENSE' && !ccIds.has(t.paymentMethodId)))
      .reduce((s, t) => s + t.amount, 0);
    // Tarjetazos: todo EXPENSE sin importar método de pago
    const tarjetazos = txs.filter(t => t.transactionType === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { income, expense: realExpense, tarjetazos, net: income - realExpense };
  });

  topCategories = computed(() => {
    const txs   = this.transactions().filter(t => t.transactionType === 'EXPENSE');
    const total = this.summary().expense;
    if (total === 0) return [];

    const groups = txs.reduce((acc, t) => {
      const name = this.categories().find(c => c.id === t.categoryId)?.name ?? 'Otros';
      acc[name] = (acc[name] ?? 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(groups)
      .map(([name, amount]) => ({ name, amount, percentage: (amount / total) * 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  });

  comparison = computed(() => {
    const breakdown = this.monthlyBreakdown();
    const current  = breakdown[breakdown.length - 1]?.net ?? 0;
    const previous = breakdown[breakdown.length - 2]?.net ?? 0;
    const diff     = current - previous;
    const percent  = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 0;
    return { current, percent, isPositive: diff >= 0 };
  });

  /** Desglose mensual para la tabla de comparación */
  monthlyBreakdown = computed(() => {
    const balances = this.monthlyBalances();
    const txs = this.transactions();
    const ccIds = this.creditCardIds();

    return balances.map((b, i) => {
      // Calcular gastos reales y tarjetazos por mes
      const [year, month] = b.yearMonth.split('-').map(Number);
      const monthTxs = txs.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === year && (d.getMonth() + 1) === month;
      });

      const income = monthTxs.filter(t => t.transactionType === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const realExpense = monthTxs
        .filter(t => t.transactionType === 'CREDIT_PAYMENT' || (t.transactionType === 'EXPENSE' && !ccIds.has(t.paymentMethodId)))
        .reduce((s, t) => s + t.amount, 0);
      const tarjetazos = monthTxs.filter(t => t.transactionType === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      const net = income - realExpense;

      const prev = balances[i - 1];
      let prevNet = 0;
      if (prev) {
        const [py, pm] = prev.yearMonth.split('-').map(Number);
        const prevTxs = txs.filter(t => {
          const d = new Date(t.date);
          return d.getFullYear() === py && (d.getMonth() + 1) === pm;
        });
        const prevIncome = prevTxs.filter(t => t.transactionType === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const prevRealExp = prevTxs
          .filter(t => t.transactionType === 'CREDIT_PAYMENT' || (t.transactionType === 'EXPENSE' && !ccIds.has(t.paymentMethodId)))
          .reduce((s, t) => s + t.amount, 0);
        prevNet = prevIncome - prevRealExp;
      }

      const diffNet = prev ? net - prevNet : 0;
      const pctNet = prev && prevNet !== 0 ? (diffNet / Math.abs(prevNet)) * 100 : 0;

      return {
        yearMonth: b.yearMonth,
        income,
        expense: realExpense,
        tarjetazos,
        net,
        diffNet,
        pctNet,
        txCount: b.incomeTransactionCount + b.expenseTransactionCount,
      };
    });
  });

  /** Totales acumulados del periodo */
  periodTotals = computed(() => {
    const s = this.summary();
    return { totalIncome: s.income, totalExpenses: s.expense, tarjetazos: s.tarjetazos, net: s.net };
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Cargar nombre real del usuario
    const user = this.authService.currentUser();
    if (user?.id) {
      this.userService.getUserById(user.id).subscribe({
        next: u => this.userName.set(u.name ?? 'Usuario'),
        error: () => this.userName.set(user.name ?? 'Usuario'),
      });
    } else {
      this.userName.set(user?.name ?? 'Usuario');
    }
    this.loadData();
  }

  selectPeriod(months: PeriodMonths): void {
    this.selectedPeriod.set(months);
    this.loadData();
  }

  async loadData(): Promise<void> {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    this.loading.set(true);
    const now   = new Date();
    const months = this.selectedPeriod();
    const start = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const startDate = start.toISOString().split('T')[0];
    const today     = now.toISOString().split('T')[0];

    try {
      const [txs, balances, installments, cats, methodBalances, allMethods] = await Promise.all([
        this.transactionService.getTransactionsByDateRange(tenantId, startDate, today).toPromise(),
        this.financeReportService.getMonthlyBalances(tenantId, months, 'accrual').toPromise(),
        this.financeReportService.getUpcomingInstallments(tenantId).toPromise(),
        this.categoryService.getByTenant(tenantId, 0, 100).toPromise(),
        this.financeReportService.getBalanceByPaymentMethod(tenantId, now.getFullYear(), now.getMonth() + 1).toPromise(),
        this.paymentMethodService.getByTenant(tenantId, 0, 100).toPromise(),
      ]);

      this.transactions.set(txs ?? []);
      this.monthlyBalances.set((balances as unknown as MonthlyBalanceItem[]) ?? []);

      this.upcomingInstallments.set(installments ?? []);
      this.categories.set(cats?.content ?? []);
      this.paymentMethodBalances.set(methodBalances ?? []);
      this.allPaymentMethods.set(allMethods?.content ?? []);
      // Identificar IDs de tarjetas de crédito
      const ccIds = new Set((allMethods?.content ?? []).filter(m => m.accountType === 'CREDIT').map(m => m.id));
      this.creditCardIds.set(ccIds);

      setTimeout(() => this.renderBalanceChart(), 0);
    } catch (e) {
      console.error('Error cargando dashboard:', e);
    } finally {
      this.loading.set(false);
    }
  }

  renderBalanceChart(): void {
    const breakdown = this.monthlyBreakdown();
    if (!breakdown.length) return;

    const ctx = document.getElementById('balanceChart') as HTMLCanvasElement;
    if (!ctx) return;

    const labels = breakdown.map(b => b.yearMonth);
    const data   = breakdown.map(b => b.net);

    if (this.chartRef) this.chartRef.destroy();

    this.chartRef = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map(v => v >= 0 ? 'rgba(255,255,255,0.15)' : 'rgba(253,164,175,0.3)'),
          borderColor:     data.map(v => v >= 0 ? 'rgba(255,255,255,0.5)' : '#fda4af'),
          borderWidth: 1.5,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1c2030',
            borderColor: 'rgba(255,255,255,0.07)',
            borderWidth: 1,
            titleColor: '#64748b',
            bodyColor: '#f1f5f9',
            callbacks: {
              label: ctx => `$${(ctx.parsed.y ?? 0).toLocaleString('es-MX')}`
            }
          }
        },
        scales: {
          x: { display: false },
          y: { display: false, grid: { display: false } }
        }
      }
    });
  }

  navigateTo(path: string): void { this.router.navigate([path]); }

  ngOnDestroy(): void {
    if (this.chartRef) this.chartRef.destroy();
  }
}