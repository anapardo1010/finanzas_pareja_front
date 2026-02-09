import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseModel, PaymentMethodRequest, PaymentMethod, PaymentMethodPage } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentMethodService {
  private readonly apiUrl = `${environment.apiUrl}/payment-methods`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener métodos de pago por tenant
   */
  getByTenant(tenantId: number, page: number = 0, size: number = 10, sortBy: string = 'id', direction: string = 'DESC'): Observable<PaymentMethodPage> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('direction', direction);

    return this.http.get<ResponseModel<PaymentMethod[]>>(`${this.apiUrl}/tenant/${tenantId}`, { params })
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
   * Crear nuevo método de pago
   */
  createPaymentMethod(request: PaymentMethodRequest): Observable<PaymentMethod> {
    return this.http
      .post<ResponseModel<PaymentMethod>>(this.apiUrl, request)
      .pipe(map((response) => response.data));
  }

  /**
   * Obtener método de pago por ID
   */
  getPaymentMethodById(id: number): Observable<PaymentMethod> {
    return this.http
      .get<ResponseModel<PaymentMethod>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  /**
   * Actualizar método de pago existente
   */
  updatePaymentMethod(id: number, request: PaymentMethodRequest): Observable<PaymentMethod> {
    return this.http
      .put<ResponseModel<PaymentMethod>>(`${this.apiUrl}/${id}`, request)
      .pipe(map(response => response.data));
  }

  /**
   * Eliminar método de pago
   */
  deletePaymentMethod(id: number): Observable<void> {
    return this.http
      .delete<ResponseModel<void>>(`${this.apiUrl}/${id}`)
      .pipe(map(response => response.data));
  }
}
