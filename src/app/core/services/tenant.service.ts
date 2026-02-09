import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseModel, TenantRequest, Tenant } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly apiUrl = `${environment.apiUrl}/tenants`;

  constructor(private http: HttpClient) {}

  createTenant(request: TenantRequest): Observable<Tenant> {
    return this.http
      .post<ResponseModel<Tenant>>(this.apiUrl, request)
      .pipe(map((response) => response.data));
  }

  getTenantById(id: number): Observable<Tenant> {
    return this.http
      .get<ResponseModel<Tenant>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }
}
