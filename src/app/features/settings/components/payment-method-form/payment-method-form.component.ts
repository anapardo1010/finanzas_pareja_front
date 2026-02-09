import { Component, EventEmitter, Input, OnInit, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentMethod, PaymentMethodRequest } from '../../../../core/models';
import { PaymentMethodService } from '../../../../core/services/payment-method.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * PaymentMethodFormComponent - Modal para crear/editar métodos de pago
 */
@Component({
  selector: 'app-payment-method-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-method-form.component.html',
  styleUrl: './payment-method-form.component.scss'
})
export class PaymentMethodFormComponent implements OnInit {
  // Field initializers - lugar válido para inject()
  private readonly fb = inject(FormBuilder);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly authService = inject(AuthService);

  @Input() paymentMethod: PaymentMethod | null = null;
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;
  submitting = signal(false);
  error = signal<string | null>(null);

  // Opciones de bancos comunes en México
  readonly banks = [
    'BBVA',
    'Santander',
    'HSBC',
    'Banamex',
    'Banorte',
    'ScotiaBank',
    'Inbursa',
    'Azteca',
    'BanBajio',
    'BanRegio',
    'Otro'
  ];

  // Tipos de cuenta
  readonly accountTypes = [
    { value: 'CREDIT', label: 'Crédito' },
    { value: 'DEBIT', label: 'Débito' },
    { value: 'DIGITAL', label: 'Tarjeta Digital' },
    { value: 'CASH', label: 'Efectivo' }
  ];

  ngOnInit(): void {
    this.initForm();
    this.setupAccountTypeListener();
  }

  /**
   * Inicializar formulario
   */
  private initForm(): void {
    const isCreditCard = !this.paymentMethod || this.paymentMethod.accountType === 'CREDIT';
    
    this.form = this.fb.group({
      bankName: [this.paymentMethod?.bankName || '', [Validators.required]],
      accountType: [this.paymentMethod?.accountType || 'CREDIT', [Validators.required]],
      cutDay: [
        { value: this.paymentMethod?.cutDay || 1, disabled: !isCreditCard },
        isCreditCard ? [Validators.required, Validators.min(1), Validators.max(31)] : []
      ],
      paymentDay: [
        { value: this.paymentMethod?.paymentDay || 1, disabled: !isCreditCard },
        isCreditCard ? [Validators.required, Validators.min(1), Validators.max(31)] : []
      ],
      alias: [this.paymentMethod?.alias || '', [Validators.maxLength(50)]]
    });
  }

  /**
   * Escuchar cambios en el tipo de cuenta
   */
  private setupAccountTypeListener(): void {
    this.form.get('accountType')?.valueChanges.subscribe((accountType: string) => {
      const cutDayControl = this.form.get('cutDay');
      const paymentDayControl = this.form.get('paymentDay');

      if (accountType === 'CREDIT') {
        // Habilitar y hacer requeridos para tarjetas de crédito
        cutDayControl?.enable();
        paymentDayControl?.enable();
        cutDayControl?.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
        paymentDayControl?.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
      } else {
        // Deshabilitar y remover validadores para otros tipos
        cutDayControl?.disable();
        paymentDayControl?.disable();
        cutDayControl?.clearValidators();
        paymentDayControl?.clearValidators();
        cutDayControl?.setValue(null);
        paymentDayControl?.setValue(null);
      }

      cutDayControl?.updateValueAndValidity();
      paymentDayControl?.updateValueAndValidity();
    });
  }

  /**
   * Verificar si es tarjeta de crédito
   */
  get isCreditCard(): boolean {
    return this.form.get('accountType')?.value === 'CREDIT';
  }

  /**
   * Determinar si es edición o creación
   */
  get isEditing(): boolean {
    return this.paymentMethod !== null;
  }

  /**
   * Guardar método de pago
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const user = this.authService.currentUser();
    const userId = user?.id;
    if (!userId) {
      this.error.set('No se pudo obtener el ID del usuario');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const accountType = this.form.value.accountType;
    const isCreditCard = accountType === 'CREDIT';

    const request: PaymentMethodRequest = {
      userId,
      bankName: this.form.value.bankName,
      accountType: accountType,
      cutDay: isCreditCard ? parseInt(this.form.get('cutDay')?.value) : 1,
      paymentDay: isCreditCard ? parseInt(this.form.get('paymentDay')?.value) : 1,
      alias: this.form.value.alias || undefined
    };

    const operation = this.isEditing
      ? this.paymentMethodService.updatePaymentMethod(this.paymentMethod!.id, request)
      : this.paymentMethodService.createPaymentMethod(request);

    operation.subscribe({
      next: () => {
        this.submitting.set(false);
        this.save.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.message || 'Error al guardar el método de pago');
      }
    });
  }

  /**
   * Cancelar operación
   */
  onCancel(): void {
    this.cancel.emit();
  }

  /**
   * Verificar si un campo tiene errores
   */
  hasError(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Obtener mensaje de error para un campo
   */
  getErrorMessage(field: string): string {
    const control = this.form.get(field);
    if (!control) return '';

    if (control.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (control.hasError('min')) {
      const min = control.errors?.['min'].min;
      return `Valor mínimo: ${min}`;
    }
    if (control.hasError('max')) {
      const max = control.errors?.['max'].max;
      return `Valor máximo: ${max}`;
    }
    if (control.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }
    return '';
  }
}
