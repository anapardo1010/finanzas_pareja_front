import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Transaction, TransactionRequest, Category, PaymentMethod, User } from '../../core/models';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule, Edit2 } from 'lucide-angular';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
    readonly Edit2 = Edit2;
  private readonly fb = inject(FormBuilder);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  transactions = signal<Transaction[]>([]);
  categories = signal<Category[]>([]);
  paymentMethods = signal<PaymentMethod[]>([]);
  users = signal<User[]>([]);
  loading = signal(false);
  showForm = signal(false);
  selectedTransaction = signal<Transaction | null>(null);

  // Filtros
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterUserId = signal<number | null>(null);
  filterPaymentMethodId = signal<number | null>(null);

  transactionForm!: FormGroup;

  // Transacciones filtradas
  filteredTransactions = computed(() => {
    let result = this.transactions();
    
    // Filtrar por userId si está seleccionado
    const userId = this.filterUserId();
    if (userId !== null) {
      result = result.filter(t => t.userId === userId);
    }
    
    // Filtrar por paymentMethodId si está seleccionado
    const paymentMethodId = this.filterPaymentMethodId();
    if (paymentMethodId !== null) {
      result = result.filter(t => t.paymentMethodId === paymentMethodId);
    }
    
    return result;
  });

  // Computed para filtrar transacciones
  expenses = computed(() => 
    this.filteredTransactions().filter(t => t.transactionType === 'EXPENSE')
  );
  
  incomes = computed(() => 
    this.filteredTransactions().filter(t => t.transactionType === 'INCOME')
  );

  totalExpenses = computed(() => 
    this.expenses().reduce((sum, t) => sum + t.amount, 0)
  );

  totalIncomes = computed(() => 
    this.incomes().reduce((sum, t) => sum + t.amount, 0)
  );

  balance = computed(() => 
    this.totalIncomes() - this.totalExpenses()
  );

  ngOnInit(): void {
    this.initForm();
    this.initFilters();
    this.loadData();
  }

  initFilters(): void {
    // Inicializar con últimos 3 meses
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    this.filterStartDate.set(startDate);
    this.filterEndDate.set(endDate);
  }

  initForm(): void {
    this.transactionForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3)]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      transactionType: ['EXPENSE', Validators.required],
      categoryId: [null, Validators.required],
      paymentMethodId: [null, Validators.required],
      isShared: [false],
      hasInstallments: [false],
      totalInstallments: [1]
    });
  }

  loadData(): void {
    const tenantId = this.authService.getTenantId();
    console.log('🔍 TenantId para transacciones:', tenantId);
    if (!tenantId) return;

    this.loading.set(true);

    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();
    
    console.log('📅 Rango de fechas:', { startDate, endDate });

    // Cargar transacciones, categorías, métodos de pago y usuarios en paralelo
    Promise.all([
      this.transactionService.getTransactionsByTenant(tenantId, { startDate, endDate }).toPromise(),
      this.categoryService.getByTenant(tenantId, 0, 100).toPromise(),
      this.paymentMethodService.getByTenant(tenantId, 0, 100).toPromise(),
      this.userService.getUsersByTenant(tenantId).toPromise()
    ]).then(([transactions, categoriesPage, paymentMethodsPage, users]) => {
      console.log('✅ Datos cargados:', { 
        transactions: transactions?.length, 
        categories: categoriesPage?.content?.length, 
        paymentMethods: paymentMethodsPage?.content?.length,
        users: users?.length
      });
      this.transactions.set(transactions || []);
      this.categories.set(categoriesPage?.content || []);
      this.paymentMethods.set(paymentMethodsPage?.content || []);
      this.users.set(users || []);
      console.log('📊 Categories signal:', this.categories());
      console.log('💳 Payment Methods signal:', this.paymentMethods());
      console.log('👥 Users signal:', this.users());
      this.loading.set(false);
    }).catch(err => {
      console.error('❌ Error cargando datos:', err);
      this.loading.set(false);
    });
  }

  openCreateForm(type: 'EXPENSE' | 'INCOME'): void {
    this.selectedTransaction.set(null);
    this.transactionForm.reset({
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      transactionType: type,
      categoryId: null,
      paymentMethodId: null,
      isShared: false,
      hasInstallments: false,
      totalInstallments: 1
    });
    this.showForm.set(true);
  }

  editTransaction(transaction: Transaction): void {
    this.selectedTransaction.set(transaction);
    this.transactionForm.patchValue({
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date.split('T')[0],
      transactionType: transaction.transactionType,
      categoryId: transaction.categoryId,
      paymentMethodId: transaction.paymentMethodId,
      isShared: transaction.isShared,
      hasInstallments: transaction.hasInstallments,
      totalInstallments: transaction.totalInstallments
    });
    this.showForm.set(true);
  }

  onSubmit(): void {
    if (this.transactionForm.invalid) return;

    const tenantId = this.authService.getTenantId();
    const userId = this.authService.currentUser()?.id;
    if (!tenantId || !userId) return;

    const formValue = this.transactionForm.value;
    const request: TransactionRequest = {
      tenantId,
      userId,
      ...formValue
    };

    const selected = this.selectedTransaction();
    const operation$ = selected
      ? this.transactionService.updateTransaction(selected.id, request)
      : this.transactionService.createTransaction(request);

    operation$.subscribe({
      next: () => {
        this.loadData();
        this.closeForm();
      },
      error: (err) => {
        console.error('Error guardando transacción:', err);
      }
    });
  }

  deleteTransaction(transaction: Transaction): void {
    if (!confirm(`¿Eliminar transacción "${transaction.description}"?`)) return;

    this.transactionService.deleteTransaction(transaction.id).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => {
        console.error('Error eliminando transacción:', err);
      }
    });
  }

  closeForm(): void {
    this.showForm.set(false);
    this.selectedTransaction.set(null);
  }

  getCategoryName(categoryId: number): string {
    return this.categories().find(c => c.id === categoryId)?.name || 'Sin categoría';
  }

  getPaymentMethodName(paymentMethodId: number): string {
    const pm = this.paymentMethods().find(pm => pm.id === paymentMethodId);
    if (!pm) return 'Sin método';
    return pm.alias ? `${pm.bankName} — ${pm.alias}` : pm.bankName;
  }

  applyDateFilter(): void {
    this.loadData();
  }

  clearFilters(): void {
    this.filterUserId.set(null);
    this.filterPaymentMethodId.set(null);
  }

  get availableUsers(): { id: number, name: string }[] {
    const uniqueUserIds = new Set<number>();
    this.transactions().forEach(t => uniqueUserIds.add(t.userId));
    
    return Array.from(uniqueUserIds)
      .map(userId => {
        const user = this.users().find(u => u.id === userId);
        return {
          id: userId,
          name: user?.name || `Usuario ${userId}`
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
