import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseModel, CategoryRequest, Category, CategoryPage } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly apiUrl = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todas las categorías (paginado)
   */
  getAll(page: number = 0, size: number = 10, sortBy: string = 'id', direction: string = 'DESC'): Observable<CategoryPage> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('direction', direction);

    return this.http.get<ResponseModel<CategoryPage>>(this.apiUrl, { params })
      .pipe(map(response => response.data));
  }

  /**
   * Obtener categorías por tenant
   */
  getByTenant(tenantId: number, page: number = 0, size: number = 10, sortBy: string = 'id', direction: string = 'DESC'): Observable<CategoryPage> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('direction', direction);

    return this.http.get<ResponseModel<Category[]>>(`${this.apiUrl}/tenant/${tenantId}`, { params })
      .pipe(map(response => ({
        content: response.data,
        totalElements: response.metadata?.elements || 0,
        totalPages: Math.ceil((response.metadata?.elements || 0) / size),
        number: response.metadata?.page || 0,
        size: response.metadata?.size || size,
        first: (response.metadata?.page || 0) === 0,
        last: true,
        numberOfElements: response.data.length,
        empty: response.data.length === 0,
        sort: { empty: true, unsorted: true, sorted: false },
        pageable: {
          sort: { empty: true, unsorted: true, sorted: false },
          offset: (response.metadata?.page || 0) * size,
          paged: true,
          unpaged: false,
          pageNumber: response.metadata?.page || 0,
          pageSize: response.metadata?.size || size
        }
      })));
  }

  /**
   * Crear nueva categoría
   */
  createCategory(request: CategoryRequest): Observable<Category> {
    return this.http
      .post<ResponseModel<Category>>(this.apiUrl, request)
      .pipe(map((response) => response.data));
  }

  /**
   * Obtener categoría por ID
   */
  getCategoryById(id: number): Observable<Category> {
    return this.http
      .get<ResponseModel<Category>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  /**
   * Actualizar categoría existente
   */
  updateCategory(id: number, request: CategoryRequest): Observable<Category> {
    return this.http
      .put<ResponseModel<Category>>(`${this.apiUrl}/${id}`, request)
      .pipe(map(response => response.data));
  }

  /**
   * Eliminar categoría
   */
  deleteCategory(id: number): Observable<void> {
    return this.http
      .delete<ResponseModel<void>>(`${this.apiUrl}/${id}`)
      .pipe(map(response => response.data));
  }
}
