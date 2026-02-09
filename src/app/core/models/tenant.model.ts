/**
 * Modelo de Tenant (Pareja/Grupo financiero)
 */
export type Tenant = {
  id: number;
  groupName: string;
  planType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * DTO para crear/actualizar Tenant
 */
export type TenantRequest = {
  groupName: string;
  planType: string;
};
