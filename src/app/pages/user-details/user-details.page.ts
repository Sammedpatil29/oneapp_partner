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

import { CaptainService } from 'src/app/services/captain.service';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.page.html',
  styleUrls: ['./user-details.page.scss'],
  standalone: true,
  imports: [IonNote, IonItem, IonLabel, IonListHeader, IonList, IonBackButton, IonIcon, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class UserDetailsPage implements OnInit {
  isLoading: boolean = false;
  profile: any = {
    user: {
      name: '',
      phone: '',
      phoneVerified: false,
      email: '',
      emailVerified: false,
      riderId: '',
      kycStatus: 'PENDING',
      userStatus: 'ACTIVE',
      rating: 0
    },
    vehicle: {
      type: 'Bike',
      model: '',
      number: '',
      fuelType: 'Petrol',
      rcStatus: 'PENDING'
    }
  };

  constructor(
    private router: Router,
    private navctrl: NavController,
    private captainService: CaptainService
  ) {
    addIcons({ arrowBackOutline, personOutline, bicycleOutline });
  }

  ngOnInit() {
    this.fetchProfile();
  }

  fetchProfile() {
    this.isLoading = true;
    this.captainService.getProfile().subscribe({
      next: (res: any) => {
        if (res?.data) {
          const d = res.data;
          this.profile = {
            user: {
              name: d.name || 'Captain',
              phone: d.contact ? `+91 ${d.contact}` : '',
              phoneVerified: !!d.contact,
              email: d.email || '',
              emailVerified: !!d.email,
              riderId: d.id || '',
              kycStatus: d.is_verified ? 'VERIFIED' : 'PENDING',
              userStatus: d.status === 'online' || d.status === 'offline' ? 'ACTIVE' : (d.status || 'ACTIVE').toUpperCase(),
              rating: (d.rating?.total_reviews > 0 ? d.rating.average : (typeof d.rating === 'number' && d.rating > 0 ? d.rating : 0))
            },
            vehicle: {
              type: (d.vehicle_type || 'bike').toUpperCase(),
              model: d.vehicle_model || 'Not Specified',
              number: d.vehicle_number || 'Not Specified',
              fuelType: (d.fuel_type || 'petrol').toUpperCase(),
              rcStatus: d.kyc_docs?.checklist?.vehicle_rc === 'verified' ? 'VERIFIED' : 'PENDING'
            }
          };
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  goBack() {
    this.navctrl.back();
  }
}

