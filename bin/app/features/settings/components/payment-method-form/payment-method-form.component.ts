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


  /** Lista de bancos/tarjetas, recibida del padre */
  @Input() banks: { name: string; value: string; color: string }[] = [];

  // Tipos de cuenta
  readonly accountTypes = [
    { value: 'CASH', label: 'Efectivo' },
    { value: 'DEBIT', label: 'Débito' },
    { value: 'CREDIT', label: 'Crédito' }
  ];

  // Lista de bancos, fintechs y apps (con colores)
  readonly defaultBanks = [
    { name: 'BBVA México', value: 'BBVA', color: 'rgb(0,68,129)' },
    { name: 'Banorte', value: 'Banorte', color: 'rgb(235,0,45)' },
    { name: 'Santander', value: 'Santander', color: 'rgb(236,0,0)' },
    { name: 'Citibanamex', value: 'Citibanamex', color: 'rgb(0,45,114)' },
    { name: 'HSBC', value: 'HSBC', color: 'rgb(219,0,11)' },
    { name: 'Scotiabank', value: 'Scotiabank', color: 'rgb(237,7,18)' },
    { name: 'Banco Azteca', value: 'Banco Azteca', color: 'rgb(0,106,77)' },
    { name: 'Banregio', value: 'Banregio', color: 'rgb(255,102,0)' },
    // Fintechs
    { name: 'Nu México', value: 'Nu', color: 'rgb(130,10,209)' },
    { name: 'Stori', value: 'Stori', color: 'rgb(200,255,0)' },
    { name: 'RappiCard', value: 'RappiCard', color: 'rgb(255,80,75)' },
    { name: 'Mercado Pago', value: 'Mercado Pago', color: 'rgb(0,158,227)' },
    { name: 'Ualá', value: 'Ualá', color: 'rgb(0,122,255)' },
    { name: 'Vexi', value: 'Vexi', color: 'rgb(0,199,179)' },
    { name: 'Fondeadora', value: 'Fondeadora', color: 'rgb(0,0,0)' },
    // Apps de servicios
    { name: 'Uber Pro Card', value: 'Uber', color: 'rgb(0,0,0)' },
    { name: 'Didi Card', value: 'Didi', color: 'rgb(255,122,0)' },
    { name: 'Spin by OXXO', value: 'Spin', color: 'rgb(110,35,130)' },
    { name: 'Klar', value: 'Klar', color: 'rgb(16,24,32)' }
  ];

  get banksList() {
    return this.banks.length > 0 ? this.banks : this.defaultBanks;
  }

  ngOnInit(): void {
    this.initForm();
    this.setupAccountTypeListener();
  }

  /**
   * Inicializar formulario
   */
  private initForm(): void {
    const type = this.paymentMethod?.accountType || 'CASH';
    this.form = this.fb.group({
      accountType: [type, [Validators.required]],
      alias: [this.paymentMethod?.alias || '', [Validators.maxLength(50)]],
      bankName: [this.paymentMethod?.bankName || '', type === 'DEBIT' || type === 'CREDIT' ? [Validators.required] : []],
      cutDay: [
        { value: this.paymentMethod?.cutDay || 1, disabled: type !== 'CREDIT' },
        type === 'CREDIT' ? [Validators.required, Validators.min(1), Validators.max(31)] : []
      ],
      paymentDay: [
        { value: this.paymentMethod?.paymentDay || 1, disabled: type !== 'CREDIT' },
        type === 'CREDIT' ? [Validators.required, Validators.min(1), Validators.max(31)] : []
      ]
    });
  }

  /**
   * Escuchar cambios en el tipo de cuenta
   */
  private setupAccountTypeListener(): void {
    this.form.get('accountType')?.valueChanges.subscribe((accountType: string) => {
      const bankNameControl = this.form.get('bankName');
      const cutDayControl = this.form.get('cutDay');
      const paymentDayControl = this.form.get('paymentDay');

      // Alias siempre habilitado
      // Banco solo para débito o crédito
      if (accountType === 'DEBIT' || accountType === 'CREDIT') {
        bankNameControl?.setValidators([Validators.required]);
        bankNameControl?.enable();
      } else {
        bankNameControl?.clearValidators();
        bankNameControl?.setValue('');
        bankNameControl?.disable();
      }
      bankNameControl?.updateValueAndValidity();

      // Corte y pago solo para crédito
      if (accountType === 'CREDIT') {
        cutDayControl?.enable();
        paymentDayControl?.enable();
        cutDayControl?.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
        paymentDayControl?.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
      } else {
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
    const isDebit = accountType === 'DEBIT';

    const request: PaymentMethodRequest = {
      userId,
      bankName: isDebit || isCreditCard ? this.form.value.bankName : 'Efectivo',
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
