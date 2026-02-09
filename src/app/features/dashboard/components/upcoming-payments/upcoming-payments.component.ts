import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstallmentSummary } from '../../../../core/models';

@Component({
  selector: 'app-upcoming-payments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-payments.component.html',
  styleUrls: ['./upcoming-payments.component.scss']
})
export class UpcomingPaymentsComponent {
  @Input() payments: InstallmentSummary[] = [];
  @Input() pendingCount = 0;

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short'
    }).format(date);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  getDaysUntil(dateString: string): number {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isOverdue(dateString: string): boolean {
    return this.getDaysUntil(dateString) < 0;
  }
}
