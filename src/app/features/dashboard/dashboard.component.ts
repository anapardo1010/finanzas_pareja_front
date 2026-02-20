import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FinanceReportService } from '../../core/services/finance-report.service';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import {
  LucideAngularModule, TrendingUp, TrendingDown,
  CreditCard, PieChart, Plus, Tag, Calendar
} from 'lucide-angular';
import { Transaction, InstallmentMSI, Category, PaymentMethodBalance } from '../../core/models';
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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  private readonly authService          = inject(AuthService);
  private readonly financeReportService = inject(FinanceReportService);
  private readonly transactionService   = inject(TransactionService);
  private readonly categoryService      = inject(CategoryService);
  private readonly router               = inject(Router);

  readonly icons = { TrendingUp, TrendingDown, CreditCard, PieChart, Plus, Tag, Calendar };

  readonly today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  // ── Signals ────────────────────────────────────────────────────────────────
  loading               = signal(false);
  userName              = signal('Usuario');
  transactions          = signal<Transaction[]>([]);
  monthlyBalances       = signal<MonthlyBalanceItem[]>([]);
  upcomingInstallments  = signal<InstallmentMSI[]>([]);
  categories            = signal<Category[]>([]);
  paymentMethodBalances = signal<PaymentMethodBalance[]>([]);

  private chartRef: Chart | null = null;

  // ── Computed ───────────────────────────────────────────────────────────────
  summary = computed(() => {
    const txs     = this.transactions();
    const income  = txs.filter(t => t.transactionType === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.transactionType === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
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

  // Fix: usa netBalance (campo real del backend) en lugar de balance
  comparison = computed(() => {
    const balances = this.monthlyBalances();
    const current  = balances[balances.length - 1]?.netBalance ?? 0;
    const previous = balances[balances.length - 2]?.netBalance ?? 0;
    const diff     = current - previous;
    const percent  = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 0;
    return { current, percent, isPositive: diff >= 0 };
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.userName.set(this.authService.currentUser()?.name ?? 'Usuario');
    this.loadData();
  }

  async loadData(): Promise<void> {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    this.loading.set(true);
    const now        = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today      = now.toISOString().split('T')[0];

    try {
      const [txs, balances, installments, cats, methodBalances] = await Promise.all([
        this.transactionService.getTransactionsByDateRange(tenantId, startMonth, today).toPromise(),
        this.financeReportService.getMonthlyBalances(tenantId, 6, 'accrual').toPromise(),
        this.financeReportService.getUpcomingInstallments(tenantId).toPromise(),
        this.categoryService.getByTenant(tenantId, 0, 100).toPromise(),
        this.financeReportService.getBalanceByPaymentMethod(tenantId, now.getFullYear(), now.getMonth() + 1).toPromise(),
      ]);

      this.transactions.set(txs ?? []);
      this.monthlyBalances.set((balances as unknown as MonthlyBalanceItem[]) ?? []);

      this.upcomingInstallments.set(installments ?? []);
      this.categories.set(cats?.content ?? []);
      this.paymentMethodBalances.set(methodBalances ?? []);

      setTimeout(() => this.renderBalanceChart(), 0);
    } catch (e) {
      console.error('Error cargando dashboard:', e);
    } finally {
      this.loading.set(false);
    }
  }

  renderBalanceChart(): void {
    const balances = this.monthlyBalances();
    if (!balances.length) return;

    const ctx = document.getElementById('balanceChart') as HTMLCanvasElement;
    if (!ctx) return;

    // Fix: campos directos del backend, sin (b as any)
    const labels = balances.map(b => b.yearMonth);
    const data   = balances.map(b => b.netBalance);

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
}