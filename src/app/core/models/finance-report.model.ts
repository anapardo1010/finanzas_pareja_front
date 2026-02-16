/**
 * Resumen financiero general
 */
export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingInstallments: number;
  upcomingPayments: InstallmentSummary[];
}

/**
 * Resumen de cuotas próximas
 */
export interface InstallmentSummary {
  installmentId: number;
  transactionId: number;
  description: string;
  amount: number;
  dueDate: string;
  installmentNumber: number;
  totalInstallments: number;
}

/**
 * Reporte por categoría
 */
export interface CategoryReport {
  categoryId: number;
  categoryName: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

/**
 * Reporte por método de pago
 */
export interface PaymentMethodReport {
  paymentMethodId: number;
  paymentMethodName: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

/**
 * Balance por método de pago (Mis Cuentas)
 */
export interface PaymentMethodBalance {
  paymentMethodId: number;
  paymentMethodName: string;
  alias: string;
  accountType: 'DEBIT' | 'CREDIT' | 'CASH' | 'OTHER';
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  transfersIn: number;
  transfersOut: number;
  transactionCount: number;
}

/**
 * Parámetros para generar reportes
 */
export interface ReportParams {
  startDate?: string;
  endDate?: string;
  type?: 'INCOME' | 'EXPENSE';
}

/**
 * Balance mensual
 */
export interface MonthlyBalance {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  user1Contribution: number;
  user2Contribution: number;
}

/**
 * Liquidación proporcional
 */
export interface ProportionalSettlement {
  user1Id: number;
  user1Name: string;
  user1Contribution: number;
  user1TotalPaid: number;
  user1ShouldPay: number;
  user1Balance: number;
  user2Id: number;
  user2Name: string;
  user2Contribution: number;
  user2TotalPaid: number;
  user2ShouldPay: number;
  user2Balance: number;
  totalSharedExpenses: number;
  settlementAmount: number;
  whoOwes: string;
  whoReceives: string;
}

/**
 * Cuota MSI (Meses Sin Intereses)
 */
export interface InstallmentMSI {
  id: number;
  transactionId: number;
  description: string;
  amount: number;
  dueDate: string;
  paymentMethodId: number;
  paymentMethodName: string;
  installmentNumber: number;
  totalInstallments: number;
  isPaid: boolean;
  paidDate?: string;
  alias?: string;
}

/**
 * Saldo de tarjeta de crédito
 */
export interface CreditCardBalance {
  paymentMethodId: number;
  bankName: string;
  cutDay: number;
  paymentDay: number;
  currentCutDate: string;
  currentPaymentDate: string;
  currentBalance: number;
  pendingInstallments: number;
  totalDue: number;
  status: 'PENDING_CUT' | 'PENDING_PAYMENT' | 'OVERDUE';
  paymentStatus?: 'PAID' | 'PENDING' | 'OVERDUE';
  isPaid?: boolean;
  periodId?: string;
  daysUntilCut: number;
  daysUntilPayment: number;
  alias?: string;
}

/**
 * Parte de un usuario en el pago de tarjeta
 */
export interface UserShare {
  userId: number;
  userName: string;
  contributionPercentage: number;
  amountToPay: number;
}

/**
 * Pago proporcional de tarjeta de crédito
 */
export interface CreditCardProportionalPayment {
  paymentMethodId: number;
  userId: number; // Dueño de la tarjeta
  bankName: string;
  cutDate: string;
  paymentDate: string;
  currentBalance: number;
  pendingInstallments: number;
  totalDue: number;
  status: string;
  paymentStatus: string;
  periodId: string;
  userShares: UserShare[];
  selected?: boolean; // Para el checkbox en el UI
  alias?: string;
}

/**
 * Pagos proporcionales para métodos NO-crediticios (débito, efectivo, cuentas)
 * Respuesta de: GET /api/v1/finance-reports/tenant/{tenantId}/non-credit-proportional-payments
 */
export interface NonCreditProportionalPayment {
  paymentMethodId: number;
  userId?: number;
  alias?: string;
  bankName?: string;
  accountType: 'DEBIT' | 'CASH' | 'OTHER';
  rangeStart?: string;
  rangeEnd?: string;
  currentBalance: number;
  transactionCount: number;
  userShares: UserShare[];
}
