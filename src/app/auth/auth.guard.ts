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
      const userProfile = authService.getCurrentUserProfile();
      
      if (!userProfile) {
        if (isDevelopment) console.log('🔐 User profile not available, redirecting to login');
        return router.parseUrl('/login');
      }
      
      // Check if user has any of the required roles
      const hasAnyRequiredRole = requiredRoles.some(role => 
        userProfile.roles?.some(userRole => userRole.name === role) || false
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
      // Allow admins to bypass specific permission checks
      const isAdmin = authService.isAdmin();
      const hasRequiredPermission = requiredPermissions.some(permission => 
        authService.hasPermission(permission)
      );
      
      if (!hasRequiredPermission && !isAdmin) {
        if (isDevelopment) console.log('🔐 User does not have required permissions and is not admin:', requiredPermissions);
        return router.parseUrl('/unauthorized');
      }
      
      if (isDevelopment && isAdmin) {
        console.log('🔐 Admin access granted for permissions:', requiredPermissions);
      }
    }

    return true;
  } catch (error) {
    console.error('🔐 Auth guard error:', error);
    return router.parseUrl('/login');
  }
};