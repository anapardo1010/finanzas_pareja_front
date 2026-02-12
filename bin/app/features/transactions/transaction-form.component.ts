import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Category, PaymentMethod, User, Transaction } from '../../core/models';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.scss'
})
export class TransactionFormComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) type!: string;
  @Input() transaction!: Transaction | null;
  @Input() categories: Category[] = [];
  @Input() paymentMethods: PaymentMethod[] = [];
  @Input() users: User[] = [];
  @Input() submitting: boolean = false;

  @Output() submit = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  // Helpers para la UI del modal
  getTitle(): string {
    const titles: Record<string, string> = {
      'EXPENSE': 'Gasto',
      'INCOME': 'Ingreso',
      'CREDIT_PAYMENT': 'Pago de Tarjeta',
      'TRANSFER': 'Transferencia'
    };
    return titles[this.type] || 'Transacción';
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.submit.emit();
    }
  }

  onClose(): void {
    this.close.emit();
  }
}