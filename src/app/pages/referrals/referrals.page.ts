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
  IonCard,
  IonCardContent,
  IonBadge,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shareSocialOutline,
  copyOutline,
  giftOutline,
  peopleOutline,
  checkmarkCircleOutline,
  timeOutline,
  arrowBackOutline,
  sparklesOutline
} from 'ionicons/icons';
import { CaptainService } from 'src/app/services/captain.service';
import { Router } from '@angular/router';
import { LoaderComponent } from 'src/app/components/loader/loader.component';
import { NoNetworkComponent } from 'src/app/components/no-network/no-network.component';
import { NoDataComponent } from 'src/app/components/no-data/no-data.component';
import { ApiErrorComponent } from 'src/app/components/api-error/api-error.component';
import { NetworkService } from 'src/app/services/network.service';

@Component({
  selector: 'app-referrals',
  templateUrl: './referrals.page.html',
  styleUrls: ['./referrals.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonBadge,
    IonProgressBar,
    IonRefresher,
    IonRefresherContent,
    CommonModule,
    FormsModule,
    LoaderComponent,
    NoNetworkComponent,
    NoDataComponent,
    ApiErrorComponent
  ]
})
export class ReferralsPage implements OnInit {
  isLoading: boolean = false;
  isOffline: boolean = false;
  hasApiError: boolean = false;

  referralData: any = {
    referral_code: 'CAPTAIN',
    referral_link: '',
    reward_per_referral: 150,
    reward_condition: 'Earn ₹150 when your friend joins with your code & completes 10 rides within 15 days.',
    total_referred: 0,
    successful_referrals: 0,
    total_rewards_earned: 0,
    friends_list: []
  };

  private captainService = inject(CaptainService);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);
  public networkService = inject(NetworkService);

  constructor() {
    addIcons({
      shareSocialOutline,
      copyOutline,
      giftOutline,
      peopleOutline,
      checkmarkCircleOutline,
      timeOutline,
      arrowBackOutline,
      sparklesOutline
    });

    this.networkService.isOnline$.subscribe(online => {
      this.isOffline = !online;
      if (online && this.hasApiError) {
        this.fetchReferrals();
      }
    });
  }

  ngOnInit() {
    this.fetchReferrals();
  }

  fetchReferrals() {
    this.isLoading = true;
    this.hasApiError = false;
    this.captainService.getReferrals().subscribe({
      next: (res) => {
        if (res?.data) {
          this.referralData = res.data;
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

  handleRefresh(event: any) {
    this.captainService.getReferrals().subscribe({
      next: (res) => {
        if (res?.data) {
          this.referralData = res.data;
        }
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  async copyReferralCode() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(this.referralData.referral_code);
    }
    const toast = await this.toastCtrl.create({
      message: `Referral code ${this.referralData.referral_code} copied to clipboard!`,
      duration: 2000,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
  }

  shareOnWhatsApp() {
    const text = `Join Pintu as a Captain & earn up to ₹35,000/month! Use my referral code *${this.referralData.referral_code}* when registering. Sign up here: ${this.referralData.referral_link}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  goBack() {
    this.router.navigate(['/layout/home']);
  }
}

