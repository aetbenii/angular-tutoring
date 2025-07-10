import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-debug',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatExpansionModule,
    MatTabsModule,
    MatIconModule,
    MatSnackBarModule,
    MatChipsModule
  ],
  templateUrl: './debug.component.html',
  styleUrls: ['./debug.component.scss']
})
export class DebugComponent implements OnInit {
  idToken: string | null = null;
  accessToken: string | null = null;
  decodedIdToken: any = null;
  decodedAccessToken: any = null;
  userInfo: any = null;
  isLoading = false;
  environment = environment;

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    await this.loadTokens();
    this.loadUserInfo();
  }

  async loadTokens() {
    this.isLoading = true;
    try {
      console.log('🐛 Debug Component: Loading tokens...');
      
      // Get access token from your AuthService
      this.accessToken = await this.authService.getAccessToken();
      
      // Get user info which contains ID token claims
      const userInfo = this.authService.getUserInfo();
      if (userInfo?.idToken) {
        this.idToken = userInfo.idToken;
      } else {
        // Try to get ID token from idTokenClaims if available
        console.log('🐛 Debug Component: No direct idToken, checking claims...');
      }

      console.log('🐛 Debug Component: ID Token length:', this.idToken?.length || 'null');
      console.log('🐛 Debug Component: Access Token length:', this.accessToken?.length || 'null');

      if (this.idToken) {
        this.decodedIdToken = this.decodeJWT(this.idToken);
        console.log('🐛 Debug Component: Decoded ID Token:', this.decodedIdToken);
      }

      if (this.accessToken) {
        this.decodedAccessToken = this.decodeJWT(this.accessToken);
        console.log('🐛 Debug Component: Decoded Access Token:', this.decodedAccessToken);
      } else {
        console.warn('🐛 Debug Component: Access token is null/undefined');
      }
    } catch (error) {
      console.error('🐛 Debug Component: Error loading tokens:', error);
      this.snackBar.open('Error loading tokens', 'Close', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  loadUserInfo() {
    this.userInfo = this.authService.getUserInfo();
    console.log('🐛 Debug Component: User Info:', this.userInfo);
  }

  async refreshTokens() {
    await this.loadTokens();
    this.loadUserInfo();
    this.snackBar.open('Tokens refreshed', 'Close', { duration: 2000 });
  }

  async checkB2CConfiguration() {
    console.log('🔍 === B2C CONFIGURATION CHECK ===');
    
    // Get current MSAL config
    const config = (this.authService as any).msalService.instance.getConfiguration();
    console.log('🔍 Current MSAL Configuration:', config);
    
    // Check B2C specific settings
    console.log('🔍 B2C Authority Analysis:', {
      authority: config.auth.authority,
      isB2C: config.auth.authority?.includes('b2clogin.com'),
      tenant: config.auth.authority?.match(/https:\/\/(.+?)\.b2clogin\.com/)?.[1],
      policy: config.auth.authority?.split('/').pop()
    });
    
    // Check if we have accounts and what claims they have
    const accounts = (this.authService as any).msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      const account = accounts[0];
      console.log('🔍 Account Authority Type:', account.authorityType);
      console.log('🔍 Account Environment:', account.environment);
      
      if (account.idTokenClaims) {
        console.log('🔍 Available Claims in ID Token:', Object.keys(account.idTokenClaims));
        console.log('🔍 Token Issuer (iss):', account.idTokenClaims['iss']);
        console.log('🔍 Token Audience (aud):', account.idTokenClaims['aud']);
        console.log('🔍 Available Scopes (scp):', account.idTokenClaims['scp']);
        console.log('🔍 App ID (appid):', account.idTokenClaims['appid']);
      }
    }
    
    // Check localStorage for any B2C related entries
    const b2cKeys = Object.keys(localStorage).filter(key => 
      key.includes('b2c') || key.includes('B2C') || key.includes('testb2c01siag')
    );
    console.log('🔍 B2C-related localStorage keys:', b2cKeys);
    
    // Check for user profile
    const userProfile = this.authService.getCurrentUserProfile();
    console.log('🔍 Current User Profile:', userProfile);
    console.log('🔍 Is Admin:', this.authService.isAdmin());
    console.log('🔍 User Roles:', this.authService.getUserRoles());
    
    console.log('🔍 === B2C RECOMMENDATIONS ===');
    console.log('🔍 1. Verify the scope is configured in your B2C App Registration');
    console.log('🔍 2. Check that user_access scope is exposed by your API');
    console.log('🔍 3. Ensure the user has consented to the scope');
    console.log('🔍 4. Verify the App Registration has API permissions configured');
    console.log('🔍 5. Check that /api/auth/profile endpoint is working');
    
    this.snackBar.open('B2C Configuration checked - see console for details', 'Close', { duration: 3000 });
  }

  async checkAPIScopes() {
    console.log('🔍 === API SCOPE VERIFICATION ===');
    
    const expectedScope = environment.msal.apiScope;
    console.log('🔍 Expected scope:', expectedScope);
    
    // Check if we have an account with ID token claims
    const accounts = (this.authService as any).msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      const account = accounts[0];
      if (account.idTokenClaims) {
        console.log('🔍 === ID TOKEN ANALYSIS ===');
        console.log('🔍 Token Audience (aud):', account.idTokenClaims['aud']);
        console.log('🔍 Token Issuer (iss):', account.idTokenClaims['iss']);
        console.log('🔍 Available Scopes (scp):', account.idTokenClaims['scp']);
        console.log('🔍 App ID in token (appid):', account.idTokenClaims['appid']);
        
        // Check if our expected scope appears anywhere in the token
        const tokenString = JSON.stringify(account.idTokenClaims);
        const hasExpectedScope = tokenString.includes('user_access');
        console.log('🔍 Does ID token contain "user_access"?', hasExpectedScope);
        
        if (!hasExpectedScope) {
          console.log('⚠️ WARNING: user_access scope not found in ID token claims');
          console.log('💡 This suggests the scope might not be properly exposed in B2C');
        }
      }
    }
    
    // Test profile endpoint
    try {
      console.log('🔍 === PROFILE ENDPOINT TEST ===');
      console.log('🔍 Testing profile endpoint...');
      
      // Force reload user profile to test the endpoint
      await (this.authService as any).loadUserProfile();
      const profile = this.authService.getCurrentUserProfile();
      
      if (profile) {
        console.log('✅ Profile endpoint working! Profile:', profile);
        console.log('🔍 Profile has isAdmin field:', profile.isAdmin !== undefined);
        console.log('🔍 Profile roles:', profile.roles);
      } else {
        console.log('❌ Profile endpoint returned no data');
      }
    } catch (error) {
      console.log('❌ Profile endpoint test failed:', error);
    }
    
    // Try to make a direct request to the B2C metadata endpoint
    try {
      console.log('🔍 === B2C METADATA CHECK ===');
      const authority = environment.msal.authority;
      const metadataUrl = `${authority}/v2.0/.well-known/openid_configuration`;
      console.log('🔍 Checking B2C metadata at:', metadataUrl);
      
      const response = await fetch(metadataUrl);
      const metadata = await response.json();
      console.log('🔍 B2C Metadata scopes_supported:', metadata.scopes_supported);
      console.log('🔍 B2C Metadata claims_supported:', metadata.claims_supported);
      
      if (metadata.scopes_supported) {
        const hasUserAccessScope = metadata.scopes_supported.some((scope: string) => 
          scope.includes('user_access')
        );
        console.log('🔍 Does B2C metadata support user_access scope?', hasUserAccessScope);
      }
    } catch (error) {
      console.log('🔍 Could not fetch B2C metadata:', error);
    }
    
    console.log('🔍 === MANUAL VERIFICATION STEPS ===');
    console.log('🔍 1. Go to Azure Portal → Azure AD B2C → App registrations');
    console.log('🔍 2. Find app:', environment.msal.clientId);
    console.log('🔍 3. Click "Expose an API"');
    console.log('🔍 4. Verify Application ID URI is set');
    console.log('🔍 5. Verify "user_access" scope is defined and enabled');
    console.log('🔍 6. Check scope format matches exactly:', expectedScope);
    console.log('🔍 7. Verify /api/auth/profile endpoint exists and returns user data');
    
    this.snackBar.open('API Scope verification completed - check console', 'Close', { duration: 3000 });
  }

  async forceReAuthentication() {
    this.snackBar.open('Re-authenticating...', 'Close', { duration: 2000 });
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Error during re-authentication:', error);
      this.snackBar.open('Re-authentication failed - check console', 'Close', { duration: 3000 });
    }
  }

  copyToClipboard(text: string, tokenType: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open(`${tokenType} copied to clipboard`, 'Close', { duration: 2000 });
    });
  }

  formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }

  getTokenExpiration(token: any): string {
    if (!token || !token.exp) return 'N/A';
    const expDate = new Date(token.exp * 1000);
    const now = new Date();
    const isExpired = expDate < now;
    const status = isExpired ? ' (EXPIRED)' : '';
    return expDate.toLocaleString() + status;
  }

  getTokenScopes(token: any): string[] {
    if (!token) return [];
    return token.scp ? token.scp.split(' ') : (token.scope ? token.scope.split(' ') : []);
  }

  getIssuedAt(token: any): string {
    if (!token || !token.iat) return 'N/A';
    return new Date(token.iat * 1000).toLocaleString();
  }

  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }
}