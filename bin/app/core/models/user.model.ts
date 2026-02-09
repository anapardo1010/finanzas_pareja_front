/**
 * Modelo de Usuario
 */
export type User = {
  id: number;
  tenantId?: number;
  name: string;
  email: string;
  role: string;
  contributionPercentage?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * DTO para crear/actualizar Usuario
 */
export type UserRequest = {
  tenantId: number;
  name: string;
  email: string;
  contributionPercentage: number;
};
