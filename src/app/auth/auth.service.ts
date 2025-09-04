import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { BehaviorSubject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { loginRequest, accessTokenRequest, apiScope } from './msal/msal.config';
import { ProfileService, UserProfile } from '../services/profile.service';
import { environment } from '../../environments/environment';

const isDevelopment = !environment.production;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loginStatusSubject = new BehaviorSubject<boolean>(false);
  public loginStatus$ = this.loginStatusSubject.asObservable();
  
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public userProfile$ = this.userProfileSubject.asObservable();
  
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;

  constructor(private msalService: MsalService, private router: Router, private profileService: ProfileService) {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.msalService.instance.initialize().then(() => {
      this.isInitialized = true;
      if (isDevelopment) console.log('✅ MSAL initialized successfully');
      
      // Handle redirect result if coming back from B2C
      return this.msalService.instance.handleRedirectPromise();
    }).then(async (result) => {
      if (result) {
        if (isDevelopment) console.log('✅ Redirect result processed:', result);
        this.loginStatusSubject.next(true);
        // Try to acquire initial access token
        await this.acquireInitialTokens();
        // Fetch user profile with roles
        await this.fetchUserProfile();
        // Redirect to dashboard after successful login
        this.redirectToDashboard();
      } else {
        // Check initial login status after initialization
        this.checkLoginStatus();
        // If already logged in, try to acquire tokens and fetch profile
        if (this.isLoggedIn()) {
          await this.acquireInitialTokens();
          await this.fetchUserProfile();
        }
      }
    }).catch((error) => {
      console.error('❌ MSAL initialization failed:', error);
      this.isInitialized = false;
    });

    return this.initializationPromise;
  }

  async login(): Promise<void> {
    try {
      // Ensure MSAL is initialized before attempting login
      await this.initializeAuth();
      
      if (!this.isInitialized) {
        throw new Error('MSAL not properly initialized');
      }

      // Use redirect instead of popup
      await this.msalService.loginRedirect(loginRequest);
      // Note: loginRedirect doesn't return a result as it redirects the page
      // The result will be handled by handleRedirectPromise on page load
    } catch (error) {
      console.error('❌ Login redirect failed', error);
      this.loginStatusSubject.next(false);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.initializeAuth();
      
      if (!this.isInitialized) {
        throw new Error('MSAL not properly initialized');
      }

      // Use redirect logout instead of popup
      await this.msalService.logoutRedirect({
        postLogoutRedirectUri: window.location.origin
      });
      this.loginStatusSubject.next(false);
      this.userProfileSubject.next(null);
    } catch (error) {
      console.error('❌ Logout failed', error);
      throw error;
    }
  }

  isLoggedIn(): boolean {
    if (!this.isInitialized) {
      return false;
    }
    return this.msalService.instance.getAllAccounts().length > 0;
  }

  async getAccessToken(): Promise<string | null> {
    if (isDevelopment) console.log('🐛 getAccessToken() called');
    
    if (!this.isInitialized) {
      console.warn('🔐 MSAL not initialized yet');
      return null;
    }
    
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) {
      console.warn('🔐 No accounts found');
      return null;
    }

    const account = accounts[0];
    if (isDevelopment) console.log('🐛 Found account:', account.username);
    
    // Set active account (recommended by MSAL)
    try {
      this.msalService.instance.setActiveAccount(account);
      if (isDevelopment) console.log('🐛 Active account set successfully');
    } catch (error) {
      if (isDevelopment) console.log('🐛 Warning: Could not set active account:', error);
    }
    
    // Follow MSAL docs pattern exactly
    const tokenRequest = {
      scopes: [apiScope],
      account: account
    };
    
    if (isDevelopment) console.log('🐛 Token request (MSAL docs pattern):', tokenRequest);
    
    try {
      const response = await this.msalService.instance.acquireTokenSilent(tokenRequest);
      const accessToken = response.accessToken;
      if (isDevelopment) console.log('✅ Access token acquired successfully');
      if (isDevelopment) console.log('🐛 Token details:', {
        scopes: response.scopes,
        expiresOn: response.expiresOn,
        accessTokenLength: accessToken?.length || 0
      });
      return accessToken;
    } catch (error) {
      console.error('❌ Failed to acquire access token silently:', error);
      if (isDevelopment) console.log('🐛 Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        errorCode: (error as Record<string, unknown>)['errorCode'],
        errorDesc: (error as Record<string, unknown>)['errorDesc']
      });
      
      // If silent acquisition fails, try interactive acquisition
      try {
        if (isDevelopment) console.log('🔄 Attempting interactive token acquisition...');
        const interactiveRequest = {
          scopes: [apiScope]
        };
        await this.msalService.instance.acquireTokenRedirect(interactiveRequest);
        return null; // Redirect will handle the result
      } catch (interactiveError) {
        console.error('❌ Interactive token acquisition also failed:', interactiveError);
        return null;
      }
    }
  }

  getIdToken(): string | null {
    if (!this.isInitialized) {
      return null;
    }
    
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      const account = accounts[0];
      return account.idToken || null;
    }
    return null;
  }

  getUserInfo() {
    if (!this.isInitialized) {
      return null;
    }
    
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      return accounts[0];
    }
    return null;
  }

  private checkLoginStatus(): void {
    const isLoggedIn = this.isLoggedIn();
    if (isDevelopment) console.log('🔐 Checking login status:', isLoggedIn);
    this.loginStatusSubject.next(isLoggedIn);
  }

  // Public method to check if MSAL is initialized
  async waitForInitialization(): Promise<void> {
    return this.initializeAuth();
  }

  // Method to get all tokens for debugging
  async getAllTokens(): Promise<{ idToken: string | null, accessToken: string | null }> {
    if (isDevelopment) console.log('🐛 Auth Service: getAllTokens() called');
    
    // First check what's in the cache
    this.debugCacheContents();
    
    const idToken = this.getIdToken();
    if (isDevelopment) console.log('🐛 Auth Service: ID Token retrieved:', idToken ? 'Present' : 'null');
    
    const accessToken = await this.getAccessToken();
    if (isDevelopment) console.log('🐛 Auth Service: Access Token retrieved:', accessToken ? 'Present' : 'null');
    
    const result = { idToken, accessToken };
    if (isDevelopment) console.log('🐛 Auth Service: Returning tokens:', result);
    return result;
  }

  // Helper method to debug cache contents
  private debugCacheContents(): void {
    try {
      const accounts = this.msalService.instance.getAllAccounts();
      if (accounts.length > 0) {
        const account = accounts[0];
        if (isDevelopment) console.log('🐛 Cache Debug - Account ID:', account.homeAccountId);
        
        // Check localStorage for any cached tokens
        const cacheKeys = Object.keys(localStorage).filter(key => 
          key.includes(account.homeAccountId) && 
          (key.includes('AccessToken') || key.includes('RefreshToken'))
        );
        
        if (isDevelopment) console.log('🐛 Cache Debug - Found cache keys:', cacheKeys);
        
        cacheKeys.forEach(key => {
          const cacheEntry = localStorage.getItem(key);
          if (cacheEntry) {
            try {
              const parsed = JSON.parse(cacheEntry);
              if (isDevelopment) console.log(`🐛 Cache Debug - ${key}:`, {
                credentialType: parsed.credentialType,
                target: parsed.target,
                expiresOn: parsed.expiresOn,
                hasSecret: !!parsed.secret
              });
            } catch {
              if (isDevelopment) console.log(`🐛 Cache Debug - ${key}: (unparseable)`);
            }
          }
        });
      }
    } catch (error) {
      if (isDevelopment) console.log('🐛 Cache Debug - Error inspecting cache:', error);
    }
  }

  // Method to decode JWT token
  decodeJWT(token: string): Record<string, unknown> | null {
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

  // Debug method to inspect token cache
  debugTokenCache(): void {
    if (!this.isInitialized) {
      if (isDevelopment) console.log('🔐 MSAL not initialized');
      return;
    }

    const accounts = this.msalService.instance.getAllAccounts();
    if (isDevelopment) console.log('🔐 Accounts in cache:', accounts.length);
    
    accounts.forEach((account, index) => {
      if (isDevelopment) console.log(`🔐 Account ${index}:`, {
        username: account.username,
        name: account.name,
        localAccountId: account.localAccountId,
        homeAccountId: account.homeAccountId,
        environment: account.environment,
        tenantId: account.tenantId,
        idTokenClaims: account.idTokenClaims
      });
    });

    // Try to directly check what tokens are available
    if (accounts.length > 0) {
      const account = accounts[0];
      
      // Check for access tokens in cache
      try {
        const cacheManager = (this.msalService.instance as unknown as Record<string, unknown>)['cacheManager'];
        if (cacheManager) {
          if (isDevelopment) console.log('🔐 Checking cache manager for tokens...');
          
          // Try to get access token from cache directly
          const accessTokenKey = ((cacheManager as Record<string, unknown>)['generateAccessTokenKey'] as (params: unknown) => string)({
            authority: accessTokenRequest.scopes[0],
            clientId: this.msalService.instance.getConfiguration().auth.clientId,
            scopes: accessTokenRequest.scopes,
            homeAccountId: account.homeAccountId
          });
          
          if (isDevelopment) console.log('🔐 Access token cache key would be:', accessTokenKey);
        }
      } catch (error) {
        if (isDevelopment) console.log('🔐 Could not access internal cache manager:', error);
      }
      
      // Also check localStorage directly
      const localStorageKeys = Object.keys(localStorage).filter(key => 
        key.includes('AccessToken') || key.includes('msal')
      );
      if (isDevelopment) console.log('🔐 MSAL-related localStorage keys:', localStorageKeys);
      
      localStorageKeys.forEach(key => {
        if (key.includes('AccessToken')) {
          if (isDevelopment) console.log(`🔐 ${key}:`, localStorage.getItem(key));
        }
      });
    }
  }

  // Method to force token acquisition on login
  async acquireInitialTokens(): Promise<void> {
    if (!this.isInitialized) {
      console.warn('🔐 MSAL not initialized, cannot acquire tokens');
      return;
    }

    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) {
      console.warn('🔐 No accounts found, cannot acquire tokens');
      return;
    }

    try {
      const account = accounts[0];
      if (isDevelopment) console.log('🔐 Acquiring initial access token for:', account.username);
      
      // Use exact MSAL docs pattern
      const tokenRequest = {
        scopes: [apiScope],
        account: account
      };
      
      await this.msalService.instance.acquireTokenSilent(tokenRequest);
      if (isDevelopment) console.log('✅ Initial access token acquired successfully');
    } catch (error) {
      console.warn('⚠️ Could not acquire initial access token silently:', error);
      if (isDevelopment) console.log('🔄 This is normal on first login - token will be acquired when needed');
    }
  }

  // Enhanced debugging method for MSAL and B2C troubleshooting
  async testMSALPattern(): Promise<string | null> {
    if (isDevelopment) console.log('🧪 === COMPREHENSIVE MSAL B2C ACCESS TOKEN DEBUG ===');
    
    if (!this.isInitialized) {
      if (isDevelopment) console.log('🧪 ❌ MSAL not initialized');
      return null;
    }

    const accounts = this.msalService.instance.getAllAccounts();
    if (isDevelopment) console.log('🧪 📊 Total accounts found:', accounts.length);
    
    if (accounts.length === 0) {
      if (isDevelopment) console.log('🧪 ❌ No accounts found - user needs to login first');
      return null;
    }

    const account = accounts[0];
    if (isDevelopment) console.log('🧪 👤 Account Details:', {
      username: account.username,
      name: account.name,
      localAccountId: account.localAccountId,
      homeAccountId: account.homeAccountId,
      environment: account.environment,
      tenantId: account.tenantId,
      authorityType: account.authorityType,
      idTokenClaims: account.idTokenClaims
    });

    // Check what scopes are available in the ID token
    if (account.idTokenClaims) {
      if (isDevelopment) console.log('🧪 🎫 ID Token Claims:', account.idTokenClaims);
      if (isDevelopment) console.log('🧪 🎯 ID Token Scopes (scp):', account.idTokenClaims['scp']);
      if (isDevelopment) console.log('🧪 🎯 ID Token Audience (aud):', account.idTokenClaims['aud']);
    }

    // Try setting active account first (MSAL recommendation)
    try {
      this.msalService.instance.setActiveAccount(account);
      if (isDevelopment) console.log('🧪 ✅ Active account set successfully');
    } catch (error) {
      if (isDevelopment) console.log('🧪 ⚠️ Warning: Could not set active account:', error);
    }

    // Get current MSAL configuration for debugging
    const config = this.msalService.instance.getConfiguration();
    if (isDevelopment) console.log('🧪 ⚙️ MSAL Configuration:', {
      clientId: config.auth.clientId,
      authority: config.auth.authority,
      knownAuthorities: config.auth.knownAuthorities,
      redirectUri: config.auth.redirectUri
    });

    // Test different scope variations
    const scopeVariations = [
      // Original scope
      [apiScope],
      // Just the scope name
      ['user_access'],
      // With openid
      [apiScope, 'openid'],
      // Client ID as scope (sometimes needed for B2C)
      [config.auth.clientId],
      // API identifier
      [`api://${config.auth.clientId}/api.read`]
    ];

    for (let i = 0; i < scopeVariations.length; i++) {
      const scopes = scopeVariations[i];
      if (isDevelopment) console.log(`🧪 🔍 Test ${i + 1}: Trying scopes:`, scopes);

      const tokenRequest = {
        scopes: scopes,
        account: account,
        forceRefresh: false // Try cached first
      };

      try {
        if (isDevelopment) console.log(`🧪 📤 Test ${i + 1}: Calling acquireTokenSilent with:`, tokenRequest);
        const response = await this.msalService.instance.acquireTokenSilent(tokenRequest);
        
        if (isDevelopment) console.log(`🧪 ✅ Test ${i + 1} SUCCESS! Response:`, {
          accessToken: response.accessToken ? `${response.accessToken.substring(0, 50)}...` : 'null',
          accessTokenLength: response.accessToken?.length || 0,
          scopes: response.scopes,
          expiresOn: response.expiresOn,
          account: response.account?.username,
          tokenType: response.tokenType,
          correlationId: response.correlationId
        });

        // Decode the access token to see what's inside
        if (response.accessToken) {
          const decodedToken = this.decodeJWT(response.accessToken);
          if (isDevelopment) console.log(`🧪 🔓 Test ${i + 1} Decoded Access Token:`, decodedToken);
        }

        return response.accessToken;
      } catch (error: unknown) {
        const errorRecord = error as Record<string, unknown>;
        if (isDevelopment) console.log(`🧪 ❌ Test ${i + 1} failed:`, {
          name: (error as Error).name,
          message: (error as Error).message,
          errorCode: errorRecord['errorCode'],
          errorDesc: errorRecord['errorDesc'],
          subError: errorRecord['subError'],
          correlationId: errorRecord['correlationId']
        });

        // Check if it's a specific B2C error
        if (errorRecord['errorCode'] === 'invalid_scope') {
          if (isDevelopment) console.log(`🧪 💡 Test ${i + 1} - Invalid scope error. This scope might not be configured in B2C.`);
        } else if (errorRecord['errorCode'] === 'consent_required') {
          if (isDevelopment) console.log(`🧪 💡 Test ${i + 1} - Consent required. User needs to consent to this scope.`);
        } else if (errorRecord['errorCode'] === 'interaction_required') {
          if (isDevelopment) console.log(`🧪 💡 Test ${i + 1} - Interaction required. May need interactive login.`);
        }
      }
    }

    // Try with force refresh
    if (isDevelopment) console.log('🧪 🔄 Final test: Force refresh token acquisition...');
    try {
      const forceRefreshRequest = {
        scopes: [apiScope],
        account: account,
        forceRefresh: true
      };

      const response = await this.msalService.instance.acquireTokenSilent(forceRefreshRequest);
      if (isDevelopment) console.log('🧪 ✅ Force refresh SUCCESS:', {
        accessTokenLength: response.accessToken?.length || 0,
        scopes: response.scopes
      });
      return response.accessToken;
    } catch (error) {
      if (isDevelopment) console.log('🧪 ❌ Force refresh failed:', error);
    }

    if (isDevelopment) console.log('🧪 ❌ All tests failed - no access token could be acquired');
    if (isDevelopment) console.log('🧪 💡 RECOMMENDATION: User may need to re-login with updated scopes');
    if (isDevelopment) console.log('🧪 💡 Try logging out and logging back in to consent to all scopes');
    return null;
  }

  // Method to force re-authentication with all scopes
  async forceReAuthentication(): Promise<void> {
    if (isDevelopment) console.log('🔄 Forcing re-authentication with updated scopes...');
    
    try {
      // Logout first to clear any cached consent
      await this.logout();
      
      // Wait a moment for logout to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Login again with all scopes
      await this.login();
      
      if (isDevelopment) console.log('✅ Re-authentication completed');
    } catch (error) {
      console.error('❌ Re-authentication failed:', error);
    }
  }

  // Method to fetch user profile from API
  private async fetchUserProfile(): Promise<void> {
    try {
      if (isDevelopment) console.log('📋 Fetching user profile...');
      // Wait a moment to ensure access token is available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const profile = await this.profileService.getUserProfile().pipe(
        catchError(error => {
          console.error('❌ Error fetching user profile:', error);
          throw error;
        })
      ).toPromise();
      
      if (profile) {
        this.userProfileSubject.next(profile);
        if (isDevelopment) console.log('✅ User profile fetched:', profile);
      }
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      // Don't throw error to prevent breaking the login flow
      // User will still be logged in but without role information
    }
  }

  // Method to check if user has admin role
  isAdmin(): boolean {
    const profile = this.getUserProfile();
    return profile?.isAdmin || false;
  }

  // Method to check if user has specific role
  hasRole(role: string): boolean {
    const profile = this.getUserProfile();
    return profile?.roles?.includes(role) || false;
  }

  // Method to redirect to dashboard after successful login
  private redirectToDashboard(): void {
    // Only redirect if not already on dashboard or if on login page
    const currentUrl = this.router.url;
    if (currentUrl === '/login' || currentUrl === '/' || currentUrl.includes('/auth')) {
      if (isDevelopment) console.log('🔄 Redirecting to dashboard after login');
      this.router.navigate(['/dashboard']);
    }
  }

  // Get current user profile
  getCurrentUserProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  // Alias for getCurrentUserProfile()
  getUserProfile(): UserProfile | null {
    return this.getCurrentUserProfile();
  }

  // Get user roles from profile
  getUserRoles(): string[] {
    const profile = this.getCurrentUserProfile();
    return profile?.roles || [];
  }

  // Public method to load user profile (alias for fetchUserProfile)
  async loadUserProfile(): Promise<void> {
    return this.fetchUserProfile();
  }

  // Public method to refresh authentication state
  async refreshAuthState(): Promise<void> {
    await this.initializeAuth();
    this.checkLoginStatus();
    if (this.isLoggedIn()) {
      await this.acquireInitialTokens();
      await this.fetchUserProfile();
    }
  }
} 