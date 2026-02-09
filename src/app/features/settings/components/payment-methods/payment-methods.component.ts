import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Métodos de Pago</h1>
      <p>Módulo en desarrollo...</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 20px;
    }
  `]
})
export class PaymentMethodsComponent {}
