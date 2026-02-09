import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-card.component.html',
  styleUrls: ['./summary-card.component.scss']
})
export class SummaryCardComponent {
  @Input() title = '';
  @Input() value = 0;
  @Input() icon = '';
  @Input() trend: 'up' | 'down' | 'neutral' = 'neutral';
  @Input() color: 'primary' | 'success' | 'danger' = 'primary';

  get formattedValue(): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(this.value);
  }
}
