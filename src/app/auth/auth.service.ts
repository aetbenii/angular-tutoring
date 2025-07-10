import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { loginRequest, silentRequest } from './msal/msal.config';
import { isDevelopment } from './auth.config';
import { ProfileService, UserProfile as BackendUserProfile } from '../services/profile.service';
import { B2CTokenClaims, isB2CTokenClaims } from './b2c-token.interface';

export interface UserRole {
  name: string;
  permissions: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  isAdmin?: boolean;
  backendProfile?: BackendUserProfile;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly _destroying$ = new BehaviorSubject<boolean>(false);
  private readonly _loginStatus$ = new BehaviorSubject<boolean>(false);
  private readonly _userProfile$ = new BehaviorSubject<UserProfile | null>(null);
  private readonly _isInitialized$ = new BehaviorSubject<boolean>(false);

  public readonly loginStatus$ = this._loginStatus$.asObservable();
  public readonly userProfile$ = this._userProfile$.asObservable();
  public readonly isInitialized$ = this._isInitialized$.asObservable();

  constructor(
    private msalService: MsalService,
    private http: HttpClient,
    private router: Router,
    private profileService: ProfileService
  ) {
    this.initializeAuthService();
  }

  private initializeAuthService(): void {
    if (isDevelopment) console.log('🔐 AuthService: Initializing...');
    
    // Wait for MSAL initialization
    this.msalService.instance.initialize().then(() => {
      if (isDevelopment) console.log('🔐 AuthService: MSAL initialized');
      
      // Check if user is already logged in
      this.checkInitialAuthState();
      
      // Subscribe to MSAL events
      this.setupMsalEventHandlers();
      
      this._isInitialized$.next(true);
    }).catch(error => {
      console.error('🔐 AuthService: MSAL initialization failed:', error);
      this._isInitialized$.next(true); // Still mark as initialized to prevent hanging
    });
  }

  private checkInitialAuthState(): void {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      this._loginStatus$.next(true);
      this.loadUserProfile();
    } else {
      this._loginStatus$.next(false);
    }
  }

  private setupMsalEventHandlers(): void {
    // Handle successful login - listen for account changes
    this.msalService.instance.getActiveAccount();
    // We'll check login status when needed instead of listening to inProgress$
  }

  private setLoginStatus(): void {
    const accounts = this.msalService.instance.getAllAccounts();
    this._loginStatus$.next(accounts.length > 0);
    
    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      this.loadUserProfile();
    }
  }

  async waitForInitialization(): Promise<void> {
    if (this._isInitialized$.value) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const subscription = this.isInitialized$.subscribe(isInitialized => {
        if (isInitialized) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });
  }

  async login(): Promise<void> {
    console.log('🔐 AuthService: Starting login...');
    
    try {
      const response = await this.msalService.instance.loginPopup(loginRequest);
      console.log('🔐 AuthService: Login successful', response);
      
      this.msalService.instance.setActiveAccount(response.account);
      this._loginStatus$.next(true);
      await this.loadUserProfile();
      
    } catch (error) {
      console.error('🔐 AuthService: Login failed', error);
      this._loginStatus$.next(false);
      throw error;
    }
  }

  async logout(): Promise<void> {
    console.log('🔐 AuthService: Logging out...');
    
    try {
      await this.msalService.instance.logoutPopup();
      this._loginStatus$.next(false);
      this._userProfile$.next(null);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('🔐 AuthService: Logout failed', error);
      throw error;
    }
  }

  isLoggedIn(): boolean {
    return this.msalService.instance.getAllAccounts().length > 0;
  }

  getUserInfo(): AccountInfo | null {
    return this.msalService.instance.getActiveAccount();
  }

  async getAccessToken(): Promise<string | null> {
    const account = this.msalService.instance.getActiveAccount();
    if (!account) {
      return null;
    }

    try {
      const response = await this.msalService.instance.acquireTokenSilent({
        ...silentRequest,
        account: account
      });
      
      return response.idToken;
    } catch (error) {
      console.error('🔐 AuthService: Failed to acquire token silently', error);
      
      // Try interactive token acquisition
      try {
        const response = await this.msalService.instance.acquireTokenPopup({
          ...loginRequest,
          account: account
        });
        return response.idToken;
      } catch (interactiveError) {
        console.error('🔐 AuthService: Interactive token acquisition failed', interactiveError);
        return null;
      }
    }
  }

  private async loadUserProfile(): Promise<void> {
    console.log('🔐 AuthService: Loading user profile...');
    
    try {
      const token = await this.getAccessToken();
      if (!token) {
        console.warn('🔐 AuthService: No token available for profile loading');
        return;
      }

      // Call your API to get user profile with roles
      const profile = await this.fetchUserProfile();
      this._userProfile$.next(profile);
      
      console.log('🔐 AuthService: User profile loaded', profile);
    } catch (error) {
      console.error('🔐 AuthService: Failed to load user profile', error);
    }
  }

  private async fetchUserProfile(): Promise<UserProfile> {
    try {
      // Get basic user info from token claims
      const userInfo = this.getUserInfo();
      const rawClaims = userInfo?.idTokenClaims;
      
      // Validate and cast to B2C token claims
      const claims: B2CTokenClaims | null = rawClaims && isB2CTokenClaims(rawClaims) ? rawClaims : null;
      
      // Fetch complete profile from backend API
      const backendProfile = await firstValueFrom(this.profileService.getUserProfile());

      const profile: UserProfile = {
        id: claims?.sub || userInfo?.localAccountId || '',
        email: backendProfile?.email || claims?.email || claims?.preferred_username || '',
        displayName: backendProfile ? `${backendProfile.firstName} ${backendProfile.lastName}` : claims?.name || '',
        firstName: backendProfile?.firstName || claims?.given_name || '',
        lastName: backendProfile?.lastName || claims?.family_name || '',
        roles: [], // Convert backend roles to UserRole format if needed
        isAdmin: backendProfile?.isAdmin || false,
        backendProfile: backendProfile
      };

      return profile;
    } catch (error) {
      console.error('🔐 AuthService: Error fetching user profile from API', error);
      
      // Fallback to token claims only
      const userInfo = this.getUserInfo();
      const rawClaims = userInfo?.idTokenClaims;
      const claims: B2CTokenClaims | null = rawClaims && isB2CTokenClaims(rawClaims) ? rawClaims : null;
      
      return {
        id: claims?.sub || userInfo?.localAccountId || '',
        email: claims?.email || claims?.preferred_username || '',
        displayName: claims?.name || `${claims?.given_name || ''} ${claims?.family_name || ''}`.trim() || '',
        firstName: claims?.given_name || '',
        lastName: claims?.family_name || '',
        roles: [],
        isAdmin: false
      };
    }
  }

  hasRole(roleName: string): boolean {
    const profile = this._userProfile$.value;
    
    // Check backend profile roles first
    if (profile?.backendProfile?.roles?.includes(roleName)) {
      return true;
    }
    
    // Check token claims
    const userInfo = this.getUserInfo();
    if (userInfo?.idTokenClaims) {
      const rawClaims = userInfo.idTokenClaims;
      const claims: B2CTokenClaims | null = rawClaims && isB2CTokenClaims(rawClaims) ? rawClaims : null;
      
      if (claims) {
        const roles: string[] = [];
        
        // Check custom role extension
        if (claims.extension_Role) {
          roles.push(claims.extension_Role);
        }
        
        // Check other role-related claims
        if (claims['roles'] && Array.isArray(claims['roles'])) {
          roles.push(...(claims['roles'] as string[]));
        }
        if (claims['extension_roles'] && Array.isArray(claims['extension_roles'])) {
          roles.push(...(claims['extension_roles'] as string[]));
        }
        
        return roles.includes(roleName);
      }
    }
    
    // Fallback to local profile roles
    return profile?.roles?.some(role => role.name === roleName) || false;
  }

  hasPermission(permission: string): boolean {
    const profile = this._userProfile$.value;
    return profile?.roles?.some(role => role.permissions.includes(permission)) || false;
  }

  getUserRoles(): UserRole[] {
    return this._userProfile$.value?.roles || [];
  }

  isAdmin(): boolean {
    const profile = this._userProfile$.value;
    
    // First check backend profile isAdmin flag
    if (profile?.backendProfile?.isAdmin !== undefined) {
      return profile.backendProfile.isAdmin;
    }
    
    // Check if backend profile has app_admin role
    if (profile?.backendProfile?.roles?.includes('app_admin')) {
      return true;
    }
    
    // Check token claims for admin roles
    const userInfo = this.getUserInfo();
    if (userInfo?.idTokenClaims) {
      const rawClaims = userInfo.idTokenClaims;
      const claims: B2CTokenClaims | null = rawClaims && isB2CTokenClaims(rawClaims) ? rawClaims : null;
      
      if (claims) {
        const roles: string[] = [];
        
        // Check custom role extension
        if (claims.extension_Role) {
          roles.push(claims.extension_Role);
        }
        
        // Check other role-related claims
        if (claims['roles'] && Array.isArray(claims['roles'])) {
          roles.push(...(claims['roles'] as string[]));
        }
        if (claims['extension_roles'] && Array.isArray(claims['extension_roles'])) {
          roles.push(...(claims['extension_roles'] as string[]));
        }
        
        return roles.includes('app_admin');
      }
    }
    
    // Fallback to profile isAdmin flag or role checking
    if (profile?.isAdmin !== undefined) {
      return profile.isAdmin;
    }
    
    return this.hasRole('admin') || this.hasRole('administrator');
  }

  getCurrentUserProfile(): UserProfile | null {
    return this._userProfile$.value;
  }
}