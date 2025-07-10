import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Check if this is an API request that needs authentication
    if (req.url.includes('/api/')) {
      return from(this.authService.getAccessToken()).pipe(
        switchMap(accessToken => {
          if (accessToken) {
            // Clone the request and add the authorization header
            const authReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${accessToken}`
              }
            });
            return next.handle(authReq);
          } else {
            console.warn('🔐 AuthInterceptor: No access token available for API request');
            return throwError(() => new Error('No access token available'));
          }
        }),
        catchError(error => {
          console.error('🔐 AuthInterceptor: Error acquiring access token:', error);
          return throwError(() => error);
        })
      );
    } else {
      // For non-API requests, proceed without modification
      return next.handle(req);
    }
  }
}