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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonProgressBar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  trendingUpOutline,
  timeOutline,
  bicycleOutline,
  ribbonOutline,
  sparklesOutline,
  chevronForwardOutline,
  arrowBackOutline
} from 'ionicons/icons';
import { CaptainService, EarningsData } from 'src/app/services/captain.service';
import { Router } from '@angular/router';

import { LoaderComponent } from 'src/app/components/loader/loader.component';
import { NoNetworkComponent } from 'src/app/components/no-network/no-network.component';
import { NoDataComponent } from 'src/app/components/no-data/no-data.component';
import { ApiErrorComponent } from 'src/app/components/api-error/api-error.component';
import { NetworkService } from 'src/app/services/network.service';

@Component({
  selector: 'app-earnings',
  templateUrl: './earnings.page.html',
  styleUrls: ['./earnings.page.scss'],
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
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonProgressBar,
    CommonModule,
    FormsModule,
    LoaderComponent,
    NoNetworkComponent,
    NoDataComponent,
    ApiErrorComponent
  ]
})
export class EarningsPage implements OnInit {
  selectedPeriod: 'today' | 'week' | 'month' = 'today';
  isLoading: boolean = false;
  hasApiError: boolean = false;
  isOffline: boolean = false;

  earningsData: EarningsData = {
    today: {
      total_earnings: 0,
      rides_completed: 0,
      hours_online: '0.0 hrs',
      fare_earnings: 0,
      tips: 0,
      incentives: 0
    },
    this_week: {
      total_earnings: 0,
      rides_completed: 0,
      chart_data: [
        { day: 'Mon', amount: 0, rides: 0 },
        { day: 'Tue', amount: 0, rides: 0 },
        { day: 'Wed', amount: 0, rides: 0 },
        { day: 'Thu', amount: 0, rides: 0 },
        { day: 'Fri', amount: 0, rides: 0 },
        { day: 'Sat', amount: 0, rides: 0 },
        { day: 'Sun', amount: 0, rides: 0 }
      ]
    },
    this_month: {
      total_earnings: 0,
      rides_completed: 0
    },
    active_incentives: []
  };

  private captainService = inject(CaptainService);
  private router = inject(Router);
  public networkService = inject(NetworkService);

  constructor() {
    addIcons({
      walletOutline,
      trendingUpOutline,
      timeOutline,
      bicycleOutline,
      ribbonOutline,
      sparklesOutline,
      chevronForwardOutline,
      arrowBackOutline
    });

    this.networkService.isOnline$.subscribe(online => {
      this.isOffline = !online;
      if (online && this.hasApiError) {
        this.fetchEarnings();
      }
    });
  }

  ngOnInit() {
    this.fetchEarnings();
  }

  fetchEarnings() {
    this.isLoading = true;
    this.hasApiError = false;
    this.captainService.getEarnings().subscribe({
      next: (res) => {
        if (res?.data) {
          this.earningsData = res.data;
        }
        this.isLoading = false;
        this.hasApiError = false;
      },
      error: () => {
        this.isLoading = false;
        // Don't break UI if offline or error, keep local defaults
        this.hasApiError = false;
      }
    });
  }

  getMaxChartAmount(): number {
    if (!this.earningsData.this_week.chart_data.length) return 1000;
    return Math.max(...this.earningsData.this_week.chart_data.map(d => d.amount), 1000);
  }

  gotoWallet() {
    this.router.navigate(['/layout/wallet']);
  }

  goBack() {
    this.router.navigate(['/layout/home']);
  }
}

