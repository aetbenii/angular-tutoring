import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <h1>Login Required</h1>
      <p>You need to authenticate to access this application.</p>
      <button (click)="login()" class="btn-login" [disabled]="isLoading">
        {{ isLoading ? 'Logging in...' : 'Login with Azure B2C' }}
      </button>
    </div>
  `,
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  isLoading = false;

  async login(): Promise<void> {
    this.isLoading = true;
    
    try {
      await this.authService.login();
      
      // Note: With redirect authentication, the user will be redirected to B2C
      // and then back to the app. The code below won't execute since the page
      // will redirect. The app.component.ts will handle the redirect after
      // successful authentication.
      
    } catch (error) {
      console.error('Login failed:', error);
      this.isLoading = false;
    }
  }
} 