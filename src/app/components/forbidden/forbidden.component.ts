import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="error-container">
      <mat-card class="error-card">
        <mat-card-content>
          <div class="error-icon">
            <mat-icon>block</mat-icon>
          </div>
          <h1>Access Denied</h1>
          <p>You don't have permission to access this page.</p>
          <p>Please contact your administrator if you believe this is an error.</p>
          <button mat-raised-button color="primary" (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Go Back
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }

    .error-card {
      text-align: center;
      max-width: 400px;
    }

    .error-icon {
      margin-bottom: 20px;
    }

    .error-icon mat-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      color: #f44336;
    }

    h1 {
      color: #f44336;
      margin-bottom: 20px;
    }

    p {
      color: #666;
      margin-bottom: 15px;
    }

    button {
      margin-top: 20px;
    }
  `]
})
export class ForbiddenComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}