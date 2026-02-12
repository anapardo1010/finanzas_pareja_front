import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentMethod } from '../../../../core/models';
import { PaymentMethodService } from '../../../../core/services/payment-method.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PaymentMethodFormComponent } from '../payment-method-form/payment-method-form.component';
import { LucideAngularModule, Edit2 } from 'lucide-angular';
import { Wallet } from 'lucide-angular';
import { Trash2 } from 'lucide-angular';

/**
 * PaymentMethodsTabComponent - Tab para gestionar métodos de pago (tarjetas)
 */
@Component({
  selector: 'app-payment-methods-tab',
  standalone: true,
  imports: [CommonModule, PaymentMethodFormComponent, LucideAngularModule],
  templateUrl: './payment-methods-tab.component.html',
  styleUrl: './payment-methods-tab.component.scss'
})
export class PaymentMethodsTabComponent implements OnInit {
    readonly Edit2 = Edit2;
    readonly Wallet = Wallet; // Added Wallet icon reference
    readonly Trash2 = Trash2; // Added Trash2 icon reference

  // Field initializers - lugar válido para inject()
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly authService = inject(AuthService);

  paymentMethods = signal<PaymentMethod[]>([]);
  loading = signal(false);
  showForm = signal(false);
  selectedPaymentMethod = signal<PaymentMethod | null>(null);

  ngOnInit(): void {
    this.loadPaymentMethods();
  }

  /**
   * Cargar métodos de pago del tenant actual
   */
  loadPaymentMethods(): void {
    const tenantId = this.authService.getTenantId();
    console.log('🔍 TenantId para payment methods:', tenantId);
    if (!tenantId) {
      console.error('❌ No hay tenantId');
      return;
    }

    this.loading.set(true);
    console.log('🔄 Cargando payment methods...');
    this.paymentMethodService.getByTenant(tenantId, 0, 50).subscribe({
      next: (page) => {
        console.log('✅ Payment methods cargados:', page);
        this.paymentMethods.set(page.content);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading payment methods:', err);
        this.loading.set(false);
      }
    });
  }

  /**
   * Abrir formulario para crear nuevo método de pago
   */
  openCreateForm(): void {
    this.selectedPaymentMethod.set(null);
    this.showForm.set(true);
  }

  /**
   * Crear opciones predefinidas de métodos de pago comunes
   */
  createPredefinedOptions(): void {
    const userId = this.authService.currentUser()?.id;
    const tenantId = this.authService.getTenantId();
    
    if (!userId || !tenantId) {
      console.error('❌ No hay userId o tenantId');
      return;
    }

    const predefinedMethods = [
      { bankName: 'Efectivo', accountType: 'CASH', cutDay: 1, paymentDay: 1 },
      { bankName: 'Nu', accountType: 'CREDIT', cutDay: 1, paymentDay: 10 },
      { bankName: 'Rappi', accountType: 'CREDIT', cutDay: 15, paymentDay: 25 },
      { bankName: 'BBVA', accountType: 'CREDIT', cutDay: 5, paymentDay: 20 },
      { bankName: 'Santander', accountType: 'CREDIT', cutDay: 10, paymentDay: 25 },
      { bankName: 'Citibanamex', accountType: 'CREDIT', cutDay: 15, paymentDay: 28 }
    ];

    this.loading.set(true);
    let created = 0;
    let errors = 0;

    predefinedMethods.forEach((method, index) => {
      const paymentMethod = { userId, tenantId, ...method };
      
      this.paymentMethodService.createPaymentMethod(paymentMethod).subscribe({
        next: () => {
          created++;
          if (created + errors === predefinedMethods.length) {
            this.loading.set(false);
            console.log(`✅ Creados ${created} métodos de pago predefinidos`);
            this.loadPaymentMethods();
          }
        },
        error: (err) => {
          errors++;
          console.error(`❌ Error creando ${method.bankName}:`, err);
          if (created + errors === predefinedMethods.length) {
            this.loading.set(false);
            this.loadPaymentMethods();
          }
        }
      });
    });
  }

  /**
   * Editar método de pago existente
   */
  editPaymentMethod(paymentMethod: PaymentMethod): void {
    this.selectedPaymentMethod.set(paymentMethod);
    this.showForm.set(true);
  }

  /**
   * Eliminar método de pago
   */
  deletePaymentMethod(paymentMethod: PaymentMethod): void {
    if (!confirm(`¿Eliminar la tarjeta "${paymentMethod.bankName}"?`)) return;

    this.paymentMethodService.deletePaymentMethod(paymentMethod.id).subscribe({
      next: () => {
        this.loadPaymentMethods();
      },
      error: (err) => {
        console.error('Error deleting payment method:', err);
      }
    });
  }

  /**
   * Manejar guardado desde el formulario
   */
  handleFormSave(): void {
    this.showForm.set(false);
    this.loadPaymentMethods();
  }

  /**
   * Cerrar formulario
   */
  closeForm(): void {
    this.showForm.set(false);
    this.selectedPaymentMethod.set(null);
  }

  /**
   * Obtener color del banco (Apple Card style)
   */
  getBankColor(bankName: string): string {
    const colors: { [key: string]: string } = {
      'BBVA': 'linear-gradient(135deg, #004481 0%, #0059A3 100%)',
      'Santander': 'linear-gradient(135deg, #EC0000 0%, #C40000 100%)',
      'HSBC': 'linear-gradient(135deg, #DB0011 0%, #B00010 100%)',
      'Banamex': 'linear-gradient(135deg, #002E6D 0%, #004B8D 100%)',
      'Banorte': 'linear-gradient(135deg, #ED1C24 0%, #C4161D 100%)',
      'ScotiaBank': 'linear-gradient(135deg, #ED1B2E 0%, #C41628 100%)',
      'Inbursa': 'linear-gradient(135deg, #003DA5 0%, #0052D9 100%)',
      'default': 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
    };

    return colors[bankName] || colors['default'];
  }
}
