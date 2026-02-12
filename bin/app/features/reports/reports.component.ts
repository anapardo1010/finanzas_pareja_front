import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, BarChart3, DollarSign, Calendar, CreditCard } from 'lucide-angular';
import { CreditCardProportionalPayment } from '../../core/models';
import { FinanceReportService } from '../../core/services/finance-report.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private readonly financeService = inject(FinanceReportService);
  private readonly authService = inject(AuthService);

  readonly icons = { BarChart3, DollarSign, Calendar, CreditCard };

  cards = signal<CreditCardProportionalPayment[]>([]);
  loading = signal(false);

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

  ngOnInit() { this.loadCards(); }

  loadCards() {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;
    this.loading.set(true);
    this.financeService.getCreditCardProportionalPayments(tenantId).subscribe({
      next: (val) => {
        this.cards.set(val.map(c => ({ ...c, selected: false })));
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