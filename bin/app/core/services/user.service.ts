import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseModel, UserRequest, User } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  createUser(request: UserRequest): Observable<User> {
    return this.http
      .post<ResponseModel<User>>(this.apiUrl, request)
      .pipe(map((response) => response.data));
  }

  getUserById(id: number): Observable<User> {
    return this.http
      .get<ResponseModel<User>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  /**
   * Actualizar usuario (especialmente para contributionPercentage)
   */
  updateUser(id: number, request: UserRequest): Observable<User> {
    return this.http
      .put<ResponseModel<User>>(`${this.apiUrl}/${id}`, request)
      .pipe(map((response) => response.data));
  }

  /**
   * Obtener todos los usuarios de un tenant (pareja)
   */
  getUsersByTenant(tenantId: number): Observable<User[]> {
    return this.http
      .get<ResponseModel<User[]>>(`${this.apiUrl}/tenant/${tenantId}`)
      .pipe(map((response) => response.data));
  }
}
