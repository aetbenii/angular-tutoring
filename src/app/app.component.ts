import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
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
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    main {
      flex: 1;
      background-color: #f5f5f5;
    }

    main.with-header {
      padding: 0 2rem;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Office Management';
  
  isAuthenticated = false;
  isInitializing = true;
  
  private authService = inject(AuthService);
  private router = inject(Router);
  private subscription = new Subscription();

  ngOnInit(): void {
    this.initializeApp();
    
    // Subscribe to authentication status changes
    this.subscription.add(
      this.authService.loginStatus$.subscribe(status => {
        this.isAuthenticated = status;
        
        // Redirect to login if not authenticated and not already on login page
        if (!status && !this.router.url.includes('/login')) {
          this.router.navigate(['/login']);
        }
      })
    );
  }

  private async initializeApp(): Promise<void> {
    try {
      await this.authService.waitForInitialization();
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

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
