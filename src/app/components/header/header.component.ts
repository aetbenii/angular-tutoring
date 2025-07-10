import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LogoComponent } from '../shared/logo/logo.component';
import { AuthService } from '../../auth/auth.service';
import { AccountInfo } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule, 
    MatToolbarModule, 
    MatTabsModule, 
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    RouterModule,
    LogoComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  // Authentication state
  isAuthenticated = false;
  userInfo: AccountInfo | null = null;
  displayName = '';
  isAdmin = false;
  environment = environment;

  navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/employees', label: 'Employees' },
    { path: '/floor-plans', label: 'Office assignments' },
    { path: '/floor-map', label: 'Floor Plan' }
  ];

  async ngOnInit(): Promise<void> {
    // Wait for auth initialization
    await this.authService.waitForInitialization();
    
    // Subscribe to authentication status changes
    this.authService.loginStatus$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(status => {
        console.log('🔐 Header: Login status changed:', status);
        this.isAuthenticated = status;
        if (status) {
          this.userInfo = this.authService.getUserInfo();
          this.displayName = this.getUserDisplayName();
          this.isAdmin = this.checkIsAdmin();
          console.log('🔐 Header: Initial admin status:', this.isAdmin);
        } else {
          this.userInfo = null;
          this.displayName = '';
          this.isAdmin = false;
        }
      });
    
    // Subscribe to user profile changes to update admin status
    this.authService.userProfile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(profile => {
        console.log('🔐 Header: User profile changed:', profile);
        if (profile && this.isAuthenticated) {
          this.isAdmin = this.checkIsAdmin();
          console.log('🔐 Header: Updated admin status:', this.isAdmin);
        }
      });
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  private getUserDisplayName(): string {
    if (!this.userInfo) return '';
    
    const claims = this.userInfo.idTokenClaims as Record<string, unknown>;
    if (claims) {
      if (claims['given_name'] && claims['family_name']) {
        return `${claims['given_name']} ${claims['family_name']}`;
      }
      if (claims['name']) {
        return claims['name'] as string;
      }
      if (claims['preferred_username']) {
        return claims['preferred_username'] as string;
      }
    }
    
    return this.userInfo.username || 'User';
  }

  private checkIsAdmin(): boolean {
    // Use enhanced admin checking that includes token claims and backend profile
    const isAdmin = this.authService.isAdmin();
    console.log('🔐 Header: Checking admin status:', {
      isAdmin,
      userProfile: this.authService.getCurrentUserProfile(),
      userInfo: this.userInfo
    });
    return isAdmin;
  }
} 