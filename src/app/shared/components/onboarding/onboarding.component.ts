import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from 'src/app/core/services/tenant.service';
import { UserService } from 'src/app/core/services/user.service';
import { PaymentMethodService } from 'src/app/core/services/payment-method.service';
import { TenantRequest, UserRequest, PaymentMethodRequest, Tenant, User, PaymentMethod } from 'src/app/core/models';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss']
})
export class OnboardingComponent {
  step = 1;
  loading = false;
  error: string | null = null;

  // Tenant
  tenantForm: TenantRequest = { groupName: '', planType: 'FREE' };
  tenant: Tenant | null = null;

  // User
  userForm: UserRequest = { tenantId: 0, name: '', email: '', contributionPercentage: 50 };
  user: User | null = null;

  // Payment Method
  paymentForm: PaymentMethodRequest = { userId: 0, bankName: '', accountType: '', cutDay: 1, paymentDay: 1 };
  paymentMethod: PaymentMethod | null = null;

  constructor(
    private tenantService: TenantService,
    private userService: UserService,
    private paymentMethodService: PaymentMethodService
  ) {}

  nextStep() {
    this.step++;
  }

  prevStep() {
    this.step--;
  }

  submitTenant() {
    this.loading = true;
    this.tenantService.createTenant(this.tenantForm).subscribe({
      next: (tenant) => {
        this.tenant = tenant;
        this.userForm.tenantId = tenant.id;
        this.loading = false;
        this.nextStep();
      },
      error: (err) => {
        this.error = 'Error creando Tenant';
        this.loading = false;
      }
    });
  }

  submitUser() {
    this.loading = true;
    this.userService.createUser(this.userForm).subscribe({
      next: (user) => {
        this.user = user;
        this.paymentForm.userId = user.id;
        this.loading = false;
        this.nextStep();
      },
      error: (err) => {
        this.error = 'Error creando Usuario';
        this.loading = false;
      }
    });
  }

  submitPaymentMethod() {
    this.loading = true;
    this.paymentMethodService.createPaymentMethod(this.paymentForm).subscribe({
      next: (paymentMethod) => {
        this.paymentMethod = paymentMethod;
        this.loading = false;
        this.nextStep();
      },
      error: (err) => {
        this.error = 'Error creando Método de Pago';
        this.loading = false;
      }
    });
  }
}
