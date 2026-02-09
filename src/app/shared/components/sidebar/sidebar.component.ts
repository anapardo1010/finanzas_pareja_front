import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface MenuItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  menuItems: MenuItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
    { icon: 'receipt_long', label: 'Transacciones', route: '/transactions' },
    { icon: 'category', label: 'Categorías', route: '/categories' },
    { icon: 'credit_card', label: 'Métodos de Pago', route: '/payment-methods' },
    { icon: 'people', label: 'Usuarios', route: '/users' },
    { icon: 'settings', label: 'Configuración', route: '/settings' }
  ];

  isCollapsed = false;

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
