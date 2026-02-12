/**
 * Modelo de Transacción
 */
export type Transaction = {
  id: number;
  tenantId: number;
  userId: number;
  categoryId?: number; // Opcional: no existe para TRANSFER ni CREDIT_PAYMENT
  paymentMethodId: number;
  destinationPaymentMethodId?: number; // Para TRANSFER y CREDIT_PAYMENT
  description: string;
  amount: number;
  date: string;
  isShared: boolean;
  transactionType: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CREDIT_PAYMENT';
  hasInstallments: boolean;
  totalInstallments: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * DTO para crear/actualizar Transacción
 */
export type TransactionRequest = {
  tenantId: number;
  userId: number;
  categoryId?: number; // Opcional: no requerido para TRANSFER ni CREDIT_PAYMENT
  paymentMethodId: number;
  destinationPaymentMethodId?: number; // Para TRANSFER y CREDIT_PAYMENT
  description: string;
  amount: number;
  date: string;
  isShared: boolean;
  transactionType: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CREDIT_PAYMENT';
  hasInstallments: boolean;
  totalInstallments: number;
};
  
/**
 * Filtros para consultar transacciones
 */
export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CREDIT_PAYMENT';
  categoryId?: number;
  paymentMethodId?: number;
  userId?: number;
  isShared?: boolean;
}
