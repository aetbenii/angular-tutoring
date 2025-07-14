import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  constructor(
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unexpected error occurred';
        
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Error: ${error.error.message}`;
        } else {
          // Server-side error
          switch (error.status) {
            case 401:
              errorMessage = 'Session expired. Please login again.';
              // Trigger logout and redirect to login
              this.authService.logout().then(() => {
                this.router.navigate(['/login']);
              });
              break;
            case 403:
              errorMessage = 'You do not have permission to perform this action.';
              break;
            case 404:
              errorMessage = 'The requested resource was not found.';
              break;
            case 500:
              errorMessage = 'Server error. Please try again later.';
              break;
            case 0:
              errorMessage = 'Unable to connect to the server. Please check your internet connection.';
              break;
            default:
              errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
          }
        }

        // Don't show error for certain cases
        // Skip showing errors for auth-related endpoints to avoid duplicate messages
        const skipErrorDisplay = req.url.includes('/api/auth/') || req.url.includes('/login');
        
        if (!skipErrorDisplay) {
          // Display error message to user
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }

        // Log error for debugging
        console.error('HTTP Error:', {
          status: error.status,
          message: errorMessage,
          url: error.url,
          error: error.error
        });

        // Re-throw the error so components can handle it if needed
        return throwError(() => error);
      })
    );
  }
}