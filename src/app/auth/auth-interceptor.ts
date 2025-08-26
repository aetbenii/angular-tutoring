import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { isDevelopment } from './auth.config';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  
  constructor(private authService: AuthService) {
    if (isDevelopment) console.log('🔐 AuthInterceptor: CONSTRUCTOR CALLED - Interceptor is registered');
  }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (isDevelopment) console.log('🔐 AuthInterceptor: INTERCEPTING REQUEST:', req.url);
    // Check if this is an API request that needs authentication
    if (req.url.includes('/api/')) {
      if (isDevelopment) console.log('🔐 AuthInterceptor: API request detected:', req.url);
      if (isDevelopment) console.log('🔐 AuthInterceptor: Request headers:', req.headers.keys());
      return from(this.authService.getAccessToken()).pipe(
        switchMap(accessToken => {
          if (accessToken) {
            if (isDevelopment) console.log('🔐 AuthInterceptor: Adding Bearer token to request');
            // Clone the request and add the authorization header
            const authReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${accessToken}`
              }
            });
            return next.handle(authReq);
          } else {
            console.warn('🔐 AuthInterceptor: No access token available for API request');
            // Return 401 error instead of proceeding without token
            return throwError(() => new Error('No access token available'));
          }
        }),
        catchError(error => {
          console.error('🔐 AuthInterceptor: Error acquiring access token:', error);
          // Return error instead of proceeding without token
          return throwError(() => error);
        })
      );
    } else {
      // For non-API requests, proceed without modification
      return next.handle(req);
    }
  }
} 