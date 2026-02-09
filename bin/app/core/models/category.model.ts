/**
 * Modelo de Categoría
 */
export type Category = {
  id: number;
  tenantId: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * DTO para crear/actualizar Categoría
 */
export type CategoryRequest = {
  tenantId: number;
  name: string;
  description: string;
};

/**
 * Page response para categorías
 */
export interface CategoryPage {
  totalElements: number;
  totalPages: number;
  number: number;
  sort: {
    empty: boolean;
    unsorted: boolean;
    sorted: boolean;
  };
  size: number;
  content: Category[];
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
