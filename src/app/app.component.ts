import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HeaderComponent } from './components/header/header.component';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    CommonModule
  ],
  template: `
    <div class="app-container">
      <div *ngIf="isInitializing" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Initializing application...</p>
      </div>
      
      <div *ngIf="!isInitializing">
        <app-header *ngIf="isAuthenticated"></app-header>
        <main [class.with-header]="isAuthenticated">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Office Management';
  
  isAuthenticated = false;
  isInitializing = true;
  
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.initializeApp();
    
    // Subscribe to authentication status changes
    this.authService.loginStatus$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(status => {
        this.isAuthenticated = status;
        
        // Handle routing based on authentication status
        if (status) {
          // User is authenticated - redirect to dashboard if on login page
          if (this.router.url === '/login' || this.router.url === '/') {
            this.router.navigate(['/dashboard']);
          }
        } else {
          // User is not authenticated - redirect to login if not already there
          if (!this.router.url.includes('/login')) {
            this.router.navigate(['/login']);
          }
        }
      });
  }

  private async initializeApp(): Promise<void> {
    try {
      await this.authService.waitForInitialization();
      
      // Refresh authentication state to ensure observables are in sync
      this.authService.refreshAuthState();
      
      this.isInitializing = false;
      
      // Initial routing based on authentication status
      if (this.authService.isLoggedIn()) {
        this.isAuthenticated = true;
        // Stay on current route or redirect to dashboard if on login
        if (this.router.url === '/login' || this.router.url === '/') {
          this.router.navigate(['/dashboard']);
        }
      } else {
        this.isAuthenticated = false;
        this.router.navigate(['/login']);
      }
    } catch (error) {
      console.error('App initialization failed:', error);
      this.isInitializing = false;
      this.router.navigate(['/login']);
    }
  }

}
