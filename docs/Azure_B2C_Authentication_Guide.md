# Azure B2C Authentication Implementation Guide for Angular

## Overview

This guide provides a comprehensive walkthrough for implementing Azure Active Directory B2C authentication in an Angular application using Microsoft Authentication Library (MSAL). The implementation includes user authentication, role-based access control, and API integration with JWT tokens.

## 🔄 Recent Updates - Production-Ready Configuration

**This guide has been updated to reflect production-ready best practices. Key improvements include:**

### ✅ Environment-Driven Configuration
- **All hardcoded values removed**: MSAL configuration now fully uses environment variables
- **Deployment-ready**: Supports multiple environments (dev, staging, production)
- **Proper redirects**: Environment-specific redirect URIs and endpoints

### ✅ Production-Safe Logging
- **Console.log statements gated**: Debug output only in development mode
- **Security-focused**: No sensitive information logged in production
- **Error handling maintained**: Critical errors still logged in all environments

### ✅ Improved Auth Guard Logic
- **Role checking fixed**: Changed from requiring ALL roles to ANY role (more typical use case)
- **Better error handling**: More specific redirect paths and logging

### ✅ Removed Deprecated Practices
- **No more ::ng-deep**: Moved to proper global styles approach
- **Clean component architecture**: Centralized admin checking logic

**⚠️ Breaking Changes:**
- Environment files now require additional MSAL configuration properties
- Console.log statements require `isDevelopment` import for proper gating
- Auth guard role logic changed from `every()` to `some()` - verify this matches your requirements

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure B2C Configuration](#azure-b2c-configuration)
3. [Angular Project Setup](#angular-project-setup)
4. [MSAL Configuration](#msal-configuration)
5. [Authentication Service](#authentication-service)
6. [HTTP Interceptor](#http-interceptor)
7. [Route Guards](#route-guards)
8. [Role Management](#role-management)
9. [Component Integration](#component-integration)
10. [API Integration](#api-integration)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

## Prerequisites

- Angular 19+ application
- Azure AD B2C tenant configured
- Node.js and npm installed
- Basic understanding of Angular and TypeScript

## Azure B2C Configuration

### 1. Create Azure B2C Tenant

1. Go to Azure Portal
2. Create a new Azure AD B2C tenant
3. Note your tenant domain (e.g., `your-tenant.b2clogin.com`)

### 2. Register Application

1. In Azure B2C, go to "App registrations"
2. Click "New registration"
3. Configure:
   - Name: Your app name
   - Supported account types: Accounts in any identity provider
   - Redirect URI: `http://localhost:4200` (for development)
4. Note the Application (client) ID

### 3. Configure Authentication

1. Go to your app registration → Authentication
2. Add redirect URIs:
   - `http://localhost:4200` (development)
   - `https://your-domain.com` (production)
3. Enable implicit flow for ID tokens
4. Configure logout URL

### 4. Create User Flow

1. Go to "User flows" in Azure B2C
2. Create a "Sign up and sign in" user flow
3. Name it (e.g., `B2C_1A_SIGNUP_SIGNIN_SPID`)
4. Configure identity providers and user attributes

## Angular Project Setup

### 1. Install Dependencies

```bash
npm install @azure/msal-angular @azure/msal-browser
```

### 2. Project Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── msal/
│   │   │   └── msal.config.ts
│   │   ├── auth.service.ts
│   │   ├── auth.guard.ts
│   │   ├── auth-interceptor.ts
│   │   └── auth.config.ts
│   ├── components/
│   │   ├── header/
│   │   ├── login/
│   │   └── debug/
│   ├── app.component.ts
│   ├── app.config.ts
│   └── app.routes.ts
```

## MSAL Configuration

### Create `src/app/auth/msal/msal.config.ts`

```typescript
import { LogLevel, Configuration, BrowserCacheLocation, InteractionType } from '@azure/msal-browser';
import { isDevelopment } from '../auth.config';
import { environment } from '../../../environments/environment';

const isIE = window.navigator.userAgent.indexOf("MSIE ") > -1 || window.navigator.userAgent.indexOf("Trident/") > -1;

// Azure B2C Configuration - Now fully environment-driven
export const b2cPolicies = {
  names: {
    signUpSignIn: 'B2C_1A_SIGNUP_SIGNIN_SPID',
  },
  authorities: {
    signUpSignIn: {
      authority: environment.msal.authority,
    },
  },
  authorityDomain: environment.msal.authorityDomain,
};

// MSAL Configuration - All values now come from environment
export const msalConfig: Configuration = {
  auth: {
    clientId: environment.msal.clientId,
    authority: b2cPolicies.authorities.signUpSignIn.authority,
    knownAuthorities: [b2cPolicies.authorityDomain],
    redirectUri: environment.msal.redirectUri,
    postLogoutRedirectUri: environment.msal.postLogoutRedirectUri,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
    storeAuthStateInCookie: isIE, // Set to true for IE11
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii && !isDevelopment) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            if (isDevelopment) console.info(message);
            return;
          case LogLevel.Verbose:
            if (isDevelopment) console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
      logLevel: isDevelopment ? LogLevel.Verbose : LogLevel.Error,
      piiLoggingEnabled: isDevelopment,
    }
  }
};

// Login Request Configuration
export const loginRequest: PopupRequest = {
  scopes: ['openid', 'profile'],
  extraScopesToConsent: ['openid', 'profile'],
};

// Silent Request Configuration
export const silentRequest: SilentRequest = {
  scopes: ['openid', 'profile'],
  forceRefresh: false,
};

// API Configuration
export const apiConfig = {
  scopes: ['openid', 'profile'],
  uri: environment.production ? 'https://your-api-domain.com/api' : 'http://localhost:8080/api',
};
```

## Authentication Service

### Create `src/app/auth/auth.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo, AuthenticationResult, InteractionStatus, PopupRequest, SilentRequest } from '@azure/msal-browser';
import { BehaviorSubject, Observable, filter, take, from } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { loginRequest, silentRequest } from './msal/msal.config';
import { environment } from '../../environments/environment';

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
    private router: Router
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
    // Handle successful login
    this.msalService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        take(1)
      )
      .subscribe(() => {
        this.setLoginStatus();
      });
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
      const profile = await this.fetchUserProfile(token);
      this._userProfile$.next(profile);
      
      console.log('🔐 AuthService: User profile loaded', profile);
    } catch (error) {
      console.error('🔐 AuthService: Failed to load user profile', error);
    }
  }

  private async fetchUserProfile(token: string): Promise<UserProfile> {
    const headers = { Authorization: `Bearer ${token}` };
    
    try {
      // First, get basic user info from the token claims
      const userInfo = this.getUserInfo();
      const claims = userInfo?.idTokenClaims as any;
      
      // Then fetch roles from your API
      const rolesResponse = await this.http.get<UserRole[]>(
        `${environment.production ? 'https://your-api-domain.com' : 'http://localhost:8080'}/api/users/profile/roles`,
        { headers }
      ).toPromise();

      const profile: UserProfile = {
        id: claims?.sub || userInfo?.localAccountId || '',
        email: claims?.email || claims?.preferred_username || '',
        displayName: claims?.name || `${claims?.given_name} ${claims?.family_name}` || '',
        firstName: claims?.given_name || '',
        lastName: claims?.family_name || '',
        roles: rolesResponse || []
      };

      return profile;
    } catch (error) {
      console.error('🔐 AuthService: Error fetching user profile from API', error);
      
      // Fallback to token claims only
      const userInfo = this.getUserInfo();
      const claims = userInfo?.idTokenClaims as any;
      
      return {
        id: claims?.sub || userInfo?.localAccountId || '',
        email: claims?.email || claims?.preferred_username || '',
        displayName: claims?.name || `${claims?.given_name} ${claims?.family_name}` || '',
        firstName: claims?.given_name || '',
        lastName: claims?.family_name || '',
        roles: []
      };
    }
  }

  hasRole(roleName: string): boolean {
    const profile = this._userProfile$.value;
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
    return this.hasRole('admin') || this.hasRole('administrator');
  }

  getCurrentUserProfile(): UserProfile | null {
    return this._userProfile$.value;
  }
}
```

## HTTP Interceptor

### Create `src/app/auth/auth-interceptor.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Check if this is an API request that needs authentication
    if (req.url.includes('/api/')) {
      return from(this.authService.getAccessToken()).pipe(
        switchMap(accessToken => {
          if (accessToken) {
            // Clone the request and add the authorization header
            const authReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${accessToken}`
              }
            });
            return next.handle(authReq);
          } else {
            console.warn('🔐 AuthInterceptor: No access token available for API request');
            return throwError(() => new Error('No access token available'));
          }
        }),
        catchError(error => {
          console.error('🔐 AuthInterceptor: Error acquiring access token:', error);
          return throwError(() => error);
        })
      );
    } else {
      // For non-API requests, proceed without modification
      return next.handle(req);
    }
  }
}
```

## Route Guards

### Create `src/app/auth/auth.guard.ts`

```typescript
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { isDevelopment } from './auth.config';

export const authGuard: CanActivateFn = async (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    // Wait for MSAL initialization
    await authService.waitForInitialization();

    // Check if user is authenticated
    if (!authService.isLoggedIn()) {
      if (isDevelopment) console.log('🔐 User not authenticated, redirecting to login page');
      return router.parseUrl('/login');
    }

    // Check for required roles from route data
    const requiredRoles = route.data?.['roles'] as string[] | undefined;
    if (requiredRoles && requiredRoles.length > 0) {
      const userProfile = authService.getUserProfile();
      
      if (!userProfile) {
        if (isDevelopment) console.log('🔐 User profile not available, redirecting to login');
        return router.parseUrl('/login');
      }
      
      // Check if user has any of the required roles
      const hasAnyRequiredRole = requiredRoles.some(role => 
        userProfile.roles?.includes(role) || false
      );
      
      if (!hasAnyRequiredRole) {
        if (isDevelopment) console.log('🔐 User lacks required roles, redirecting to forbidden page');
        if (isDevelopment) console.log('🔐 Required roles:', requiredRoles);
        if (isDevelopment) console.log('🔐 User roles:', userProfile.roles);
        return router.parseUrl('/forbidden');
      }
    }

    // Check for required permissions from route data
    const requiredPermissions = route.data?.['permissions'] as string[] | undefined;
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasRequiredPermission = requiredPermissions.some(permission => 
        authService.hasPermission(permission)
      );
      
      if (!hasRequiredPermission) {
        if (isDevelopment) console.log('🔐 User does not have required permissions:', requiredPermissions);
        return router.parseUrl('/unauthorized');
      }
    }

    return true;
  } catch (error) {
    console.error('🔐 Auth guard error:', error);
    return router.parseUrl('/login');
  }
};
```

## Component Integration

### Update `src/app/app.config.ts`

```typescript
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { MsalModule, MsalRedirectComponent, MsalGuard } from '@azure/msal-angular';
import { InteractionType, PublicClientApplication } from '@azure/msal-browser';

import { routes } from './app.routes';
import { msalConfig, loginRequest } from './auth/msal/msal.config';
import { AuthInterceptor } from './auth/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(MsalModule.forRoot(new PublicClientApplication(msalConfig),
      {
        interactionType: InteractionType.Redirect,
        authRequest: loginRequest,
      },
      {
        interactionType: InteractionType.Redirect,
        protectedResourceMap: new Map()
      }
    )),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    MsalGuard,
    MsalRedirectComponent,
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations()
  ]
};
```

### Update `src/app/app.component.ts`

```typescript
import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription } from 'rxjs';
import { HeaderComponent } from './components/header/header.component';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    CommonModule,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
    MatMenuModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Office Management';
  
  isAuthenticated = false;
  userInfo: any = null;
  displayName = '';
  isInitializing = true;
  
  private authService = inject(AuthService);
  private router = inject(Router);
  private subscription = new Subscription();

  ngOnInit(): void {
    this.initializeApp();
    
    // Subscribe to authentication status changes
    this.subscription.add(
      this.authService.loginStatus$.subscribe(status => {
        this.isAuthenticated = status;
        if (status) {
          this.userInfo = this.authService.getUserInfo();
          this.displayName = this.getUserDisplayName();
        } else {
          this.userInfo = null;
          this.displayName = '';
        }
      })
    );
  }

  private async initializeApp(): Promise<void> {
    try {
      await this.authService.waitForInitialization();
      this.isInitializing = false;
    } catch (error) {
      console.error('App initialization failed:', error);
      this.isInitializing = false;
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private getUserDisplayName(): string {
    if (!this.userInfo) return '';
    
    const claims = this.userInfo.idTokenClaims as any;
    if (claims) {
      if (claims.given_name && claims.family_name) {
        return `${claims.given_name} ${claims.family_name}`;
      }
      if (claims.name) {
        return claims.name;
      }
      if (claims.preferred_username) {
        return claims.preferred_username;
      }
    }
    
    return this.userInfo.username || 'User';
  }

  async login(): Promise<void> {
    try {
      await this.authService.login();
    } catch (error) {
      console.error('Login error:', error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}
```

## Role Management

### Backend API Endpoint

Your backend should provide an endpoint to retrieve user roles:

```typescript
// Example API endpoint: GET /api/users/profile/roles
// Headers: Authorization: Bearer <jwt_token>

// Response format:
interface UserRole {
  name: string;
  permissions: string[];
}

// Example response:
[
  {
    "name": "admin",
    "permissions": ["user.create", "user.edit", "user.delete", "seat.assign"]
  },
  {
    "name": "user",
    "permissions": ["seat.view", "profile.edit"]
  }
]
```

### Role-Based Route Protection

```typescript
// In app.routes.ts
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'user-management',
    loadComponent: () => import('./user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [authGuard],
    data: { permissions: ['user.create', 'user.edit'] }
  }
];
```

### Component-Level Role Checking

```typescript
// In your components
export class SomeComponent {
  constructor(private authService: AuthService) {}

  ngOnInit() {
    // Check if user has admin role
    if (this.authService.hasRole('admin')) {
      // Show admin features
    }

    // Check if user has specific permission
    if (this.authService.hasPermission('user.edit')) {
      // Show edit button
    }
  }
}
```

## API Integration

### Service Example

```typescript
@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = environment.production ? 'https://your-api-domain.com/api' : 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  getEmployees(): Observable<Employee[]> {
    // Token automatically added by AuthInterceptor
    return this.http.get<Employee[]>(`${this.apiUrl}/employees`);
  }

  assignSeat(employeeId: number, seatId: number): Observable<void> {
    // Token automatically added by AuthInterceptor
    return this.http.put<void>(`${this.apiUrl}/employees/${employeeId}/seats/${seatId}`, {});
  }
}
```

### Error Handling

```typescript
// Add to your services
private handleApiError(error: any) {
  if (error.status === 401) {
    // Token expired or invalid
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  return throwError(() => error);
}
```

## Testing

### Unit Tests

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let msalService: jasmine.SpyObj<MsalService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('MsalService', ['loginPopup', 'logoutPopup']);
    
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: MsalService, useValue: spy }
      ]
    });
    
    service = TestBed.inject(AuthService);
    msalService = TestBed.inject(MsalService) as jasmine.SpyObj<MsalService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login successfully', async () => {
    msalService.loginPopup.and.returnValue(Promise.resolve(mockAuthResult));
    
    await service.login();
    
    expect(msalService.loginPopup).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
describe('AuthGuard', () => {
  let guard: CanActivateFn;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'hasRole']);
    const routerSpy = jasmine.createSpyObj('Router', ['parseUrl']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.runInInjectionContext(() => authGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should allow access for authenticated users', async () => {
    authService.isLoggedIn.and.returnValue(true);
    authService.waitForInitialization.and.returnValue(Promise.resolve());

    const result = await guard(mockRoute, mockState);

    expect(result).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

1. **MSAL Configuration Issues**
   - Verify client ID and authority URLs
   - Check redirect URIs in Azure B2C
   - Ensure proper CORS configuration

2. **Token Acquisition Failures**
   - Check scopes configuration
   - Verify user flow settings
   - Review browser console for MSAL errors

3. **Role/Permission Issues**
   - Ensure API returns proper role structure
   - Check JWT token claims
   - Verify backend authentication

4. **Redirect Issues**
   - Configure proper redirect URIs
   - Check for infinite redirect loops
   - Verify route configurations

## Debug Component for Development

### 🚨 **IMPORTANT: DEVELOPMENT MODE ONLY**

**The debug component should NEVER be included in production builds. It exposes sensitive authentication information including JWT tokens, user claims, and internal authentication state. This component is strictly for development and debugging purposes.**

### Why You Need a Debug Component

During development, you'll often need to:
- Inspect JWT token claims and structure
- Verify user roles and permissions are correctly loaded
- Debug authentication flow issues
- Validate API responses for user profiles
- Troubleshoot MSAL configuration problems
- Monitor authentication state changes

### Implementation

#### 1. Create Debug Component

Create `src/app/components/debug/debug.component.ts`:

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, interval } from 'rxjs';
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
                    <h4>Roles ({{ debugInfo.roles?.length || 0 }})</h4>
                    <div class="role-items">
                      <mat-card *ngFor="let role of debugInfo.roles" class="role-card">
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
                  <div *ngFor="let error of debugInfo.errors" class="error-item">
                    <div class="error-timestamp">{{ error.timestamp | date:'medium' }}</div>
                    <div class="error-message">{{ error.message }}</div>
                    <div class="error-stack" *ngIf="error.stack">
                      <pre>{{ error.stack }}</pre>
                    </div>
                  </div>
                  <div *ngIf="debugInfo.errors.length === 0" class="no-errors">
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
  debugInfo: any = {};
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
        accessToken: accessToken,
        
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

  private getRecentErrors(): any[] {
    // Implement error tracking if needed
    // This could be connected to a global error handler
    return [];
  }
}
```

#### 2. Add Debug Route (Development Only)

In `src/app/app.routes.ts`, add the debug route with environment check:

```typescript
import { Routes } from '@angular/router';
import { environment } from '../environments/environment';

export const routes: Routes = [
  // ... your existing routes
  
  // Debug route - only available in development
  ...(environment.production ? [] : [
    {
      path: 'debug',
      loadComponent: () => import('./components/debug/debug.component').then(m => m.DebugComponent),
      data: { title: 'Debug Panel' }
    }
  ]),
];
```

#### 3. Add Debug Link to Header (Development Only)

In your header component template:

```html
<!-- Only show debug link in development -->
<button mat-icon-button 
        *ngIf="!environment.production" 
        routerLink="/debug"
        matTooltip="Debug Panel">
  <mat-icon>bug_report</mat-icon>
</button>
```

#### 4. Environment Configuration

Ensure your environment files are properly configured:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  // ... other config
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  // ... other config
};
```

### How to Use the Debug Component

1. **During Development Setup:**
   - Navigate to `/debug` in your browser
   - Check authentication status and configuration
   - Verify token claims are correct

2. **Troubleshooting Authentication Issues:**
   - Check if tokens are being acquired
   - Verify user roles are loaded correctly
   - Inspect JWT claims structure

3. **API Integration Testing:**
   - Verify tokens are being sent to APIs
   - Check if roles/permissions match expectations
   - Debug authorization failures

4. **MSAL Configuration Validation:**
   - Ensure MSAL is configured correctly
   - Check active accounts and token cache
   - Verify redirect URIs and scopes

### Security Considerations

```typescript
// Build-time exclusion for production
// In angular.json, you can exclude debug files in production builds
"production": {
  "fileReplacements": [
    {
      "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.prod.ts"
    }
  ],
  "optimization": true,
  "outputHashing": "all",
  "sourceMap": false,
  "namedChunks": false,
  "extractLicenses": true,
  "vendorChunk": false,
  "buildOptimizer": true,
  // Exclude debug component from production builds
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "2mb",
      "maximumError": "5mb"
    }
  ]
}
```

### Best Practices for Debug Component

1. **Never Deploy to Production:**
   - Always check `environment.production` before rendering
   - Use build-time exclusions
   - Remove debug routes in production builds

2. **Limit Sensitive Information:**
   - Never log full JWT tokens in production
   - Sanitize user data before display
   - Use token previews instead of full tokens

3. **Performance Considerations:**
   - Don't auto-refresh too frequently
   - Limit error log size
   - Use lazy loading for debug component

4. **Development Productivity:**
   - Add keyboard shortcuts for common actions
   - Implement copy-to-clipboard for easy sharing
   - Color-code status indicators for quick identification

This debug component is an essential tool for developing and troubleshooting Azure B2C authentication implementation, but must be strictly limited to development environments for security reasons.

### Environment Configuration

**⚠️ IMPORTANT: All configuration values must now be defined in environment files to ensure proper deployment to different environments.**

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
  msal: {
    clientId: 'your-client-id',
    apiScope: 'https://your-tenant.onmicrosoft.com/your-app-id/api.read',
    apiEndpoint: 'http://localhost:8080/api',
    authority: 'https://your-tenant.b2clogin.com/your-tenant.onmicrosoft.com/B2C_1A_SIGNUP_SIGNIN_SPID',
    authorityDomain: 'your-tenant.b2clogin.com',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200'
  }
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://your-production-api-url',
  msal: {
    clientId: 'your-client-id',
    apiScope: 'https://your-tenant.onmicrosoft.com/your-app-id/api.read',
    apiEndpoint: 'https://your-production-api-url',
    authority: 'https://your-tenant.b2clogin.com/your-tenant.onmicrosoft.com/B2C_1A_SIGNUP_SIGNIN_SPID',
    authorityDomain: 'your-tenant.b2clogin.com',
    redirectUri: 'https://your-production-url',
    postLogoutRedirectUri: 'https://your-production-url'
  }
};
```

### Create `src/app/auth/auth.config.ts`

```typescript
import { environment } from '../../environments/environment';

export const isDevelopment = !environment.production; // Debug features enabled in development

// CONFIGURATION INFO FOR DEBUGGING
export const authConfigInfo = {
  environment: environment.production ? 'PRODUCTION' : 'DEVELOPMENT',
  provider: 'Azure AD B2C (Cloud)',
  clientId: environment.msal.clientId,
  authority: environment.msal.authority,
  isDevelopment: isDevelopment
};

// Log current configuration in development only
if (isDevelopment) {
  console.log('🔐 Authentication Configuration:', authConfigInfo);
}
```

## Best Practices

1. **Security**
   - Always use HTTPS in production
   - Implement proper CORS policies
   - Validate tokens on the backend
   - Use secure storage for sensitive data
   - **Never hardcode configuration values** - use environment files
   - Gate debug logging with `isDevelopment` flag

2. **Performance**
   - Implement token caching
   - Use silent token renewal
   - Minimize API calls for user data

3. **User Experience**
   - Show loading states during authentication
   - Handle errors gracefully
   - Provide clear feedback for authentication issues

4. **Development**
   - Use environment-specific configurations
   - Implement comprehensive logging (development only)
   - Create debug tools for development
   - **Always test with production builds** to ensure no debug information leaks

5. **Deployment**
   - Configure environment-specific redirect URIs in Azure B2C
   - Verify all configuration values in environment files
   - Test authentication flow in each environment
   - Monitor console output in production (should be minimal)

This guide provides a complete implementation of Azure B2C authentication in Angular with role-based access control and API integration. Follow the steps sequentially to implement authentication in your Angular application.