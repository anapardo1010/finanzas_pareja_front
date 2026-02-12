import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ResponseModel,
  FinancialSummary,
  CategoryReport,
  PaymentMethodReport,
  PaymentMethodBalance,
  ReportParams,
  MonthlyBalance,
  ProportionalSettlement,
  InstallmentMSI,
  CreditCardBalance,
  CreditCardProportionalPayment
} from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FinanceReportService {
  private readonly apiUrl = `${environment.apiUrl}/finance-reports`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener resumen financiero general de un tenant
   * GET /api/reports/summary/{tenantId}
   */
  getFinancialSummary(
    tenantId: number, 
    params?: ReportParams
  ): Observable<FinancialSummary> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
      if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
      if (params.type) httpParams = httpParams.set('type', params.type);
    }

    return this.http
      .get<ResponseModel<FinancialSummary>>(
        `${this.apiUrl}/summary/${tenantId}`,
        { params: httpParams }
      )
      .pipe(map(response => response.data));
  }

  /**
   * Obtener reporte de gastos/ingresos por categoría
   * GET /api/reports/by-category/{tenantId}
   */
  getReportByCategory(
    tenantId: number,
    params?: ReportParams
  ): Observable<CategoryReport[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
      if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
      if (params.type) httpParams = httpParams.set('type', params.type);
    }

    return this.http
      .get<ResponseModel<CategoryReport[]>>(
        `${this.apiUrl}/by-category/${tenantId}`,
        { params: httpParams }
      )
      .pipe(map(response => response.data));
  }

  /**
   * Obtener reporte de gastos/ingresos por método de pago
   * GET /api/reports/by-payment-method/{tenantId}
   */
  getReportByPaymentMethod(
    tenantId: number,
    params?: ReportParams
  ): Observable<PaymentMethodReport[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
      if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
      if (params.type) httpParams = httpParams.set('type', params.type);
    }

    return this.http
      .get<ResponseModel<PaymentMethodReport[]>>(
        `${this.apiUrl}/by-payment-method/${tenantId}`,
        { params: httpParams }
      )
      .pipe(map(response => response.data));
  }

  /**
   * Obtener balance mensual de un tenant
   * GET /api/v1/finance-reports/tenant/{tenantId}/monthly-balance
   * @param mode 'accrual' (devengo - gastos cuando ocurren) o 'cash' (caja - salida efectiva)
   */
  getMonthlyBalance(
    tenantId: number, 
    startDate?: string, 
    endDate?: string,
    mode: 'accrual' | 'cash' = 'accrual'
  ): Observable<MonthlyBalance[]> {
    let httpParams = new HttpParams();
    if (startDate) httpParams = httpParams.set('startDate', startDate);
    if (endDate) httpParams = httpParams.set('endDate', endDate);
    httpParams = httpParams.set('mode', mode);

    return this.http
      .get<ResponseModel<MonthlyBalance[]>>(
        `${this.apiUrl}/tenant/${tenantId}/monthly-balance`,
        { params: httpParams }
      )
      .pipe(map(response => response.data));
  }

  /**
   * Calcular liquidación proporcional entre la pareja
   * GET /api/v1/finance-reports/tenant/{tenantId}/proportional-settlement
   */
  getProportionalSettlement(tenantId: number, startDate?: string, endDate?: string): Observable<ProportionalSettlement> {
    let httpParams = new HttpParams();
    if (startDate) httpParams = httpParams.set('startDate', startDate);
    if (endDate) httpParams = httpParams.set('endDate', endDate);

    return this.http
      .get<ResponseModel<ProportionalSettlement>>(
        `${this.apiUrl}/tenant/${tenantId}/proportional-settlement`,
        { params: httpParams }
      )
      .pipe(map(response => response.data));
  }

  /**
   * Obtener próximas cuotas MSI (Meses Sin Intereses)
   * GET /api/v1/finance-reports/tenant/{tenantId}/upcoming-installments
   */
  getUpcomingInstallments(tenantId: number): Observable<InstallmentMSI[]> {
    return this.http
      .get<ResponseModel<InstallmentMSI[]>>(
        `${this.apiUrl}/tenant/${tenantId}/upcoming-installments`
      )
      .pipe(map(response => response.data));
  }

  /**
   * Obtener cuotas MSI vencidas
   * GET /api/v1/finance-reports/tenant/{tenantId}/overdue-installments
   */
  getOverdueInstallments(tenantId: number): Observable<InstallmentMSI[]> {
    return this.http
      .get<ResponseModel<InstallmentMSI[]>>(
        `${this.apiUrl}/tenant/${tenantId}/overdue-installments`
      )
      .pipe(map(response => response.data));
  }

  /**
   * Obtener saldos de tarjetas de crédito
   * GET /api/v1/finance-reports/tenant/{tenantId}/credit-card-balances
   */
  getCreditCardBalances(tenantId: number): Observable<CreditCardBalance[]> {
    return this.http
      .get<ResponseModel<CreditCardBalance[]>>(
        `${this.apiUrl}/tenant/${tenantId}/credit-card-balances`
      )
      .pipe(map(response => response.data));
  }

  /**
   * Marcar un periodo de pago de tarjeta como pagado
   * POST /api/v1/finance-reports/card-balance/{paymentMethodId}/mark-paid
   */
  markCardBalanceAsPaid(paymentMethodId: number, periodId: string): Observable<void> {
    return this.http
      .post<ResponseModel<void>>(
        `${this.apiUrl}/card-balance/${paymentMethodId}/mark-paid`,
        { periodId }
      )
      .pipe(map(response => response.data));
  }
  /**
   * Obtener pagos proporcionales de tarjetas de crédito
   * GET /api/v1/finance-reports/tenant/{tenantId}/credit-card-proportional-payments
   */
  getCreditCardProportionalPayments(tenantId: number): Observable<CreditCardProportionalPayment[]> {
    return this.http
      .get<ResponseModel<CreditCardProportionalPayment[]>>(
        `${this.apiUrl}/tenant/${tenantId}/credit-card-proportional-payments`
      )
      .pipe(map(response => response.data));
  }

  /**
   * Obtener balance por método de pago (efectivo, débito, crédito)
   * GET /api/v1/finance-reports/tenant/{tenantId}/balance-by-payment-method
   */
  getBalanceByPaymentMethod(tenantId: number, year?: number, month?: number): Observable<PaymentMethodBalance[]> {
    let httpParams = new HttpParams();
    if (year) httpParams = httpParams.set('year', year.toString());
    if (month) httpParams = httpParams.set('month', month.toString());

    return this.http
      .get<ResponseModel<PaymentMethodBalance[]>>(
        `${this.apiUrl}/tenant/${tenantId}/balance-by-payment-method`,
        { params: httpParams }
      )
      .pipe(map(response => response.data));
  }
}
export type { FinancialSummary };

