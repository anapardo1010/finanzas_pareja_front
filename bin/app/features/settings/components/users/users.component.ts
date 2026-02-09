import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Usuarios</h1>
      <p>Módulo en desarrollo...</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 20px;
    }
  `]
})
export class UsersComponent {}
