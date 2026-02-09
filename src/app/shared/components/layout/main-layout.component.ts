import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule, Wallet, LayoutDashboard, CreditCard, TrendingUp, Users, Settings, LogOut } from 'lucide-angular';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Lucide Icons
  readonly Wallet = Wallet;
  readonly LayoutDashboard = LayoutDashboard;
  readonly CreditCard = CreditCard;
  readonly TrendingUp = TrendingUp;
  readonly Users = Users;
  readonly Settings = Settings;
  readonly LogOut = LogOut;

  get userName(): string {
    return this.authService.currentUser()?.name || 'Usuario';
  }

  get userEmail(): string {
    return this.authService.currentUser()?.email || '';
  }

  get userEmailShort(): string {
    const email = this.userEmail;
    if (!email) return '';
    // Mostrar solo las primeras letras antes del @
    const [localPart] = email.split('@');
    return localPart.length > 12 ? localPart.substring(0, 12) + '...' : localPart;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }
}
