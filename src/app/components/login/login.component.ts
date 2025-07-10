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
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);

  login(): void {
    this.authService.login();
  }
} 