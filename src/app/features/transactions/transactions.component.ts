import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Transaction, TransactionRequest, Category, PaymentMethod, User } from '../../core/models';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { 
  LucideAngularModule, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  CreditCard, 
  ArrowLeftRight, 
  Filter, 
  Plus, 
  X, 
  Tag, 
  MoreVertical,
  Calendar,
  AlertCircle
} from 'lucide-angular';
import { TransactionFormComponent } from './transaction-form.component';

type TransactionTypeExtended = 'EXPENSE' | 'INCOME' | 'CREDIT_PAYMENT' | 'TRANSFER';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, TransactionFormComponent],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  // Iconos profesionales (adiós emojis)
  readonly icons = { 
    Plus, X, ArrowUpCircle, ArrowDownCircle, CreditCard, 
    ArrowLeftRight, Filter, Tag, MoreVertical, Calendar, AlertCircle 
  };

  private readonly fb = inject(FormBuilder);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  // Signals de estado
  transactions = signal<Transaction[]>([]);
  categories = signal<Category[]>([]);
  paymentMethods = signal<PaymentMethod[]>([]);
  users = signal<User[]>([]);
  loading = signal(false);
  showForm = signal(false);
  selectedTransaction = signal<Transaction | null>(null);
  selectedTransactionType = signal<TransactionTypeExtended>('EXPENSE');
  submitting = signal(false);

  // Filtros
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterUserId = signal<number | null>(null);
  filterPaymentMethodId = signal<number | null>(null);

  transactionForm!: FormGroup;

  // Lógica de Negocio: Métodos de pago según tipo
  availablePaymentMethods = computed(() => {
    const type = this.selectedTransactionType();
    const methods = this.paymentMethods();
    if (type === 'TRANSFER') {
      return methods.filter(pm => pm.accountType !== 'CREDIT');
    }
    return methods;
  });

  availableDestinationMethods = computed(() => {
    const selectedOriginId = this.transactionForm?.get('paymentMethodId')?.value;
    if (!selectedOriginId) return this.paymentMethods();
    return this.paymentMethods().filter(pm => pm.id !== selectedOriginId);
  });

  // Filtrado reactivo en el cliente
  filteredTransactions = computed(() => {
    let result = this.transactions();
    const userId = this.filterUserId();
    if (userId !== null) result = result.filter(t => t.userId === userId);
    const paymentMethodId = this.filterPaymentMethodId();
    if (paymentMethodId !== null) result = result.filter(t => t.paymentMethodId === paymentMethodId);
    // Ordenar por fecha descendente para mostrar los registros más recientes arriba
    return result.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  // Totales computados
  expenses = computed(() => this.filteredTransactions().filter(t => t.transactionType === 'EXPENSE'));
  incomes = computed(() => this.filteredTransactions().filter(t => t.transactionType === 'INCOME'));
  totalExpenses = computed(() => this.expenses().reduce((sum, t) => sum + t.amount, 0));
  totalIncomes = computed(() => this.incomes().reduce((sum, t) => sum + t.amount, 0));
  balance = computed(() => this.totalIncomes() - this.totalExpenses());

  constructor() {
    // Reaccionar al cambio de tipo para ajustar validaciones
    effect(() => {
      const type = this.selectedTransactionType();
      if (this.transactionForm) {
        this.updateFormForTransactionType(type);
      }
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.initFilters();
    this.loadData();
  }

  initFilters(): void {
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
      categoryId: [null],
      paymentMethodId: [null, Validators.required],
      destinationPaymentMethodId: [null],
      isShared: [false],
      hasInstallments: [false],
      totalInstallments: [1]
    });
  }

  updateFormForTransactionType(type: TransactionTypeExtended): void {
    const categoryControl = this.transactionForm.get('categoryId');
    const destinationControl = this.transactionForm.get('destinationPaymentMethodId');
    const installmentsControl = this.transactionForm.get('hasInstallments');
    const totalInstallmentsControl = this.transactionForm.get('totalInstallments');
    
    destinationControl?.setValue(null);
    
    switch (type) {
      case 'EXPENSE':
      case 'INCOME':
        categoryControl?.setValidators([Validators.required]);
        categoryControl?.enable();
        destinationControl?.clearValidators();
        destinationControl?.disable();
        installmentsControl?.enable();
        totalInstallmentsControl?.enable();
        break;
        
      case 'CREDIT_PAYMENT':
        categoryControl?.clearValidators();
        categoryControl?.disable();
        destinationControl?.clearValidators();
        destinationControl?.disable();
        installmentsControl?.setValue(false);
        installmentsControl?.disable();
        totalInstallmentsControl?.setValue(1);
        totalInstallmentsControl?.disable();
        break;
        
      case 'TRANSFER':
        categoryControl?.clearValidators();
        categoryControl?.disable();
        destinationControl?.setValidators([Validators.required]);
        destinationControl?.enable();
        installmentsControl?.setValue(false);
        installmentsControl?.disable();
        totalInstallmentsControl?.setValue(1);
        totalInstallmentsControl?.disable();
        break;
    }
    categoryControl?.updateValueAndValidity();
    destinationControl?.updateValueAndValidity();
  }

  loadData(): void {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    this.loading.set(true);
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();

    Promise.all([
      this.transactionService.getTransactionsByTenant(tenantId, { startDate, endDate }).toPromise(),
      this.categoryService.getByTenant(tenantId, 0, 100).toPromise(),
      this.paymentMethodService.getByTenant(tenantId, 0, 100).toPromise(),
      this.userService.getUsersByTenant(tenantId).toPromise()
    ]).then(([transactions, categoriesPage, paymentMethodsPage, users]) => {
      this.transactions.set(transactions || []);
      this.categories.set(categoriesPage?.content || []);
      this.paymentMethods.set(paymentMethodsPage?.content || []);
      this.users.set(users || []);
      this.loading.set(false);
    }).catch(err => {
      console.error('Error cargando datos:', err);
      this.loading.set(false);
    });
  }

  applyDateFilter(): void {
    this.loadData();
  }

  openCreateForm(type: TransactionTypeExtended): void {
    this.selectedTransaction.set(null);
    this.selectedTransactionType.set(type);
    this.transactionForm.reset({
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      transactionType: type,
      categoryId: null,
      paymentMethodId: null,
      destinationPaymentMethodId: null,
      isShared: false,
      hasInstallments: false,
      totalInstallments: 1
    });
    this.updateFormForTransactionType(type);
    this.showForm.set(true);
  }

  editTransaction(transaction: Transaction): void {
    this.selectedTransaction.set(transaction);
    const type = transaction.transactionType as TransactionTypeExtended;
    this.selectedTransactionType.set(type);
    this.transactionForm.patchValue({
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date.split('T')[0],
      transactionType: transaction.transactionType,
      categoryId: transaction.categoryId,
      paymentMethodId: transaction.paymentMethodId,
      destinationPaymentMethodId: transaction.destinationPaymentMethodId,
      isShared: transaction.isShared,
      hasInstallments: transaction.hasInstallments,
      totalInstallments: transaction.totalInstallments
    });
    this.updateFormForTransactionType(type);
    this.showForm.set(true);
  }

  onSubmit(): void {
    if (this.transactionForm.invalid || this.submitting()) return;
    this.submitting.set(true);
    const tenantId = this.authService.getTenantId();
    const userId = this.authService.currentUser()?.id;
    if (!tenantId || !userId) {
      this.submitting.set(false);
      return;
    }

    const formValue = this.transactionForm.value;
    const request: TransactionRequest = {
      tenantId,
      userId,
      description: formValue.description,
      amount: formValue.amount,
      date: formValue.date,
      transactionType: formValue.transactionType,
      paymentMethodId: formValue.paymentMethodId,
      isShared: formValue.isShared,
      hasInstallments: formValue.hasInstallments,
      totalInstallments: formValue.totalInstallments,
      categoryId: (formValue.transactionType === 'EXPENSE' || formValue.transactionType === 'INCOME') ? formValue.categoryId : undefined,
      destinationPaymentMethodId: formValue.transactionType === 'TRANSFER' ? formValue.destinationPaymentMethodId : undefined
    };

    const selected = this.selectedTransaction();
    const operation$ = selected
      ? this.transactionService.updateTransaction(selected.id, request)
      : this.transactionService.createTransaction(request);

    operation$.subscribe({
      next: () => {
        this.loadData();
        this.closeForm();
        this.submitting.set(false);
      },
      error: (err) => {
        alert('Error: ' + (err.error?.message || 'No se pudo guardar'));
        this.submitting.set(false);
      }
    });
  }

  deleteTransaction(transaction: Transaction): void {
    if (!confirm(`¿Eliminar transacción "${transaction.description}"?`)) return;
    this.transactionService.deleteTransaction(transaction.id).subscribe(() => this.loadData());
  }

  closeForm(): void {
    this.showForm.set(false);
    this.selectedTransaction.set(null);
  }

  // Helpers para la plantilla
  getCategoryName(id: number | null | undefined) {
    return this.categories().find(c => c.id === id)?.name || 'Sin categoría';
  }

  getPaymentMethodName(id: number) {
    const pm = this.paymentMethods().find(pm => pm.id === id);
    return pm ? (pm.alias ? `${pm.bankName} — ${pm.alias}` : pm.bankName) : 'Sin método';
  }

  getTypeConfig(type: string) {
    const configs: any = {
      'EXPENSE': { icon: this.icons.ArrowDownCircle, class: 'type-expense', label: 'Gasto' },
      'INCOME': { icon: this.icons.ArrowUpCircle, class: 'type-income', label: 'Ingreso' },
      'CREDIT_PAYMENT': { icon: this.icons.CreditCard, class: 'type-credit', label: 'Pago TC' },
      'TRANSFER': { icon: this.icons.ArrowLeftRight, class: 'type-transfer', label: 'Transferencia' }
    };
    return configs[type] || configs['EXPENSE'];
  }

  getTransactionTypeColor(type: string): string {
    switch (type) {
      case 'INCOME': return 'income';
      case 'EXPENSE': return 'expense';
      case 'CREDIT_PAYMENT': return 'credit';
      case 'TRANSFER': return 'transfer';
      default: return '';
    }
  }

  onUserFilterChange(event: any) {
    const val = event.target.value;
    this.filterUserId.set(val === 'null' ? null : +val);
  }

  get availableUsers() {
    const uniqueIds = new Set(this.transactions().map(t => t.userId));
    return Array.from(uniqueIds).map(id => ({
      id,
      name: this.users().find(u => u.id === id)?.name || `ID: ${id}`
    })).sort((a,b) => a.name.localeCompare(b.name));
  }
}