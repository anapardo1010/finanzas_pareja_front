import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * HTTP Interceptor para manejar errores globalmente
 * y agregar configuraciones comunes a todas las peticiones
 */
@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Clonar la petición y agregar headers comunes
    const modifiedReq = req.clone({
      setHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (environment.enableDebugLogs) {
      console.log('🚀 HTTP Request:', {
        method: modifiedReq.method,
        url: modifiedReq.url,
        headers: modifiedReq.headers.keys()
      });
    }

    return next.handle(modifiedReq).pipe(
      timeout(environment.apiTimeout),
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Ocurrió un error desconocido';

        if (error.error instanceof ErrorEvent) {
          // Error del lado del cliente
          errorMessage = `Error: ${error.error.message}`;
          console.error('❌ Client-side error:', error.error.message);
        } else {
          // Error del lado del servidor
          errorMessage = `Error ${error.status}: ${error.message}`;
          console.error('❌ Server-side error:', {
            status: error.status,
            message: error.message,
            url: error.url
          });

          // Manejar códigos de error específicos
          switch (error.status) {
            case 400:
              errorMessage = 'Solicitud incorrecta. Verifica los datos enviados.';
              break;
            case 401:
              errorMessage = 'No autorizado. Inicia sesión nuevamente.';
              break;
            case 403:
              errorMessage = 'Acceso prohibido.';
              break;
            case 404:
              errorMessage = 'Recurso no encontrado.';
              break;
            case 500:
              errorMessage = 'Error interno del servidor.';
              break;
            case 503:
              errorMessage = 'Servicio no disponible. Intenta más tarde.';
              break;
          }
        }

        // Retornar el error
        return throwError(() => ({
          message: errorMessage,
          status: error.status,
          originalError: error
        }));
      })
    );
  }
}
