import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '../../../../core/models';
import { CategoryService } from '../../../../core/services/category.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CategoryFormComponent } from '../category-form/category-form.component';
import { LucideAngularModule, Folder, Edit2, Trash2, Plus } from 'lucide-angular';

/**
 * CategoriesTabComponent - Tab para gestionar categorías
 */
@Component({
  selector: 'app-categories-tab',
  standalone: true,
  imports: [CommonModule, CategoryFormComponent, LucideAngularModule],
  templateUrl: './categories-tab.component.html',
  styleUrl: './categories-tab.component.scss'
})
export class CategoriesTabComponent implements OnInit {
  // Field initializers - lugar válido para inject()
  private readonly categoryService = inject(CategoryService);
  private readonly authService = inject(AuthService);

  // Lucide Icons
  readonly Folder = Folder;
  readonly Edit2 = Edit2;
  readonly Trash2 = Trash2;
  readonly Plus = Plus;

  categories = signal<Category[]>([]);
  loading = signal(false);
  showForm = signal(false);
  selectedCategory = signal<Category | null>(null);

  ngOnInit(): void {
    console.log('CategoriesTab inicializado');
    console.log('TenantId:', this.authService.getTenantId());
    console.log('Usuario:', this.authService.currentUser());
    this.loadCategories();
  }

  /**
   * Cargar categorías del tenant actual
   */
  loadCategories(): void {
    const tenantId = this.authService.getTenantId();
    console.log('Cargando categorías para tenantId:', tenantId);
    
    if (!tenantId) {
      console.error('No hay tenantId - usuario no autenticado?');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.categoryService.getByTenant(tenantId, 0, 50).subscribe({
      next: (page) => {
        console.log('Categorías cargadas:', page);
        this.categories.set(page.content);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.loading.set(false);
      }
    });
  }

  /**
   * Abrir formulario para crear nueva categoría
   */
  openCreateForm(): void {
    console.log('Abriendo formulario de categoría');
    this.selectedCategory.set(null);
    this.showForm.set(true);
    console.log('showForm:', this.showForm());
  }

  /**
   * Editar categoría existente
   */
  editCategory(category: Category): void {
    this.selectedCategory.set(category);
    this.showForm.set(true);
  }

  /**
   * Eliminar categoría
   */
  deleteCategory(category: Category): void {
    if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return;

    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {
        this.loadCategories();
      },
      error: (err) => {
        console.error('Error deleting category:', err);
      }
    });
  }

  /**
   * Manejar guardado desde el formulario
   */
  handleFormSave(): void {
    this.showForm.set(false);
    this.loadCategories();
  }

  /**
   * Cerrar formulario
   */
  closeForm(): void {
    this.showForm.set(false);
    this.selectedCategory.set(null);
  }
}
