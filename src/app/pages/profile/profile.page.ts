import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonIcon, IonLabel, IonButton, IonBadge, IonList, IonButtons, IonBackButton } from '@ionic/angular/standalone';
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
  'arrow-back-outline': arrowBackOutline
});

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonBackButton, IonButtons, IonList, IonBadge, IonButton, IonLabel, IonIcon, IonItem, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class ProfilePage implements OnInit {

  riderId = '';
  profile = {
  "status": true,
  "data": {
    "rider": {
      "id": "RIDER1023",
      "name": "Sammed Patil",
      "joinedOn": "2024-04-10",
      "status": "ACTIVE",
      "rating": 4.8,
      "profileImage": null
    },
    "wallet": {
      "balance": 125,
      "currency": "INR"
    },
    "earnings": {
      "today": 45
    },
    "stats": {
      "totalRides": 128
    }
  }
}
;
  constructor(private router: Router, private navCtrl: NavController) {
      addIcons({arrowBackOutline,personOutline,notificationsOutline,walletOutline,helpCircleOutline}); }

  ngOnInit() {
    this.riderId = localStorage.getItem('riderId') || '';
  }

  logout(){
    localStorage.removeItem('riderJwt')
    localStorage.removeItem('riderId')
    this.navCtrl.navigateRoot(['/login'])
  }

  goBack(){
    this.navCtrl.back();
  }

  gotoWallet(){
    this.router.navigate(['/layout/wallet'])
  }

  gotoRideHistory(){
    this.router.navigate(['/layout/ride-history'])
  }

  gotoProfile(){
    this.router.navigate(['/layout/user-details'])
  }

  sendWhatsApp() {
  const phone = '917406984308'; // country code + number (NO +)
  const message = encodeURIComponent(
    'Hi, I need help regarding my Onboarding.'
  );

  const url = `https://wa.me/${phone}?text=${message}`;
  window.open(url, '_system'); // opens WhatsApp app
}
}
