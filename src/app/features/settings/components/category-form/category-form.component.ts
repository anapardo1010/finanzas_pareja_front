import { Component, EventEmitter, Input, OnInit, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category, CategoryRequest } from '../../../../core/models';
import { CategoryService } from '../../../../core/services/category.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * CategoryFormComponent - Modal para crear/editar categorías
 */
@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss'
})
export class CategoryFormComponent implements OnInit {
  // Field initializers - lugar válido para inject()
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly authService = inject(AuthService);

  @Input() category: Category | null = null;
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;
  submitting = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.initForm();
  }

  /**
   * Inicializar formulario
   */
  private initForm(): void {
    this.form = this.fb.group({
      name: [this.category?.name || '', [Validators.required, Validators.minLength(3)]],
      description: [this.category?.description || '', [Validators.maxLength(200)]]
    });
  }

  /**
   * Determinar si es edición o creación
   */
  get isEditing(): boolean {
    return this.category !== null;
  }

  /**
   * Guardar categoría
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const tenantId = this.authService.getTenantId();
    if (!tenantId) {
      this.error.set('No se pudo obtener el ID del tenant');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const request: CategoryRequest = {
      tenantId,
      name: this.form.value.name,
      description: this.form.value.description || ''
    };

    const operation = this.isEditing
      ? this.categoryService.updateCategory(this.category!.id, request)
      : this.categoryService.createCategory(request);

    operation.subscribe({
      next: () => {
        this.submitting.set(false);
        this.save.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.message || 'Error al guardar la categoría');
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
    if (control.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    if (control.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }
    return '';
  }
}
