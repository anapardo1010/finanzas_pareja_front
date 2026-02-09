/**
 * Modelo de Cuota/Instalamento
 */
export interface Installment {
  id: number;
  transactionId: number;
  installmentNumber: number;
  amount: number;  // BigDecimal se maneja como number
  dueDate: string;  // LocalDate como string ISO (YYYY-MM-DD)
  isPaid: boolean;
  paidDate?: string;
}

/**
 * DTO para crear/actualizar Cuota
 */
export interface InstallmentRequest {
  transactionId: number;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  isPaid?: boolean;
  paidDate?: string;
}
