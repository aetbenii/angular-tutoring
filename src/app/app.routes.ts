import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'employees',
    loadComponent: () => import('./components/employees/employees.component').then(m => m.EmployeesComponent)
  },
  {
    path: 'offices',
    loadComponent: () => import('./components/offices/offices.component').then(m => m.OfficesComponent)
  },
  {
    path: 'floor-plans',
    loadComponent: () => import('./components/floor-plans/floor-plans.component').then(m => m.FloorPlansComponent)
  }
];
