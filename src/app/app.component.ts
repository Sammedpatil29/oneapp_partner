import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Location } from './services/location';
import { Router } from '@angular/router';
import { CustomSplashComponent } from "./pages/custom-splash/custom-splash.component";

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, CustomSplashComponent],
})
export class AppComponent{

   lat!: number;
  lng!: number;
showSplash = true;
  constructor(private router: Router) {
    setTimeout(() => {
      this.showSplash = false;
      this.router.navigateByUrl('/login');
    }, 2000); // 2 seconds
  }

  

  }

