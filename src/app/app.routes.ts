import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./pages/onboarding/onboarding.page').then(m => m.OnboardingPage)
  },
  {
    path: 'layout',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/layout/layout.page').then(m => m.LayoutPage),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage)
      },
      {
        path: 'earnings',
        loadComponent: () => import('./pages/earnings/earnings.page').then(m => m.EarningsPage)
      },
      {
        path: 'wallet',
        loadComponent: () => import('./pages/wallet/wallet.page').then(m => m.WalletPage)
      },
      {
        path: 'ride-history',
        loadComponent: () => import('./pages/ride-history/ride-history.page').then(m => m.RideHistoryPage)
      },
      {
        path: 'referrals',
        loadComponent: () => import('./pages/referrals/referrals.page').then(m => m.ReferralsPage)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./pages/notifications/notifications.page').then(m => m.NotificationsPage)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage)
      },
      {
        path: 'need-help',
        loadComponent: () => import('./pages/need-help/need-help.page').then(m => m.NeedHelpPage)
      },
      {
        path: 'user-details',
        loadComponent: () => import('./pages/user-details/user-details.page').then(m => m.UserDetailsPage)
      },
      {
        path: 'ride-details',
        loadComponent: () => import('./pages/ride-details/ride-details.page').then(m => m.RideDetailsPage)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];