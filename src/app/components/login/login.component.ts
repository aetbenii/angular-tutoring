import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <h1>Login Required</h1>
      <p>You need to authenticate to access this application.</p>
      <button (click)="login()" class="btn-login">Login with Azure B2C</button>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      padding: 2rem;
    }
    
    h1 {
      color: #1976d2;
      margin-bottom: 1rem;
    }
    
    p {
      margin-bottom: 2rem;
      color: #666;
    }
    
    .btn-login {
      background-color: #1976d2;
      color: white;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      transition: background-color 0.2s;
    }
    
    .btn-login:hover {
      background-color: #1565c0;
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);

  login(): void {
    this.authService.login();
  }
} 