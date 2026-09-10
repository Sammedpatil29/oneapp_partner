import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Location } from './services/location';
import { Router } from '@angular/router';
import { CustomSplashComponent } from "./pages/custom-splash/custom-splash.component";
import { OtaService } from './services/ota.service';
import { CaptainNativeService } from './services/captain-native.service';

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

  constructor() {
    setTimeout(() => {
      this.showSplash = false;
      this.router.navigateByUrl('/login');
    }, 2000); // 2 seconds
  }

  async ngOnInit() {
    // 🚀 Initialize OTA Live Update Checks
    this.otaService.initialize();

    // 🛡️ Proactively prompt essential driver runtime permissions on startup
    try {
      await this.captainNative.requestEssentialPermissions();
    } catch (e) {
      console.warn('Startup permissions check skipped:', e);
    }
  }
}

