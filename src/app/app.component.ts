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
    setTimeout(() => {
      this.showSplash = false;
      this.routeBasedOnAuth();
    }, 1800);
  }

  private routeBasedOnAuth() {
    if (!this.authService.hasToken()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.authService.checkAuthStatus().subscribe({
      next: (res) => {
        if (res?.is_verified) {
          // Captain is active & approved -> Go to Driver Console
          this.router.navigateByUrl('/layout/home');
        } else if (res?.has_submitted_docs || res?.verification_status === 'verifying') {
          // Documents submitted -> Show verification status review
          this.router.navigate(['/onboarding'], { queryParams: { step: '4' } });
        } else {
          // Email verified, yet to add personal & vehicle details -> Step 1
          this.router.navigate(['/onboarding'], { queryParams: { step: '1' } });
        }
      },
      error: () => {
        this.authService.logout();
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

