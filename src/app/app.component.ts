import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Location } from './services/location';
import { Router } from '@angular/router';
import { CustomSplashComponent } from "./pages/custom-splash/custom-splash.component";
import { OtaService } from './services/ota.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, CustomSplashComponent],
})
export class AppComponent implements OnInit {

  lat!: number;
  lng!: number;
  showSplash = true;

  constructor(
    private router: Router,
    private otaService: OtaService
  ) {
    setTimeout(() => {
      this.showSplash = false;
      this.router.navigateByUrl('/login');
    }, 2000); // 2 seconds
  }

  ngOnInit() {
    // 🚀 Initialize OTA Live Update Checks
    this.otaService.initialize();
  }
}

