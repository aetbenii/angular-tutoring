import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, interval } from 'rxjs';
import { AuthService, UserRole } from '../../auth/auth.service';
import { environment } from '../../../environments/environment';

interface DebugInfo {
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  accountCount?: number;
  hasToken?: boolean;
  userInfo?: unknown;
  profile?: unknown;
  idTokenClaims?: unknown;
  accessToken?: string;
  roles?: UserRole[];
  msalConfig?: unknown;
  allAccounts?: unknown;
  errors?: Array<{ timestamp: Date; message: string; stack?: string }>;
}

@Component({
  selector: 'app-debug',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatExpansionModule,
    MatTabsModule,
    MatIconModule
  ],
  template: `
    <div class="debug-container" *ngIf="!environment.production">
      <mat-card class="debug-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>bug_report</mat-icon>
            Authentication Debug Panel
          </mat-card-title>
          <mat-card-subtitle>
            Development Mode Only - Last Updated: {{ lastUpdate | date:'medium' }}
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div class="debug-actions">
            <button mat-raised-button color="primary" (click)="refreshDebugInfo()">
              <mat-icon>refresh</mat-icon>
              Refresh Debug Info
            </button>
            <button mat-raised-button color="accent" (click)="copyToClipboard()">
              <mat-icon>content_copy</mat-icon>
              Copy Debug Info
            </button>
            <button mat-raised-button 
                    [color]="autoRefresh ? 'warn' : 'basic'" 
                    (click)="toggleAutoRefresh()">
              <mat-icon>{{ autoRefresh ? 'pause' : 'play_arrow' }}</mat-icon>
              {{ autoRefresh ? 'Stop' : 'Start' }} Auto Refresh
            </button>
          </div>

          <mat-tab-group>
            <!-- Authentication Status Tab -->
            <mat-tab label="Auth Status">
              <div class="debug-section">
                <h3>Authentication Status</h3>
                <div class="status-grid">
                  <div class="status-item">
                    <span class="label">Is Authenticated:</span>
                    <span class="value" [class.success]="debugInfo.isAuthenticated" 
                          [class.error]="!debugInfo.isAuthenticated">
                      {{ debugInfo.isAuthenticated ? 'YES' : 'NO' }}
                    </span>
                  </div>
                  <div class="status-item">
                    <span class="label">Is Admin:</span>
                    <span class="value" [class.success]="debugInfo.isAdmin">
                      {{ debugInfo.isAdmin ? 'YES' : 'NO' }}
                    </span>
                  </div>
                  <div class="status-item">
                    <span class="label">Active Accounts:</span>
                    <span class="value">{{ debugInfo.accountCount }}</span>
                  </div>
                  <div class="status-item">
                    <span class="label">Has Token:</span>
                    <span class="value" [class.success]="debugInfo.hasToken">
                      {{ debugInfo.hasToken ? 'YES' : 'NO' }}
                    </span>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- User Info Tab -->
            <mat-tab label="User Info">
              <div class="debug-section">
                <h3>User Information</h3>
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>Basic User Info</mat-panel-title>
                  </mat-expansion-panel-header>
                  <pre class="json-display">{{ debugInfo.userInfo | json }}</pre>
                </mat-expansion-panel>
                
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>User Profile</mat-panel-title>
                  </mat-expansion-panel-header>
                  <pre class="json-display">{{ debugInfo.profile | json }}</pre>
                </mat-expansion-panel>
              </div>
            </mat-tab>

            <!-- Token Claims Tab -->
            <mat-tab label="Token Claims">
              <div class="debug-section">
                <h3>JWT Token Claims</h3>
                <div class="token-info">
                  <div class="token-section">
                    <h4>ID Token Claims</h4>
                    <pre class="json-display">{{ debugInfo.idTokenClaims | json }}</pre>
                  </div>
                  
                  <div class="token-section" *ngIf="debugInfo.accessToken">
                    <h4>Access Token Preview</h4>
                    <div class="token-preview">
                      <strong>Token (First 50 chars):</strong>
                      <code>{{ debugInfo.accessToken.substring(0, 50) }}...</code>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- Roles & Permissions Tab -->
            <mat-tab label="Roles & Permissions">
              <div class="debug-section">
                <h3>User Roles & Permissions</h3>
                <div class="roles-section">
                  <div class="role-list">
                    <h4>Roles ({{ (debugInfo.roles || []).length }})</h4>
                    <div class="role-items">
                      <mat-card *ngFor="let role of (debugInfo.roles || [])" class="role-card">
                        <mat-card-header>
                          <mat-card-title>{{ role.name }}</mat-card-title>
                        </mat-card-header>
                        <mat-card-content>
                          <div class="permissions-list">
                            <strong>Permissions:</strong>
                            <ul>
                              <li *ngFor="let permission of role.permissions">
                                {{ permission }}
                              </li>
                            </ul>
                          </div>
                        </mat-card-content>
                      </mat-card>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- MSAL Internal State Tab -->
            <mat-tab label="MSAL State">
              <div class="debug-section">
                <h3>MSAL Internal State</h3>
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>MSAL Configuration</mat-panel-title>
                  </mat-expansion-panel-header>
                  <pre class="json-display">{{ debugInfo.msalConfig | json }}</pre>
                </mat-expansion-panel>
                
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>All Accounts</mat-panel-title>
                  </mat-expansion-panel-header>
                  <pre class="json-display">{{ debugInfo.allAccounts | json }}</pre>
                </mat-expansion-panel>
              </div>
            </mat-tab>

            <!-- Error Log Tab -->
            <mat-tab label="Error Log">
              <div class="debug-section">
                <h3>Recent Errors</h3>
                <div class="error-log">
                  <div *ngFor="let error of (debugInfo.errors || [])" class="error-item">
                    <div class="error-timestamp">{{ error.timestamp | date:'medium' }}</div>
                    <div class="error-message">{{ error.message }}</div>
                    <div class="error-stack" *ngIf="error.stack">
                      <pre>{{ error.stack }}</pre>
                    </div>
                  </div>
                  <div *ngIf="(debugInfo.errors || []).length === 0" class="no-errors">
                    No recent errors logged.
                  </div>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>

    <!-- Production Warning -->
    <div class="production-warning" *ngIf="environment.production">
      <mat-card class="warning-card">
        <mat-card-content>
          <h2>⚠️ Debug Component Disabled</h2>
          <p>The debug component is automatically disabled in production builds for security reasons.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .debug-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .debug-card {
      margin-bottom: 20px;
    }

    .debug-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .debug-section {
      padding: 16px;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .label {
      font-weight: 500;
    }

    .value {
      font-family: monospace;
      font-weight: bold;
    }

    .value.success {
      color: #4caf50;
    }

    .value.error {
      color: #f44336;
    }

    .json-display {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.4;
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
    }

    .token-section {
      margin-bottom: 20px;
    }

    .token-preview {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      margin-top: 8px;
    }

    .role-card {
      margin-bottom: 16px;
    }

    .permissions-list ul {
      margin: 8px 0;
      padding-left: 20px;
    }

    .error-log {
      max-height: 400px;
      overflow-y: auto;
    }

    .error-item {
      border: 1px solid #f44336;
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 12px;
      background: #ffebee;
    }

    .error-timestamp {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .error-message {
      font-weight: 500;
      color: #f44336;
      margin-bottom: 8px;
    }

    .error-stack {
      font-family: monospace;
      font-size: 11px;
      color: #333;
    }

    .no-errors {
      text-align: center;
      color: #666;
      font-style: italic;
    }

    .production-warning {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }

    .warning-card {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
    }
  `]
})
export class DebugComponent implements OnInit, OnDestroy {
  environment = environment;
  debugInfo: DebugInfo = {};
  lastUpdate: Date = new Date();
  autoRefresh = false;
  private subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (!environment.production) {
      this.loadDebugInfo();
      
      // Subscribe to auth service changes
      this.subscription.add(
        this.authService.loginStatus$.subscribe(() => {
          this.loadDebugInfo();
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  async loadDebugInfo(): Promise<void> {
    try {
      const userInfo = this.authService.getUserInfo();
      const profile = this.authService.getCurrentUserProfile();
      const accessToken = await this.authService.getAccessToken();
      
      this.debugInfo = {
        // Authentication Status
        isAuthenticated: this.authService.isLoggedIn(),
        isAdmin: this.authService.isAdmin(),
        accountCount: this.authService['msalService'].instance.getAllAccounts().length,
        hasToken: !!accessToken,
        
        // User Information
        userInfo: userInfo,
        profile: profile,
        
        // Token Information
        idTokenClaims: userInfo?.idTokenClaims,
        accessToken: accessToken || undefined,
        
        // Roles & Permissions
        roles: this.authService.getUserRoles(),
        
        // MSAL Internal State
        msalConfig: this.authService['msalService'].instance.getConfiguration(),
        allAccounts: this.authService['msalService'].instance.getAllAccounts(),
        
        // Error Log (you can implement error tracking)
        errors: this.getRecentErrors()
      };
      
      this.lastUpdate = new Date();
    } catch (error) {
      console.error('Error loading debug info:', error);
      this.debugInfo.errors = this.debugInfo.errors || [];
      this.debugInfo.errors.unshift({
        timestamp: new Date(),
        message: 'Failed to load debug info',
        stack: error instanceof Error ? error.stack : String(error)
      });
    }
  }

  refreshDebugInfo(): void {
    this.loadDebugInfo();
    this.snackBar.open('Debug info refreshed', 'Close', { duration: 2000 });
  }

  copyToClipboard(): void {
    const debugData = JSON.stringify(this.debugInfo, null, 2);
    navigator.clipboard.writeText(debugData).then(() => {
      this.snackBar.open('Debug info copied to clipboard', 'Close', { duration: 2000 });
    });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    
    if (this.autoRefresh) {
      this.subscription.add(
        interval(5000).subscribe(() => {
          this.loadDebugInfo();
        })
      );
      this.snackBar.open('Auto refresh enabled (5s interval)', 'Close', { duration: 2000 });
    } else {
      this.snackBar.open('Auto refresh disabled', 'Close', { duration: 2000 });
    }
  }

  private getRecentErrors(): Array<{ timestamp: Date; message: string; stack?: string }> {
    // Implement error tracking if needed
    // This could be connected to a global error handler
    return [];
  }
}