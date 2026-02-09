// Modelo de autenticación
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  tenantId?: number;
}

export interface AuthResponse {
  token: string;
  userId: number;
  tenantId: number;
  role: string;
}
