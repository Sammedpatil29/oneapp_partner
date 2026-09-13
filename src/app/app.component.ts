import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Location } from './services/location';
import { Router } from '@angular/router';
import { CustomSplashComponent } from "./pages/custom-splash/custom-splash.component";
import { OtaService } from './services/ota.service';
import { CaptainNativeService } from './services/captain-native.service';
import { AuthService } from './services/auth.service';
import { RegisterFcmService } from './services/register-fcm.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, CustomSplashComponent],
})
export class AppComponent implements OnInit {

  lat!: number;
  lng!: number;
  showSplash = true;

  private router = inject(Router);
  private otaService = inject(OtaService);
  private captainNative = inject(CaptainNativeService);
  private authService = inject(AuthService);
  private fcmService = inject(RegisterFcmService);

  constructor() {
    // Ensure light theme
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('ion-palette-dark', 'dark-theme');
      document.body.classList.remove('ion-palette-dark', 'dark-theme');
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-theme');
      try { localStorage.removeItem('app_theme'); } catch (e) {}
    }

    const startTime = Date.now();
    this.routeBasedOnAuth(startTime);

    // Fallback safety: ensure splash is never stuck longer than 3.5s
    setTimeout(() => {
      if (this.showSplash) {
        this.showSplash = false;
      }
    }, 3500);
  }

  private dismissSplash(startTime: number) {
    const elapsed = Date.now() - startTime;
    const minDisplay = 800; // minimum 800ms so loader smoothly displays without flickering
    const delay = Math.max(0, minDisplay - elapsed);
    setTimeout(() => {
      this.showSplash = false;
    }, delay);
  }

  private routeBasedOnAuth(startTime: number) {
    if (!this.authService.hasToken()) {
      this.router.navigateByUrl('/login').then(() => {
        this.dismissSplash(startTime);
      }).catch(() => {
        this.dismissSplash(startTime);
      });
      return;
    }

    this.authService.checkAuthStatus().subscribe({
      next: (res) => {
        let targetUrl = '/layout/home';
        if (res?.is_verified) {
          // Captain is active & approved -> Go to Driver Console
          targetUrl = '/layout/home';
        } else if (res?.has_submitted_docs || res?.verification_status === 'verifying') {
          // Documents submitted -> Show verification status review
          targetUrl = '/onboarding?step=4';
        } else {
          // Email verified, yet to add personal & vehicle details -> Step 1
          targetUrl = '/onboarding?step=1';
        }
        this.router.navigateByUrl(targetUrl).then(() => {
          this.dismissSplash(startTime);
        }).catch(() => {
          this.dismissSplash(startTime);
        });
      },
      error: () => {
        this.authService.logout();
        this.router.navigateByUrl('/login').then(() => {
          this.dismissSplash(startTime);
        }).catch(() => {
          this.dismissSplash(startTime);
        });
      }
    });
  }

  async ngOnInit() {
    // 🚀 Initialize OTA Live Update Checks
    this.otaService.initialize();

    // 🔔 Initialize FCM Push Notifications
    this.fcmService.initPush();

    // 🛡️ Proactively prompt essential driver runtime permissions on startup
    try {
      await this.captainNative.requestEssentialPermissions();
    } catch (e) {
      console.warn('Startup permissions check skipped:', e);
    }
  }
}

