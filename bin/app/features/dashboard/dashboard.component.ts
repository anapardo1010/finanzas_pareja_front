import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FinanceReportService } from '../../core/services/finance-report.service';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { LucideAngularModule, TrendingUp, TrendingDown, Wallet, CreditCard, PieChart, AlertCircle, Plus, ArrowRight } from 'lucide-angular';
import { MonthlyBalance, Transaction, InstallmentMSI, Category } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly financeReportService = inject(FinanceReportService);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);

  // Lucide Icons
  readonly TrendingUp = TrendingUp;
  readonly TrendingDown = TrendingDown;
  readonly Wallet = Wallet;
  readonly CreditCard = CreditCard;
  readonly PieChart = PieChart;
  readonly AlertCircle = AlertCircle;
  readonly Plus = Plus;
  readonly ArrowRight = ArrowRight;

  loading = signal(false);
  userName = signal('Usuario');
  
  // Datos financieros
  transactions = signal<Transaction[]>([]);
  monthlyBalances = signal<MonthlyBalance[]>([]);
  upcomingInstallments = signal<InstallmentMSI[]>([]);
  categories = signal<Category[]>([]);
  
  // Fecha actual
  currentDate = computed(() => {
    const now = new Date();
    return now.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Mexico_City'
    });
  });

  // Resumen calculado desde transacciones
  summary = computed(() => {
    const txs = this.transactions();
    const totalIncome = txs.filter(t => t.transactionType === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = txs.filter(t => t.transactionType === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    return { totalIncome, totalExpense };
  });

  // Total cuotas MSI próximas
  totalUpcomingInstallments = computed(() => {
    return this.upcomingInstallments().reduce((sum, inst) => sum + inst.amount, 0);
  });

  // Top 3 categorías de gastos
  topExpenseCategories = computed(() => {
    const txs = this.transactions().filter(t => t.transactionType === 'EXPENSE');
    const cats = this.categories();
    const categoryMap = new Map<number, { name: string, totalAmount: number, percentage: number }>();
    
    txs.forEach(t => {
      const category = cats.find(c => c.id === t.categoryId);
      const catName = category?.name || 'Sin categoría';
      const current = categoryMap.get(t.categoryId) || { name: catName, totalAmount: 0, percentage: 0 };
      current.totalAmount += t.amount;
      categoryMap.set(t.categoryId, current);
    });

    const total = this.summary().totalExpense;
    const categories = Array.from(categoryMap.values())
      .map(cat => ({ ...cat, percentage: total > 0 ? (cat.totalAmount / total) * 100 : 0 }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 3);

    return categories;
  });

  // Balance vs mes anterior
  balanceComparison = computed(() => {
    const balances = this.monthlyBalances();
    if (balances.length < 2) return { current: 0, previous: 0, change: 0, percentChange: 0 };
    
    const current = balances[balances.length - 1]?.balance || 0;
    const previous = balances[balances.length - 2]?.balance || 0;
    const change = current - previous;
    const percentChange = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;
    
    return { current, previous, change, percentChange };
  });
  
  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.userName.set(user.name || 'Usuario');
    }
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    this.loading.set(true);

    // Rango de fechas: mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    // Mes anterior para comparación
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];

    Promise.all([
      // Transacciones del mes actual
      this.transactionService.getTransactionsByDateRange(tenantId, startOfMonth, endDate).toPromise(),
      // Balances mensuales para comparación (últimos 2 meses)
      this.financeReportService.getMonthlyBalance(tenantId, startOfPrevMonth, endDate).toPromise(),
      // Cuotas MSI próximas
      this.financeReportService.getUpcomingInstallments(tenantId).toPromise(),
      // Categorías
      this.categoryService.getByTenant(tenantId, 0, 100).toPromise()
    ]).then(([transactions, balances, installments, categoriesResponse]) => {
      this.transactions.set(transactions || []);
      this.monthlyBalances.set(balances || []);
      this.upcomingInstallments.set(installments || []);
      this.categories.set(categoriesResponse?.content || []);
      this.loading.set(false);
    }).catch(err => {
      console.error('❌ Error cargando dashboard:', err);
      this.loading.set(false);
    });
  }

  navigateToTransactions(): void {
    this.router.navigate(['/main/transactions']);
  }

  navigateToReports(): void {
    this.router.navigate(['/main/reports']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/main/settings']);
  }
}
