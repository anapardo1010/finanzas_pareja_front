import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseModel, CreditCardPayRequest, CreditCardPaymentRecord } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CreditCardPaymentService {
  private readonly apiUrl = `${environment.apiUrl}/credit-card-payments`;

  constructor(private http: HttpClient) {}

  /**
   * Registrar pago de tarjeta de crédito
   * POST /credit-card-payments/tenant/{tenantId}/pay
   */
  pay(tenantId: number, request: CreditCardPayRequest): Observable<CreditCardPaymentRecord[]> {
    return this.http
      .post<ResponseModel<CreditCardPaymentRecord[]>>(`${this.apiUrl}/tenant/${tenantId}/pay`, request)
      .pipe(map(r => r.data));
  }

  /**
   * Historial de pagos del tenant
   * GET /credit-card-payments/tenant/{tenantId}/history
   */
  getTenantHistory(tenantId: number): Observable<CreditCardPaymentRecord[]> {
    return this.http
      .get<ResponseModel<CreditCardPaymentRecord[]>>(`${this.apiUrl}/tenant/${tenantId}/history`)
      .pipe(map(r => r.data));
  }

  /**
   * Historial de pagos de una tarjeta
   * GET /credit-card-payments/card/{creditCardId}/history
   */
  getCardHistory(creditCardId: number): Observable<CreditCardPaymentRecord[]> {
    return this.http
      .get<ResponseModel<CreditCardPaymentRecord[]>>(`${this.apiUrl}/card/${creditCardId}/history`)
      .pipe(map(r => r.data));
  }

  /**
   * Pagos de una tarjeta en un periodo específico
   * GET /credit-card-payments/card/{creditCardId}/period/{periodId}
   */
  getCardPeriodPayments(creditCardId: number, periodId: string): Observable<CreditCardPaymentRecord[]> {
    return this.http
      .get<ResponseModel<CreditCardPaymentRecord[]>>(`${this.apiUrl}/card/${creditCardId}/period/${periodId}`)
      .pipe(map(r => r.data));
  }

  /**
   * Monto ya pagado de un periodo
   * GET /credit-card-payments/card/{creditCardId}/period/{periodId}/paid-amount
   */
  getPaidAmount(creditCardId: number, periodId: string): Observable<number> {
    return this.http
      .get<ResponseModel<number>>(`${this.apiUrl}/card/${creditCardId}/period/${periodId}/paid-amount`)
      .pipe(map(r => r.data));
  }
}
