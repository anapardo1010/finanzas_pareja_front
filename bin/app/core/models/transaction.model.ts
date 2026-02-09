/**
 * Modelo de Transacción
 */
export type Transaction = {
  id: number;
  tenantId: number;
  userId: number;
  categoryId: number;
  paymentMethodId: number;
  description: string;
  amount: number;
  date: string;
  isShared: boolean;
  transactionType: 'EXPENSE' | 'INCOME';
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
  categoryId: number;
  paymentMethodId: number;
  description: string;
  amount: number;
  date: string;
  isShared: boolean;
  transactionType: 'EXPENSE' | 'INCOME';
  hasInstallments: boolean;
  totalInstallments: number;
};
  
/**
 * Filtros para consultar transacciones
 */
export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'EXPENSE' | 'INCOME';
  categoryId?: number;
  paymentMethodId?: number;
  userId?: number;
  isShared?: boolean;
}
