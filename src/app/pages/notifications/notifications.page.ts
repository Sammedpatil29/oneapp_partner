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
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  notificationsOutline,
  flameOutline,
  giftOutline,
  shieldCheckmarkOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { CaptainService } from 'src/app/services/captain.service';
import { Router } from '@angular/router';
import { LoaderComponent } from 'src/app/components/loader/loader.component';
import { NoNetworkComponent } from 'src/app/components/no-network/no-network.component';
import { NoDataComponent } from 'src/app/components/no-data/no-data.component';
import { ApiErrorComponent } from 'src/app/components/api-error/api-error.component';
import { NetworkService } from 'src/app/services/network.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    CommonModule,
    FormsModule,
    LoaderComponent,
    NoNetworkComponent,
    NoDataComponent,
    ApiErrorComponent
  ]
})
export class NotificationsPage implements OnInit {
  notifications: any[] = [];
  isLoading: boolean = false;
  isOffline: boolean = false;
  hasApiError: boolean = false;

  private captainService = inject(CaptainService);
  private router = inject(Router);
  public networkService = inject(NetworkService);

  constructor() {
    addIcons({
      arrowBackOutline,
      notificationsOutline,
      flameOutline,
      giftOutline,
      shieldCheckmarkOutline,
      informationCircleOutline
    });

    this.networkService.isOnline$.subscribe(online => {
      this.isOffline = !online;
      if (online && this.hasApiError) {
        this.fetchNotifications();
      }
    });
  }

  ngOnInit() {
    this.fetchNotifications();
  }

  fetchNotifications() {
    this.isLoading = true;
    this.hasApiError = false;
    this.captainService.getNotifications().subscribe({
      next: (res) => {
        if (res?.data) {
          this.notifications = res.data;
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

  getIcon(type: string): string {
    switch (type) {
      case 'surge': return 'flame-outline';
      case 'reward': return 'gift-outline';
      case 'safety': return 'shield-checkmark-outline';
      default: return 'information-circle-outline';
    }
  }

  getIconColor(type: string): string {
    switch (type) {
      case 'surge': return 'danger';
      case 'reward': return 'warning';
      case 'safety': return 'success';
      default: return 'primary';
    }
  }

  goBack() {
    this.router.navigate(['/layout/home']);
  }
}

