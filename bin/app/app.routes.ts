import { Routes } from '@angular/router';
import { MainLayoutComponent } from './shared/components/layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth.component')
      .then(m => m.AuthComponent)
  },
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full'
  },
  {
    path: 'main',
    component: MainLayoutComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'transactions',
        loadComponent: () => import('./features/transactions/transactions.component')
          .then(m => m.TransactionsComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/settings/components/categories/categories.component')
          .then(m => m.CategoriesComponent)
      },
      {
        path: 'payment-methods',
        loadComponent: () => import('./features/settings/components/payment-methods/payment-methods.component')
          .then(m => m.PaymentMethodsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/settings/components/users/users.component')
          .then(m => m.UsersComponent)
      },
      {
        path: 'couple',
        loadComponent: () => import('./features/couple/couple.component')
          .then(m => m.CoupleComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component')
          .then(m => m.ReportsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component')
          .then(m => m.SettingsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'auth'
  }
];
