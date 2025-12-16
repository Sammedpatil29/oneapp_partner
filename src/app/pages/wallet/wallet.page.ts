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
  arrowBackOutline
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
  'remove-circle-outline': removeCircleOutline
});

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.scss'],
  standalone: true,
  imports: [IonNote, IonItem, IonLabel, IonListHeader, IonList, IonBackButton, IonIcon, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class WalletPage implements OnInit {

  walletData = {
  "status": true,
  "data": {
    "balance": {
      "available": 1250,
      "currency": "INR"
    },
    "stats": {
      "today": 450,
      "thisWeek": 3200,
      "thisMonth": 12800
    },
    "transactions": [
      {
        "txnId": "TXN1001",
        "type": "CREDIT",
        "title": "Ride Earning",
        "amount": 120,
        "dateLabel": "Today",
        "time": "10:32 AM"
      },
      {
        "txnId": "TXN1002",
        "type": "DEBIT",
        "title": "Withdrawal",
        "amount": 500,
        "dateLabel": "Yesterday",
        "time": "7:10 PM"
      },
      {
        "txnId": "TXN1002",
        "type": "DEBIT",
        "title": "Withdrawal",
        "amount": 500,
        "dateLabel": "Yesterday",
        "time": "7:10 PM"
      },
      {
        "txnId": "TXN1002",
        "type": "DEBIT",
        "title": "Withdrawal",
        "amount": 500,
        "dateLabel": "Yesterday",
        "time": "7:10 PM"
      },
      {
        "txnId": "TXN1002",
        "type": "DEBIT",
        "title": "Withdrawal",
        "amount": 500,
        "dateLabel": "Yesterday",
        "time": "7:10 PM"
      },
      {
        "txnId": "TXN1002",
        "type": "DEBIT",
        "title": "Withdrawal",
        "amount": 500,
        "dateLabel": "Yesterday",
        "time": "7:10 PM"
      },
      {
        "txnId": "TXN1002",
        "type": "DEBIT",
        "title": "Withdrawal",
        "amount": 500,
        "dateLabel": "Yesterday",
        "time": "7:10 PM"
      },
      {
        "txnId": "TXN1002",
        "type": "DEBIT",
        "title": "Withdrawal",
        "amount": 500,
        "dateLabel": "Yesterday",
        "time": "7:10 PM"
      },
      {
        "txnId": "TXN1003",
        "type": "CREDIT",
        "title": "Ride Earning",
        "amount": 200,
        "dateLabel": "Yesterday",
        "time": "4:45 PM"
      }
    ]
  }
}

wallet = this.walletData['data'];

 constructor(private router: Router, private navCtrl: NavController) {
     addIcons({arrowBackOutline,addCircleOutline,removeCircleOutline}); }

  ngOnInit() {
  }

  goBack(){
    this.navCtrl.back();
  }

  gotoRides(){
    this.router.navigate(['/layout/ride-history']);
  }

  gotoHome(){
    this.router.navigate(['/layout/home']);
  }

}
