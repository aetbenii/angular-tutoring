import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { environment } from '../environments/environment';

export const routes: Routes = [
  // Public routes
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./components/forbidden/forbidden.component').then(m => m.ForbiddenComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./components/forbidden/forbidden.component').then(m => m.ForbiddenComponent)
  },

  // Protected routes - require authentication
  { 
    path: '', 
    redirectTo: 'dashboard', 
    pathMatch: 'full' 
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'employees',
    loadComponent: () => import('./components/employees/employees.component').then(m => m.EmployeesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'offices',
    loadComponent: () => import('./components/offices/offices.component').then(m => m.OfficesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'floor-plans',
    loadComponent: () => import('./components/floor-plans/floor-plans.component').then(m => m.FloorPlansComponent),
    canActivate: [authGuard]
  },
  {
    path: 'floor-map',
    loadComponent: () => import('./components/floor-map/floor-map.component').then(m => m.FloorMapComponent),
    canActivate: [authGuard]
  },
  {
    path: 'edit-map/:floorId/:roomId',
    loadComponent: () => import('./components/edit-map/edit-map.component').then(m => m.EditMapComponent),
    canActivate: [authGuard],
    data: { permissions: ['seat.edit'] } // Example permission requirement
  },

  // Debug route - only available in development
  ...(environment.production ? [] : [
    {
      path: 'debug',
      loadComponent: () => import('./components/debug/debug.component').then(m => m.DebugComponent),
      data: { title: 'Debug Panel' }
    }
  ]),

  // Catch-all route
  { 
    path: '**', 
    redirectTo: 'dashboard' 
  }
];
