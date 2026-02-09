import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { 
  MonthlyBalance, 
  ProportionalSettlement, 
  InstallmentMSI,
  Transaction,
  CreditCardBalance,
  CreditCardProportionalPayment
} from '../../core/models';
import { FinanceReportService } from '../../core/services/finance-report.service';
import { TransactionService } from '../../core/services/transaction.service';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule, BarChart3, DollarSign, Calendar, Users, CreditCard } from 'lucide-angular';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
    // Getter seguro para el balance del mes actual
    get currentMonthBalance() {
      const arr = this.monthlyBalance();
      return arr && arr.length > 0 ? arr[0] : { totalIncome: 0, totalExpenses: 0, balance: 0 };
    }
  private readonly fb = inject(FormBuilder);
  private readonly financeReportService = inject(FinanceReportService);
  private readonly transactionService = inject(TransactionService);
  private readonly authService = inject(AuthService);

  // Lucide Icons
  readonly BarChart3 = BarChart3;
  readonly DollarSign = DollarSign;
  readonly Calendar = Calendar;
  readonly Users = Users;
  readonly CreditCard = CreditCard;

  // Exponer Math para el template
  Math = Math;

  // Datos
  monthlyBalance = signal<MonthlyBalance[]>([]);
  settlement = signal<ProportionalSettlement | null>(null);
  upcomingInstallments = signal<InstallmentMSI[]>([]);
  overdueInstallments = signal<InstallmentMSI[]>([]);
  transactionsWithMSI = signal<Transaction[]>([]);
  sharedTransactions = signal<Transaction[]>([]);
  creditCardBalances = signal<CreditCardBalance[]>([]);
  cardProportionalPayments = signal<CreditCardProportionalPayment[]>([]);

  loading = signal(false);
  activeTab = signal<'balance' | 'settlement' | 'installments' | 'shared' | 'cards'>('balance');

  dateFilterForm!: FormGroup;

  // Computed
  totalUpcomingAmount = computed(() => 
    this.upcomingInstallments().reduce((sum, inst) => sum + inst.amount, 0)
  );

  totalOverdueAmount = computed(() => 
    this.overdueInstallments().reduce((sum, inst) => sum + inst.amount, 0)
  );

  // Computed para pagos proporcionales seleccionados
  selectedCards = computed(() => 
    this.cardProportionalPayments().filter(card => card.selected)
  );

  // Separar tarjetas por dueño
  myCards = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    return this.cardProportionalPayments().filter(card => card.userId === currentUserId);
  });

  partnerCards = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    return this.cardProportionalPayments().filter(card => card.userId !== currentUserId);
  });

  // Calcular cuánto me deben de MIS tarjetas seleccionadas
  amountOwedToMe = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    const mySelectedCards = this.selectedCards().filter(card => card.userId === currentUserId);
    
    let total = 0;
    mySelectedCards.forEach(card => {
      // Buscar cuánto debe la otra persona (no soy yo)
      const partnerShare = card.userShares.find(share => share.userId !== currentUserId);
      if (partnerShare) {
        total += partnerShare.amountToPay;
      }
    });
    
    return total;
  });

  // Calcular cuánto le debo de las tarjetas de MI PAREJA seleccionadas
  amountIOwe = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    const partnerSelectedCards = this.selectedCards().filter(card => card.userId !== currentUserId);
    
    let total = 0;
    partnerSelectedCards.forEach(card => {
      // Buscar cuánto debo yo
      const myShare = card.userShares.find(share => share.userId === currentUserId);
      if (myShare) {
        total += myShare.amountToPay;
      }
    });
    
    return total;
  });

  // Cálculo final: la diferencia neta
  finalSettlement = computed(() => {
    if (this.selectedCards().length === 0) return null;

    const currentUserId = this.authService.currentUser()?.id;
    const owedToMe = this.amountOwedToMe();
    const iOwe = this.amountIOwe();
    const netDifference = owedToMe - iOwe;

    // Obtener nombres de usuarios
    let myName = '';
    let partnerName = '';
    const firstCard = this.cardProportionalPayments()[0];
    if (firstCard) {
      const myShare = firstCard.userShares.find(s => s.userId === currentUserId);
      const partnerShare = firstCard.userShares.find(s => s.userId !== currentUserId);
      myName = myShare?.userName || 'Yo';
      partnerName = partnerShare?.userName || 'Pareja';
    }

    return {
      myName,
      partnerName,
      owedToMe,
      iOwe,
      netDifference: Math.abs(netDifference),
      whoOwes: netDifference > 0 ? partnerName : myName,
      whoReceives: netDifference > 0 ? myName : partnerName,
      message: netDifference === 0 
        ? 'Están a mano' 
        : netDifference > 0 
          ? `${partnerName} te debe` 
          : `Tú le debes a ${partnerName}`
    };
  });

  ngOnInit(): void {
    this.initForm();
    this.loadAllReports();
    this.loadCreditCardBalances();
    this.loadCardProportionalPayments();
  }

  initForm(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.dateFilterForm = this.fb.group({
      startDate: [firstDay.toISOString().split('T')[0], Validators.required],
      endDate: [lastDay.toISOString().split('T')[0], Validators.required]
    });
  }

  loadAllReports(): void {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    this.loading.set(true);
    const { startDate, endDate } = this.dateFilterForm.value;

    Promise.all([
      this.financeReportService.getMonthlyBalance(tenantId, startDate, endDate).toPromise(),
      this.financeReportService.getProportionalSettlement(tenantId, startDate, endDate).toPromise(),
      this.financeReportService.getUpcomingInstallments(tenantId).toPromise(),
      this.financeReportService.getOverdueInstallments(tenantId).toPromise(),
      this.transactionService.getTransactionsWithInstallments(tenantId).toPromise(),
      this.transactionService.getSharedTransactions(tenantId, startDate, endDate).toPromise()
    ]).then(([balance, settlement, upcoming, overdue, msi, shared]) => {
      console.log('📊 Balance recibido:', balance);
      console.log('💰 Settlement recibido:', settlement);
      
      // Transformar balance: el backend devuelve un objeto, convertirlo a array
      const balanceData: any = balance;
      const balanceArray = balanceData ? [{
        month: balanceData.yearMonth || 'Actual',
        totalIncome: balanceData.totalIncome || 0,
        totalExpenses: balanceData.totalExpenses || 0,
        balance: balanceData.netBalance || 0,
        user1Contribution: 0,
        user2Contribution: 0
      }] : [];
      
      // Transformar settlement: el backend devuelve array de usuarios, convertir a objeto único
      let settlementObj = null;
      if (Array.isArray(settlement) && settlement.length === 2) {
        const user1: any = settlement[0];
        const user2: any = settlement[1];
        const totalShared = (user1.actualExpense || 0) + (user2.actualExpense || 0);
        
        settlementObj = {
          user1Id: user1.userId,
          user1Name: user1.userName,
          user1Contribution: totalShared > 0 ? Math.round((user1.expectedExpense / totalShared) * 100) : 50,
          user1TotalPaid: user1.actualExpense || 0,
          user1ShouldPay: user1.expectedExpense || 0,
          user1Balance: user1.difference || 0,
          user2Id: user2.userId,
          user2Name: user2.userName,
          user2Contribution: totalShared > 0 ? Math.round((user2.expectedExpense / totalShared) * 100) : 50,
          user2TotalPaid: user2.actualExpense || 0,
          user2ShouldPay: user2.expectedExpense || 0,
          user2Balance: user2.difference || 0,
          totalSharedExpenses: totalShared,
          settlementAmount: Math.abs(user1.difference || 0),
          whoOwes: (user1.difference || 0) < 0 ? user1.userName : user2.userName,
          whoReceives: (user1.difference || 0) > 0 ? user1.userName : user2.userName
        };
        console.log('💰 Settlement transformado:', settlementObj);
      }
      
      this.monthlyBalance.set(balanceArray);
      this.settlement.set(settlementObj);
      this.upcomingInstallments.set(Array.isArray(upcoming) ? upcoming : []);
      this.overdueInstallments.set(Array.isArray(overdue) ? overdue : []);
      this.transactionsWithMSI.set(Array.isArray(msi) ? msi : []);
      this.sharedTransactions.set(Array.isArray(shared) ? shared : []);
      this.loading.set(false);
    }).catch(err => {
      console.error('❌ Error cargando reportes:', err);
      this.loading.set(false);
    });
  }

  onFilterSubmit(): void {
    this.loadAllReports();
  }

  loadCreditCardBalances(): void {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    console.log('🔄 Cargando saldos de tarjetas para tenant:', tenantId);
    this.financeReportService.getCreditCardBalances(tenantId).subscribe({
      next: (balances) => {
        console.log('💳 Card Balances recibido:', balances);
        console.log('💳 Card Balances length:', balances?.length);
        
        // Log detallado de cada tarjeta
        balances?.forEach((card, index) => {
          console.log(`\n📊 Tarjeta ${index + 1}: ${card.bankName}`);
          console.log(`   Corte: día ${card.cutDay}, Pago: día ${card.paymentDay}`);
          console.log(`   Periodo actual: ${card.currentCutDate} al próximo corte`);
          console.log(`   Fecha de pago: ${card.currentPaymentDate}`);
          console.log(`   Saldo actual: $${card.currentBalance}`);
          console.log(`   Cuotas MSI: $${card.pendingInstallments}`);
          console.log(`   TOTAL A PAGAR: $${card.totalDue}`);
          console.log(`   Status: ${card.status}`);
          console.log(`   Días hasta corte: ${card.daysUntilCut}`);
          console.log(`   Días hasta pago: ${card.daysUntilPayment}\n`);
        });
        
        this.creditCardBalances.set(Array.isArray(balances) ? balances : []);
      },
      error: (err) => {
        console.error('❌ Error cargando saldos de tarjetas:', err);
        this.creditCardBalances.set([]);
      }
    });
  }

  loadCardProportionalPayments(): void {
    const tenantId = this.authService.getTenantId();
    
    console.log('🔄 Iniciando carga de pagos proporcionales...');
    console.log('   TenantId:', tenantId);
    
    if (!tenantId) {
      console.error('❌ No se encontró el tenantId');
      return;
    }

    this.financeReportService.getCreditCardProportionalPayments(tenantId).subscribe({
      next: (payments) => {
        console.log('✅ Pagos proporcionales recibidos:', payments);
        console.log('   Cantidad de tarjetas:', payments?.length);
        
        // Log detallado de cada tarjeta
        payments?.forEach((card, index) => {
          console.log(`\n💳 Tarjeta ${index + 1}: ${card.bankName}`);
          console.log(`   Periodo: ${card.periodId}`);
          console.log(`   Corte: ${card.cutDate}`);
          console.log(`   Pago: ${card.paymentDate}`);
          console.log(`   Total: $${card.totalDue}`);
          console.log(`   Status: ${card.paymentStatus}`);
          console.log(`   Usuarios:`, card.userShares);
        });
        
        // Agregar propiedad selected = false por defecto
        const paymentsWithSelection = payments.map(p => ({ ...p, selected: false }));
        this.cardProportionalPayments.set(paymentsWithSelection);
        
        console.log('✅ Signal actualizado. Total tarjetas:', this.cardProportionalPayments().length);
      },
      error: (err) => {
        console.error('❌ Error cargando pagos proporcionales:', err);
        console.error('   Detalle del error:', err.message);
        console.error('   Status:', err.status);
        this.cardProportionalPayments.set([]);
      }
    });
  }

  setActiveTab(tab: 'balance' | 'settlement' | 'installments' | 'shared' | 'cards'): void {
    this.activeTab.set(tab);
  }

  formatCurrency(amount: number | undefined | null): string {
    const value = amount ?? 0;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Mexico_City'
    });
  }

  markCardAsPaid(card: CreditCardBalance): void {
    if (!card.periodId) {
      console.error('❌ No hay periodId para marcar como pagado');
      return;
    }

    if (confirm(`¿Marcar como pagado el periodo de ${card.bankName}?`)) {
      this.financeReportService.markCardBalanceAsPaid(card.paymentMethodId, card.periodId).subscribe({
        next: () => {
          console.log('✅ Tarjeta marcada como pagada');
          this.loadCreditCardBalances(); // Recargar
        },
        error: (err) => {
          console.error('❌ Error marcando como pagado:', err);
        }
      });
    }
  }

  toggleCardSelection(card: CreditCardProportionalPayment): void {
    card.selected = !card.selected;
    // Forzar actualización del signal
    this.cardProportionalPayments.set([...this.cardProportionalPayments()]);
  }

  markProportionalCardAsPaid(card: CreditCardProportionalPayment): void {
    if (!card.periodId) {
      console.error('❌ No hay periodId para marcar como pagado');
      return;
    }

    const cardName = this.getCardDisplayName(card);
    if (confirm(`¿Marcar como pagado el periodo de ${cardName}?`)) {
      this.financeReportService.markCardBalanceAsPaid(card.paymentMethodId, card.periodId).subscribe({
        next: () => {
          console.log('✅ Tarjeta marcada como pagada');
          this.loadCardProportionalPayments(); // Recargar con el siguiente periodo
        },
        error: (err) => {
          console.error('❌ Error marcando como pagado:', err);
        }
      });
    }
  }

  getProportionalCardStatus(card: CreditCardProportionalPayment): string {
    if (card.paymentStatus === 'PAID') return 'paid';
    if (card.paymentStatus === 'OVERDUE') return 'overdue';
    if (card.paymentStatus === 'PENDING') return 'pending';
    return 'pending-cut';
  }

  getProportionalCardStatusLabel(card: CreditCardProportionalPayment): string {
    if (card.paymentStatus === 'PAID') return '✓ Pagado';
    if (card.paymentStatus === 'OVERDUE') return '⚠️ Vencido';
    if (card.paymentStatus === 'PENDING') return '⏰ Pendiente';
    return '📅 Por Cortar';
  }

  getCardStatusColor(card: CreditCardBalance): string {
    if (card.isPaid) return 'paid';
    if (card.paymentStatus === 'OVERDUE') return 'overdue';
    if (card.paymentStatus === 'PENDING') return 'pending';
    return 'pending-cut';
  }

  getCardStatusLabel(card: CreditCardBalance): string {
    if (card.isPaid) return '✅ Pagado';
    if (card.paymentStatus === 'OVERDUE') return '🔴 VENCIDO';
    if (card.paymentStatus === 'PENDING') return '🟡 Pendiente de pago';
    return '⏳ Pendiente de corte';
  }

  getDaysUntilText(dateStr: string, daysFromBackend: number): string {
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Hace ${Math.abs(diffDays)} días`;
    } else if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Mañana';
    } else {
      return `En ${diffDays} días`;
    }
  }

  isDatePast(dateStr: string): boolean {
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate < today;
  }

  getInstallmentProgress(current: number, total: number): number {
    return (current / total) * 100;
  }

  /**
   * Formatea el nombre de una tarjeta incluyendo el alias si existe
   * Ejemplos:
   * - Con alias: "BBVA — Visa personal"
   * - Sin alias y con accountType: "BBVA — Débito"
   * - Solo banco: "BBVA"
   */
  getCardDisplayName(card: CreditCardProportionalPayment | CreditCardBalance): string {
    if (card.alias) {
      return `${card.bankName} — ${card.alias}`;
    }
    
    // Si no hay alias, mostrar solo el banco
    return card.bankName;
  }

  /**
   * Formatea el nombre corto de una tarjeta para usar en listas o filtros
   * Muestra solo el alias si existe, o el banco si no
   */
  getCardShortName(card: CreditCardProportionalPayment | CreditCardBalance): string {
    return card.alias || card.bankName;
  }

  /**
   * Formatea el nombre de método de pago para cuotas MSI
   * Si hay alias, muestra "BBVA — Visa personal", si no, solo el nombre del banco
   */
  getInstallmentPaymentMethodName(installment: InstallmentMSI): string {
    if (installment.alias) {
      return `${installment.paymentMethodName} — ${installment.alias}`;
    }
    return installment.paymentMethodName;
  }
}
