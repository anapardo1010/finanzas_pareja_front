/**
 * Modelo de Método de Pago
 */
export type PaymentMethod = {
  id: number;
  userId: number;
  bankName: string;
  accountType: string;
  cutDay: number;
  paymentDay: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  alias?: string;
};

/**
 * DTO para crear/actualizar Método de Pago
 */
export type PaymentMethodRequest = {
  userId: number;
  bankName: string;
  accountType: string;
  cutDay: number;
  paymentDay: number;
  alias?: string;
};

/**
 * Page response para métodos de pago
 */
export interface PaymentMethodPage {
  totalElements: number;
  totalPages: number;
  number: number;
  sort: {
    empty: boolean;
    unsorted: boolean;
    sorted: boolean;
  };
  size: number;
  content: PaymentMethod[];
  first: boolean;
  last: boolean;
  numberOfElements: number;
  pageable: {
    sort: {
      empty: boolean;
      unsorted: boolean;
      sorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
    pageNumber: number;
    pageSize: number;
  };
  empty: boolean;
}
