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
@Component({
  selector: 'app-ride-details',
  templateUrl: './ride-details.page.html',
  styleUrls: ['./ride-details.page.scss'],
  standalone: true,
  imports: [IonIcon, IonButton, IonButtons, IonBackButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class RideDetailsPage implements OnInit {

  rideData = {
  "status": true,
  "data": {
    "ride": {
      "rideId": "RIDE10234",
      "status": "COMPLETED",
      "pickup": {
        "address": "BTM Layout, Bangalore"
      },
      "drop": {
        "address": "Electronic City Phase 1"
      },
      "date": "2025-02-14",
      "time": "10:32 AM",
      "distance": "8.4 km",
      "duration": "22 mins",
      "fare": {
        "rideFare": 150,
        "incentive": 20,
        "total": 170
      },
      "customer": {
        "name": "Rahul"
      },
      "payment": {
        "mode": "Cash"
      }
    }
  }
}

rideDetails = this.rideData.data.ride;


  constructor(private router: Router, private navCtrl: NavController) {
      addIcons({arrowBackOutline}); }

  ngOnInit() {
  }

  gotoHelp(){
    this.router.navigate(['/layout/need-help']);
  }

  goback(){
    this.navCtrl.back();
  }

}
