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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonModal,
  IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  locationOutline,
  flagOutline,
  timeOutline,
  bicycleOutline,
  cubeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  star,
  cashOutline,
  receiptOutline, navigateOutline } from 'ionicons/icons';
import { CaptainService } from 'src/app/services/captain.service';
import { Router } from '@angular/router';

import { LoaderComponent } from 'src/app/components/loader/loader.component';
import { NoNetworkComponent } from 'src/app/components/no-network/no-network.component';
import { NoDataComponent } from 'src/app/components/no-data/no-data.component';
import { ApiErrorComponent } from 'src/app/components/api-error/api-error.component';
import { NetworkService } from 'src/app/services/network.service';

@Component({
  selector: 'app-ride-history',
  templateUrl: './ride-history.page.html',
  styleUrls: ['./ride-history.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonModal,
    IonBadge,
    CommonModule,
    FormsModule,
    LoaderComponent,
    NoNetworkComponent,
    NoDataComponent,
    ApiErrorComponent
  ]
})
export class RideHistoryPage implements OnInit {
  selectedFilter: string = 'all';
  rides: any[] = [];
  selectedRide: any = null;
  showDetailsModal: boolean = false;
  isLoading: boolean = false;
  isOffline: boolean = false;
  hasApiError: boolean = false;

  summary = {
    totalRides: 0,
    totalEarnings: 0,
    rating: 0
  };

  private captainService = inject(CaptainService);
  private router = inject(Router);
  public networkService = inject(NetworkService);

  constructor() {
    addIcons({arrowBackOutline,bicycleOutline,navigateOutline,locationOutline,flagOutline,timeOutline,cubeOutline,checkmarkCircleOutline,closeCircleOutline,star,cashOutline,receiptOutline});

    this.networkService.isOnline$.subscribe(online => {
      this.isOffline = !online;
      if (online && this.hasApiError) {
        this.fetchRides();
      }
    });
  }

  ngOnInit() {
    this.fetchRides();
  }

  fetchRides() {
    this.isLoading = true;
    this.hasApiError = false;
    this.captainService.getRideHistory(this.selectedFilter).subscribe({
      next: (res) => {
        this.rides = res?.data || [];
        if (res?.summary) {
          this.summary = res.summary;
        } else {
          this.summary.totalRides = this.rides.length;
          this.summary.totalEarnings = this.rides.reduce((acc: number, r: any) => acc + (r.amount || r.fare || 0), 0);
        }
        this.isLoading = false;
        this.hasApiError = false;
      },
      error: () => {
        this.rides = [];
        this.isLoading = false;
        this.hasApiError = false;
      }
    });
  }

  onFilterChange() {
    this.fetchRides();
  }

  openRideDetails(ride: any) {
    this.selectedRide = ride;
    this.showDetailsModal = true;
  }

  closeRideDetails() {
    this.showDetailsModal = false;
  }

  goBack() {
    this.router.navigate(['/layout/home']);
  }
}


