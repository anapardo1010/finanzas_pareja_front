import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Categorías</h1>
      <p>Módulo en desarrollo...</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 20px;
    }
  `]
})
export class CategoriesComponent {}
