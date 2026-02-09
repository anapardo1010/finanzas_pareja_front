import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoriesTabComponent } from './components/categories-tab/categories-tab.component';
import { PaymentMethodsTabComponent } from './components/payment-methods-tab/payment-methods-tab.component';
import { LucideAngularModule, Folder, CreditCard } from 'lucide-angular';

/**
 * SettingsComponent - Vista principal de configuración con tabs iOS-style
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, CategoriesTabComponent, PaymentMethodsTabComponent, LucideAngularModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  activeTab = signal<'categories' | 'payment-methods'>('categories');

  // Lucide Icons
  readonly Folder = Folder;
  readonly CreditCard = CreditCard;

  /**
   * Cambiar tab activo
   */
  switchTab(tab: 'categories' | 'payment-methods'): void {
    this.activeTab.set(tab);
  }
}
