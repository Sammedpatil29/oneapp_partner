import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonBadge,
  AlertController
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline,
  walletOutline,
  notificationsOutline,
  giftOutline,
  shieldCheckmarkOutline,
  helpCircleOutline,
  settingsOutline,
  logOutOutline,
  arrowBackOutline,
  star,
  bicycleOutline,
  documentTextOutline,
  chevronForwardOutline,
  callOutline,
  logoWhatsapp
} from 'ionicons/icons';
import { CaptainService, CaptainProfile } from 'src/app/services/captain.service';
import { CaptainNativeService } from 'src/app/services/captain-native.service';
import { LoaderComponent } from 'src/app/components/loader/loader.component';
import { NoNetworkComponent } from 'src/app/components/no-network/no-network.component';
import { NoDataComponent } from 'src/app/components/no-data/no-data.component';
import { ApiErrorComponent } from 'src/app/components/api-error/api-error.component';
import { NetworkService } from 'src/app/services/network.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonBadge,
    CommonModule,
    FormsModule,
    LoaderComponent,
    NoNetworkComponent,
    NoDataComponent,
    ApiErrorComponent
  ]
})
export class ProfilePage implements OnInit {
  riderId = '';
  isLoading: boolean = false;
  isOffline: boolean = false;
  hasApiError: boolean = false;

  captain: CaptainProfile = {
    id: '',
    name: 'Captain',
    contact: '',
    role: 'Captain',
    image_url: '',
    vehicle_number: '',
    vehicle_model: '',
    vehicle_type: 'bike',
    fuel_type: 'petrol',
    join_date: '',
    status: 'offline',
    earnings: 0,
    is_verified: false,
    rating: { average: 0, total_reviews: 0, five_star: 0 },
    performance: {
      acceptance_rate: '100%',
      cancellation_rate: '0%',
      completion_rate: '100%',
      lifetime_rides: 0,
      total_distance_km: 0
    },
    captain_level: 'Captain',
    kyc_docs: {}
  };

  private router = inject(Router);
  private navCtrl = inject(NavController);
  private captainService = inject(CaptainService);
  private alertCtrl = inject(AlertController);
  public networkService = inject(NetworkService);
  public captainNative = inject(CaptainNativeService);

  allPermissionsGranted: boolean = true;

  constructor() {
    addIcons({
      personOutline,
      walletOutline,
      notificationsOutline,
      giftOutline,
      shieldCheckmarkOutline,
      helpCircleOutline,
      settingsOutline,
      logOutOutline,
      arrowBackOutline,
      star,
      bicycleOutline,
      documentTextOutline,
      chevronForwardOutline,
      callOutline,
      logoWhatsapp
    });

    this.networkService.isOnline$.subscribe(online => {
      this.isOffline = !online;
      if (online && this.hasApiError) {
        this.fetchProfile();
      }
    });
  }

  async ngOnInit() {
    this.riderId = localStorage.getItem('riderId') || '';
    this.fetchProfile();
    try {
      const perms = await this.captainNative.checkPermissions();
      this.allPermissionsGranted = perms.allGranted;
    } catch (e) {
      // ignore
    }
  }

  fetchProfile() {
    this.isLoading = true;
    this.hasApiError = false;
    this.captainService.getProfile().subscribe({
      next: (res) => {
        if (res?.data) {
          this.captain = res.data;
        }
        this.isLoading = false;
        this.hasApiError = false;
      },
      error: () => {
        this.isLoading = false;
        this.hasApiError = false;
      }
    });
  }

  gotoPermissions() {
    this.router.navigate(['/layout/permissions']);
  }

  gotoWallet() {
    this.router.navigate(['/layout/wallet']);
  }

  gotoEarnings() {
    this.router.navigate(['/layout/earnings']);
  }

  gotoRideHistory() {
    this.router.navigate(['/layout/ride-history']);
  }

  gotoReferrals() {
    this.router.navigate(['/layout/referrals']);
  }

  gotoNotifications() {
    this.router.navigate(['/layout/notifications']);
  }

  gotoNeedHelp() {
    this.router.navigate(['/layout/need-help']);
  }

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Log Out',
      message: 'Are you sure you want to log out of Pintu Captain?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Log Out',
          role: 'destructive',
          handler: () => {
            localStorage.removeItem('riderJwt');
            localStorage.removeItem('riderId');
            this.navCtrl.navigateRoot(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  goBack() {
    this.navCtrl.back();
  }
}

