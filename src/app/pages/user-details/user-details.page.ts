import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, IonBackButton, IonList, IonListHeader, IonLabel, IonItem, IonNote } from '@ionic/angular/standalone';
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
  arrowBackOutline,
  bicycleOutline,
  starOutline,
  createOutline
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

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
  'remove-circle-outline': removeCircleOutline,
  'bicycle-outline': bicycleOutline,
  'star-outline': starOutline,
  'create-outline': createOutline
});

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.page.html',
  styleUrls: ['./user-details.page.scss'],
  standalone: true,
  imports: [IonNote, IonItem, IonLabel, IonListHeader, IonList, IonBackButton, IonIcon, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class UserDetailsPage implements OnInit {

  userDetails = {
  "status": true,
  "data": {
    "user": {
      "name": "Sammed Patil",
      "phone": "+91 9591420068",
      "phoneVerified": true,
      "email": "sammed.patil29@gmail.com",
      "emailVerified": true,
      "riderId": "RIDER1023",
      "kycStatus": "VERIFIED",
      "userStatus": "ACTIVE",
      "rating": 4.8
    },
    "vehicle": {
      "type": "Bike",
      "model": "Hero Splendor Plus",
      "number": "KA 01 AB 1234",
      "fuelType": "Petrol",
      "rcStatus": "VERIFIED"
    }
  }
}

profile = this.userDetails['data'];


 constructor(private router: Router, private navctrl: NavController) {
     addIcons({arrowBackOutline,personOutline,bicycleOutline}); }

  ngOnInit() {
  }

  goBack(){
    this.navctrl.back();
  }

}

