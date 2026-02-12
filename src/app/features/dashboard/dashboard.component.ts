import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FinanceReportService } from '../../core/services/finance-report.service';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { 
  LucideAngularModule, TrendingUp, TrendingDown, Wallet, 
  CreditCard, PieChart, AlertCircle, Plus, ArrowRight, 
  Tag, CheckCircle2, Calendar
} from 'lucide-angular';
import { Transaction, MonthlyBalance, InstallmentMSI, Category, PaymentMethodBalance } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
    getUpcomingInstallmentsSum(): number {
      return this.upcomingInstallments().reduce((sum, i) => sum + i.amount, 0);
    }
  private readonly authService = inject(AuthService);
  private readonly financeReportService = inject(FinanceReportService);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);

  // Iconos
  readonly icons = { TrendingUp, TrendingDown, Wallet, CreditCard, PieChart, AlertCircle, Plus, ArrowRight, Tag, CheckCircle2, Calendar };

  // Signals de Datos
  loading = signal(false);
  userName = signal('Usuario');
  transactions = signal<Transaction[]>([]);
  monthlyBalances = signal<MonthlyBalance[]>([]);
  upcomingInstallments = signal<InstallmentMSI[]>([]);
  categories = signal<Category[]>([]);
  paymentMethodBalances = signal<PaymentMethodBalance[]>([]);

  // Computed: Onboarding Status
  onboardingSteps = computed(() => [
    { label: 'Tarjetas', icon: this.icons.CreditCard, done: this.paymentMethodBalances().length > 0, route: '/main/settings' },
    { label: 'Categorías', icon: this.icons.Tag, done: this.categories().length > 0, route: '/main/settings/categories' },
    { label: 'Primer Gasto', icon: this.icons.Plus, done: this.transactions().length > 0, route: '/main/transactions' },
    { label: 'Reportes', icon: this.icons.PieChart, done: this.transactions().length > 5, route: '/main/reports' }
  ]);

  showOnboarding = computed(() => !this.onboardingSteps().every(step => step.done));

  // Computed: Resumen Financiero
  summary = computed(() => {
    const txs = this.transactions();
    const income = txs.filter(t => t.transactionType === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.transactionType === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  });

  // Computed: Top Categorías con lógica de colores
  topCategories = computed(() => {
    const txs = this.transactions().filter(t => t.transactionType === 'EXPENSE');
    const total = this.summary().expense;
    if (total === 0) return [];

    const groups = txs.reduce((acc, t) => {
      const cat = this.categories().find(c => c.id === t.categoryId);
      const name = cat?.name || 'Otros';
      acc[name] = (acc[name] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(groups)
      .map(([name, amount]) => ({ name, amount, percentage: (amount / total) * 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  });

  // Computed: Comparativa Mes Anterior
  comparison = computed(() => {
    const balances = this.monthlyBalances();
    const current = balances[balances.length - 1]?.balance || 0;
    const previous = balances[balances.length - 2]?.balance || 0;
    const diff = current - previous;
    const percent = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 0;
    return { current, percent, isPositive: diff >= 0 };
  });

  ngOnInit(): void {
    this.userName.set(this.authService.currentUser()?.name || 'Usuario');
    this.loadData();
  }

  async loadData() {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    this.loading.set(true);
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    try {
      const [txs, balances, installments, cats, methodBalances] = await Promise.all([
        this.transactionService.getTransactionsByDateRange(tenantId, startMonth, today).toPromise(),
        this.financeReportService.getMonthlyBalance(tenantId, prevMonth, today, 'accrual').toPromise(),
        this.financeReportService.getUpcomingInstallments(tenantId).toPromise(),
        this.categoryService.getByTenant(tenantId, 0, 100).toPromise(),
        this.financeReportService.getBalanceByPaymentMethod(tenantId, now.getFullYear(), now.getMonth() + 1).toPromise()
      ]);

      this.transactions.set(txs || []);
      this.monthlyBalances.set(balances || []);
      this.upcomingInstallments.set(installments || []);
      this.categories.set(cats?.content || []);
      this.paymentMethodBalances.set(methodBalances || []);
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  navigateTo(path: string) { this.router.navigate([path]); }
}