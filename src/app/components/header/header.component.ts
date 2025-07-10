import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { LogoComponent } from '../shared/logo/logo.component';
import { AuthService, UserProfile } from '../../auth/auth.service';
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
    MatMenuModule,
    MatDividerModule,
    RouterModule,
    LogoComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/employees', label: 'Employees' },
    { path: '/offices', label: 'Offices' },
    { path: '/floor-plans', label: 'Office assignments' },
    { path: '/floor-map', label: 'Floor Maps' }
  ];

  userProfile: UserProfile | null = null;
  isAuthenticated = false;
  environment = environment;
  
  private subscription = new Subscription();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Subscribe to authentication status
    this.subscription.add(
      this.authService.loginStatus$.subscribe(status => {
        this.isAuthenticated = status;
      })
    );

    // Subscribe to user profile changes
    this.subscription.add(
      this.authService.userProfile$.subscribe(profile => {
        this.userProfile = profile;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  getUserDisplayName(): string {
    if (!this.userProfile) return 'User';
    return this.userProfile.displayName || this.userProfile.email || 'User';
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
} 