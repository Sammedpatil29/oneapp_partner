import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonBackButton, IonButtons, IonButton, IonIcon } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline,
  cashOutline,
  walletOutline,
  notificationsOutline,
  shieldCheckmarkOutline,
  helpCircleOutline,
  settingsOutline,
  logOutOutline,
  moonOutline,
  sunnyOutline,
  addCircleOutline,
  removeCircleOutline,
  arrowBackOutline
} from 'ionicons/icons';

addIcons({
  'person-outline': personOutline,
  'cash-outline': cashOutline,
  'wallet-outline': walletOutline,
  'notifications-outline': notificationsOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'help-circle-outline': helpCircleOutline,
  'settings-outline': settingsOutline,
  'log-out-outline': logOutOutline,
  'moon-outline': moonOutline,
  'sunny-outline': sunnyOutline,
  'arrow-back-outline': arrowBackOutline,
  'add-circle-outline': addCircleOutline,
  'remove-circle-outline': removeCircleOutline
});

import { CaptainService } from 'src/app/services/captain.service';

@Component({
  selector: 'app-ride-details',
  templateUrl: './ride-details.page.html',
  styleUrls: ['./ride-details.page.scss'],
  standalone: true,
  imports: [IonIcon, IonButton, IonButtons, IonBackButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class RideDetailsPage implements OnInit {
  rideDetails: any = null;
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private captainService: CaptainService
  ) {
    addIcons({ arrowBackOutline });
  }

  ngOnInit() {
    // 1. Check router state (if navigated from another page with state)
    const stateRide = history.state?.ride;
    if (stateRide) {
      this.rideDetails = stateRide;
      return;
    }

    // 2. Check query params or route state for rideId
    const urlTree = this.router.parseUrl(this.router.url);
    const rideId = urlTree.queryParams['rideId'] || urlTree.queryParams['id'];

    if (rideId) {
      this.isLoading = true;
      this.captainService.getRideDetail(rideId).subscribe({
        next: (res: any) => {
          this.rideDetails = res?.data?.ride || res?.data;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    }
  }

  gotoHelp() {
    this.router.navigate(['/layout/need-help']);
  }

  goback() {
    this.navCtrl.back();
  }

}
