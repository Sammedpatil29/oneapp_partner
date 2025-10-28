import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'layout',
    loadComponent: () => import('./pages/layout/layout.page').then( m => m.LayoutPage),
    children: [
      {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then( m => m.HomePage)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
    ]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  
];
