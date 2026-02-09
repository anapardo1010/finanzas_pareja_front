import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http'; // Añadido HttpParams
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  ResponseModel, 
  Transaction, 
  TransactionRequest, 
  TransactionFilters // Asegúrate de que este tipo exista en tu carpeta de models
} from '../models';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly apiUrl = `${environment.apiUrl}/transactions`;

  constructor(private http: HttpClient) {}

  /**
   * Crear una nueva transacción (Gasto o Ingreso)
   */
  createTransaction(request: TransactionRequest): Observable<Transaction> {
    return this.http
      .post<ResponseModel<Transaction>>(this.apiUrl, request)
      .pipe(map((response) => response.data));
  }

  /**
   * Obtener una transacción específica por su ID
   */
  getTransactionById(id: number): Observable<Transaction> {
    return this.http
      .get<ResponseModel<Transaction>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  /**
   * Listar todas las transacciones de un tenant con filtros opcionales
   */
  getTransactionsByTenant(
    tenantId: number, 
    filters?: TransactionFilters
  ): Observable<Transaction[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.type) params = params.set('type', filters.type);
      if (filters.categoryId) params = params.set('categoryId', filters.categoryId.toString());
      if (filters.paymentMethodId) params = params.set('paymentMethodId', filters.paymentMethodId.toString());
      if (filters.userId) params = params.set('userId', filters.userId.toString());
      if (filters.isShared !== undefined) params = params.set('isShared', filters.isShared.toString());
    }

    return this.http
      .get<ResponseModel<Transaction[]>>(`${this.apiUrl}/tenant/${tenantId}`, { params })
      .pipe(map(response => response.data));
  }

  /**
   * Listar transacciones compartidas de un tenant con rango de fechas
   */
  getSharedTransactions(tenantId: number, startDate?: string, endDate?: string): Observable<Transaction[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http
      .get<ResponseModel<Transaction[]>>(`${this.apiUrl}/tenant/${tenantId}/shared`, { params })
      .pipe(map(response => response.data));
  }

  /**
   * Obtener transacciones con MSI (Meses Sin Intereses)
   */
  getTransactionsWithInstallments(tenantId: number): Observable<Transaction[]> {
    return this.http
      .get<ResponseModel<Transaction[]>>(`${this.apiUrl}/tenant/${tenantId}/with-installments`)
      .pipe(map(response => response.data));
  }

  /**
   * Obtener transacciones por rango de fechas
   */
  getTransactionsByDateRange(tenantId: number, startDate: string, endDate: string): Observable<Transaction[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http
      .get<ResponseModel<Transaction[]>>(`${this.apiUrl}/tenant/${tenantId}`, { params })
      .pipe(map(response => response.data));
  }

  /**
   * Actualizar una transacción existente
   */
  updateTransaction(id: number, request: TransactionRequest): Observable<Transaction> {
    return this.http
      .put<ResponseModel<Transaction>>(`${this.apiUrl}/${id}`, request)
      .pipe(map(response => response.data));
  }

  /**
   * Eliminar una transacción
   */
  deleteTransaction(id: number): Observable<void> {
    return this.http
      .delete<ResponseModel<void>>(`${this.apiUrl}/${id}`)
      .pipe(map(response => response.data));
  }
} 