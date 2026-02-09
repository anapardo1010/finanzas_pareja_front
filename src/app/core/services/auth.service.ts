import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { LoginRequest, RegisterRequest, AuthResponse } from '../models/auth.model';
import { ResponseModel } from '../models/response.model';
import { User } from '../models/user.model';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api/auth';
  private readonly USER_KEY = 'current_user';
  private readonly TENANT_KEY = 'tenant_id';

  // Signal para el usuario actual
  currentUser = signal<User | null>(this.getUserFromStorage());

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) {}

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<ResponseModel<AuthResponse>>(`${this.apiUrl}/login`, request)
      .pipe(
        map(res => res.data),
        tap(authData => this.saveUserData(authData, request.email))
      );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<ResponseModel<AuthResponse>>(`${this.apiUrl}/register`, request)
      .pipe(
        map(res => res.data),
        tap(authData => this.saveUserData(authData, request.email, request.name))
      );
  }

  /**
   * Registrar usuario invitado (pareja) con tenantId existente
   */
  registerInvite(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<ResponseModel<AuthResponse>>(`${this.apiUrl}/register/invite`, request)
      .pipe(
        map(res => res.data),
        tap(authData => this.saveUserData(authData, request.email, request.name))
      );
  }

  /**
   * Guardar datos del usuario en localStorage
   */
  private saveUserData(authData: AuthResponse, email?: string, name?: string): void {
    // Guardar token
    this.tokenService.setToken(authData.token);
    
    // Crear objeto User a partir de la respuesta
    const user: User = {
      id: authData.userId,
      name: name || 'Usuario',
      email: email || '',
      role: authData.role
    };
    
    // Guardar datos del usuario y tenant
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem(this.TENANT_KEY, authData.tenantId.toString());
    
    // Actualizar signal
    this.currentUser.set(user);
    
    console.log('✅ Usuario autenticado, ID:', authData.userId);
    console.log('✅ Email:', email);
    console.log('✅ Token guardado');
    console.log('✅ TenantId:', authData.tenantId);
    console.log('✅ Role:', authData.role);
  }

  /**
   * Obtener usuario desde localStorage
   */
  private getUserFromStorage(): User | null {
    const userData = localStorage.getItem(this.USER_KEY);
    if (!userData || userData === 'undefined' || userData === 'null') {
      return null;
    }
    try {
      return JSON.parse(userData);
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e);
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
  }

  /**
   * Obtener tenantId desde localStorage
   */
  getTenantId(): number | null {
    const tenantId = localStorage.getItem(this.TENANT_KEY);
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
      return null;
    }
    const parsed = parseInt(tenantId);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Limpiar datos de sesión
   */
  logout(): void {
    this.tokenService.removeToken();
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TENANT_KEY);
    this.currentUser.set(null);
    console.log('🚪 Sesión cerrada');
  }
}
