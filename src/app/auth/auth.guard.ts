import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

const isDevelopment = !environment.production;

export const authGuard: CanActivateFn = async (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    // Wait for MSAL initialization
    await authService.waitForInitialization();

    // Check if user is authenticated
    if (!authService.isLoggedIn()) {
      // For redirect flow, don't automatically trigger login
      // Instead, redirect to login page where user can manually trigger login
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

    return true;
  } catch (error) {
    console.error('Auth guard error:', error);
    return router.parseUrl('/login');
  }
}; 