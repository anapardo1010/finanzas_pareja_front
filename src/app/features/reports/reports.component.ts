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
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, BarChart3, DollarSign, Calendar, CreditCard } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { CreditCardProportionalPayment } from '../../core/models';
import { FinanceReportService } from '../../core/services/finance-report.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
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
        readonly icons = { CreditCard, BarChart3, DollarSign, Calendar, Wallet: DollarSign };

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
    activeTab: 'cards' | 'msi' | 'debit' = 'cards';
  private readonly financeService = inject(FinanceReportService);
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
  set activeTabWithLoad(tab: 'cards' | 'msi' | 'debit') {
    this.activeTab = tab;
    if (tab === 'msi') this.loadMsi();
    if (tab === 'debit') {
      this.loadDebitBalances();
      // cargar usuarios después de obtener balances (pequeño retardo para asegurar datos)
      setTimeout(() => this.loadUsers(), 250);
    }
  }

  loadCards() {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;
    this.loading.set(true);
    this.financeService.getCreditCardProportionalPayments(tenantId).subscribe({
      next: (val) => {
        const items = val ?? [];
        this.cards.set(items.map(c => ({ ...c, selected: false })));
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

  formatCurrency = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
  formatDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  getStatusClass = (s: string) => s === 'PAID' ? 'paid' : s === 'OVERDUE' ? 'overdue' : 'pending';
}
