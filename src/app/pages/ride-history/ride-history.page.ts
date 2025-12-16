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
  navigateOutline,
  starOutline
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
  'navigate-outline': navigateOutline,
  'star-outline': starOutline
});

@Component({
  selector: 'app-ride-history',
  templateUrl: './ride-history.page.html',
  styleUrls: ['./ride-history.page.scss'],
  standalone: true,
  imports: [IonNote, IonItem, IonLabel, IonListHeader, IonList, IonBackButton, IonIcon, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class RideHistoryPage implements OnInit {

  rideHistory = {
  "status": true,
  "data": {
    "summary": {
      "totalRides": 128,
      "totalEarnings": 18450,
      "rating": 4.8
    },
    "rides": [
      {
        "rideId": "RIDE1001",
        "from": "BTM Layout",
        "to": "Electronic City",
        "dateLabel": "Today",
        "time": "10:32 AM",
        "amount": 120,
        "status": "COMPLETED"
      },
      {
        "rideId": "RIDE1002",
        "from": "Majestic",
        "to": "Yelahanka",
        "dateLabel": "Yesterday",
        "time": "6:15 PM",
        "amount": 180,
        "status": "COMPLETED"
      },
      {
        "rideId": "RIDE1003",
        "from": "Whitefield",
        "to": "Indiranagar",
        "dateLabel": "Yesterday",
        "time": "1:40 PM",
        "amount": 220,
        "status": "COMPLETED"
      },
      {
        "rideId": "RIDE1004",
        "from": "HSR Layout",
        "to": "Silk Board",
        "dateLabel": "2 days ago",
        "time": "8:10 AM",
        "amount": 95,
        "status": "COMPLETED"
      }
    ]
  }
}


history = this.rideHistory['data']

 constructor(private router: Router, private navCtrl: NavController) {
     addIcons({arrowBackOutline,navigateOutline}); }

  ngOnInit() {
  }

  goBack(){
    this.navCtrl.back();
  }

  openRideDetails(ride:any){
    this.router.navigate(['/layout/ride-details'], ride);
  }

}

