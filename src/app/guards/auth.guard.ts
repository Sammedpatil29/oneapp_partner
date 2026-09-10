import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protects partner console routes (e.g. /layout/*, /onboarding).
 * Redirects to /login if user is not authenticated.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasToken()) {
    return true;
  }

  // Not authenticated, redirect to login
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

/**
 * Prevents authenticated partners from accessing /login.
 * Redirects directly to /layout/home if user already has active session.
 */
export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasToken()) {
    try {
      const stored = localStorage.getItem('riderInfo');
      const rider = stored ? JSON.parse(stored) : null;
      if (rider?.is_verified) {
        router.navigate(['/layout/home']);
      } else if (rider?.has_submitted_docs || rider?.kyc_docs) {
        router.navigate(['/onboarding'], { queryParams: { step: '4' } });
      } else {
        router.navigate(['/onboarding'], { queryParams: { step: '1' } });
      }
    } catch {
      router.navigate(['/layout/home']);
    }
    return false;
  }

  return true;
};

