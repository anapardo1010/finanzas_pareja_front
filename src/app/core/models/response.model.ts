/**
 * Modelo genérico de respuesta del backend
 * Envuelve todas las respuestas de la API
 */
export type ResponseModel<T> = {
  businessCode: string;
  message: string;
  traceId: string | null;
  data: T;
  metadata?: {
    page: number;
    size: number;
    elements: number;
  };
};

/**
 * Modelo para respuestas paginadas
 */
export type PagedResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};
