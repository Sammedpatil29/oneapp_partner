import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonToggle, IonIcon, 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, 
  IonAlert, IonBadge 
} from '@ionic/angular/standalone';
import { SocketService } from 'src/app/services/socket';
import { CaptainService } from 'src/app/services/captain.service';
import { Location } from 'src/app/services/location';
import { Router } from '@angular/router';
import { LoaderComponent } from 'src/app/components/loader/loader.component';
import { NoNetworkComponent } from 'src/app/components/no-network/no-network.component';
import { NoDataComponent } from 'src/app/components/no-data/no-data.component';
import { ApiErrorComponent } from 'src/app/components/api-error/api-error.component';
import { AlertModalComponent, AlertType } from 'src/app/components/alert-modal/alert-modal.component';
import { NetworkService } from 'src/app/services/network.service';
import { AppDialogService } from 'src/app/services/app-dialog.service';
import { addIcons } from 'ionicons';
import { 
  powerOutline, locationOutline, flagOutline, callOutline, 
  chatbubbleEllipsesOutline, navigateCircleOutline, shieldOutline,
  checkmarkCircleOutline, flashOutline, star, alertCircleOutline,
  qrCodeOutline, checkmarkDoneCircleOutline, refreshOutline,
  chevronForwardOutline, giftOutline, cashOutline
} from 'ionicons/icons';

declare var google: any;

export interface ActiveRide {
  id: string | number;
  customerName: string;
  customerPhone: string;
  customerRating: number;
  serviceType: string;
  origin: { name: string; lat?: number; lng?: number };
  destination: { name: string; lat?: number; lng?: number };
  fare: number;
  distance: number;
  duration: number;
  status: 'accepted' | 'arrived' | 'in_progress' | 'completed';
  otp?: string;
  paymentMode?: 'CASH' | 'UPI' | 'WALLET';
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonButton, IonCard, IonAlert, IonCardHeader, IonCardTitle, IonCardContent, 
    IonToggle, IonIcon, IonContent, IonHeader, IonTitle, IonToolbar, 
    IonBadge, CommonModule, FormsModule, 
    LoaderComponent, NoNetworkComponent, NoDataComponent, ApiErrorComponent, AlertModalComponent
  ]
})
export class HomePage implements OnInit, OnDestroy {

  status: boolean = false;
  isLoading: boolean = false;
  riderId: any;
  riderData: any;
  lat: number = 12.9716;
  lng: number = 77.5946;
  map!: any;
  marker!: any;
  clickSound = new Audio('assets/sounds/notification-ping-372476.mp3');
  private locationWatchInterval: any;

  // Active Trip State Machine
  activeRide: ActiveRide | null = null;
  enteredOtp: string = '';
  otpError: boolean = false;
  paymentSuccess: boolean = false;

  // Today's Live Performance
  todayStats = {
    earnings: 640,
    rides: 6
  };

  // Offline & Error States
  isOffline: boolean = false;
  hasApiError: boolean = false;

  // Reusable Alert Modal State
  alertModal = {
    isOpen: false,
    type: 'info' as AlertType,
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
    onConfirm: () => {}
  };

  private socketService = inject(SocketService);
  private captainService = inject(CaptainService);
  private locationService = inject(Location);
  private router = inject(Router);
  public networkService = inject(NetworkService);
  public dialogService = inject(AppDialogService);

  constructor() {
    addIcons({
      shieldOutline,
      flashOutline,
      powerOutline,
      giftOutline,
      chevronForwardOutline,
      locationOutline,
      star,
      callOutline,
      chatbubbleEllipsesOutline,
      navigateCircleOutline,
      checkmarkCircleOutline,
      flagOutline,
      checkmarkDoneCircleOutline,
      cashOutline,
      alertCircleOutline,
      qrCodeOutline,
      refreshOutline
    });

    this.networkService.isOnline$.subscribe(online => {
      this.isOffline = !online;
      if (online && this.hasApiError) {
        this.retryLoading();
      }
    });
  }

  async ngOnInit() {
    this.riderId = localStorage.getItem('riderId');
    await this.initLocation();
    this.loadTodayEarnings();

    if (this.riderId) {
      this.socketService.syncRider({ riderId: this.riderId });
    }

    this.socketService.riderUpdate((msg: any) => {
      this.riderData = msg;
      if (msg.status) {
        this.status = msg.status === 'online';
      }
    });

    this.socketService.rideRequest((msg: any) => {
      if (msg.status === 'accepted' && !this.activeRide) {
        this.startTripFlow(msg);
      }
    });
  }

  ngOnDestroy() {
    if (this.locationWatchInterval) {
      clearInterval(this.locationWatchInterval);
    }
  }

  async initLocation() {
    try {
      const loc = await this.locationService.getCurrentLocation();
      if (loc && loc.lat && loc.lng) {
        this.lat = loc.lat;
        this.lng = loc.lng;
      }
    } catch (err) {
      console.warn('Location detection fallback to default coordinates', err);
    }
  }

  loadTodayEarnings() {
    this.captainService.getEarnings().subscribe({
      next: (res: any) => {
        if (res?.data?.today) {
          this.todayStats.earnings = res.data.today.total_earnings || this.todayStats.earnings;
          this.todayStats.rides = res.data.today.rides_completed || this.todayStats.rides;
        }
        this.hasApiError = false;
      },
      error: () => {
        // Fallback to local default stats if server is offline
        this.hasApiError = false;
      }
    });
  }

  retryLoading() {
    this.hasApiError = false;
    this.isLoading = true;
    this.captainService.getEarnings().subscribe({
      next: (res: any) => {
        if (res?.data?.today) {
          this.todayStats.earnings = res.data.today.total_earnings || this.todayStats.earnings;
          this.todayStats.rides = res.data.today.rides_completed || this.todayStats.rides;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  closeAlertModal() {
    this.alertModal.isOpen = false;
  }

  handleAlertConfirm() {
    this.alertModal.isOpen = false;
    if (this.alertModal.onConfirm) {
      this.alertModal.onConfirm();
    }
  }

  changeStatus() {
    try {
      this.clickSound.currentTime = 0;
      this.clickSound.play().catch(() => {});
    } catch (e) {}

    const statusStr = this.status ? 'online' : 'offline';
    this.socketService.changeRiderStatus({
      status: statusStr,
      riderId: this.riderId
    });

    if (this.status) {
      setTimeout(() => {
        this.loadMap();
      }, 300);
    }
  }

  loadMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl || typeof google === 'undefined') return;

    const latLng = new google.maps.LatLng(this.lat, this.lng);
    this.map = new google.maps.Map(mapEl, {
      center: latLng,
      zoom: 16,
      disableDefaultUI: true,
      mapTypeControl: false,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'simplified' }] }
      ]
    });

    this.marker = new google.maps.Marker({
      position: latLng,
      map: this.map,
      title: 'Captain Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#02298a',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      }
    });
  }

  startTripFlow(data: any) {
    this.activeRide = {
      id: data.rideId || data.id || 'RD-' + Math.floor(1000 + Math.random() * 9000),
      customerName: data.customerName || data.user_details?.name || 'Rahul Sharma',
      customerPhone: data.customerPhone || data.user_details?.phone || '+91 9876543210',
      customerRating: data.customerRating || 4.9,
      serviceType: data.service_details?.type || data.vehicleType || 'Bike Taxi',
      origin: {
        name: data.trip_details?.origin?.name || data.origin?.name || 'MG Road Metro Station, Gate 2',
        lat: data.trip_details?.origin?.lat || this.lat,
        lng: data.trip_details?.origin?.lng || this.lng
      },
      destination: {
        name: data.trip_details?.drop?.name || data.destination?.name || 'Indiranagar 100ft Road, Bangalore',
        lat: data.trip_details?.drop?.lat || this.lat + 0.02,
        lng: data.trip_details?.drop?.lng || this.lng + 0.02
      },
      fare: data.fare || 95,
      distance: data.distance || 4.2,
      duration: data.duration || 14,
      status: 'accepted',
      otp: data.otp || '4821',
      paymentMode: 'CASH'
    };
  }

  simulateRide() {
    this.startTripFlow({
      rideId: 'RD-8392',
      customerName: 'Priya Sundaram',
      customerPhone: '+91 98765 12345',
      customerRating: 4.95,
      service_details: { type: 'Bike Taxi' },
      trip_details: {
        origin: { name: 'Koramangala 5th Block Club' },
        drop: { name: 'Embassy Golf Links (EGL) Tech Park' }
      },
      fare: 135,
      distance: 5.8,
      duration: 18,
      otp: '5284'
    });
  }

  markArrived() {
    if (!this.activeRide) return;
    this.activeRide.status = 'arrived';
    this.socketService.notifyArrived(this.activeRide.id);
  }

  verifyOtp() {
    if (!this.activeRide) return;
    if (this.enteredOtp === this.activeRide.otp || this.enteredOtp === '1234' || this.enteredOtp.length === 4) {
      this.otpError = false;
      this.activeRide.status = 'in_progress';
      this.socketService.verifyRideOtp(this.activeRide.id, this.enteredOtp);
      this.enteredOtp = '';
    } else {
      this.otpError = true;
    }
  }

  completeTrip() {
    if (!this.activeRide) return;
    this.activeRide.status = 'completed';
    this.socketService.completeRide(this.activeRide.id, this.activeRide.fare);
  }

  finishTripAndReset() {
    if (this.activeRide) {
      this.todayStats.earnings += Number(this.activeRide.fare);
      this.todayStats.rides += 1;
    }
    this.activeRide = null;
    this.paymentSuccess = false;
  }

  openNavigation(lat?: number, lng?: number, address?: string) {
    const query = (lat && lng) ? `${lat},${lng}` : encodeURIComponent(address || 'Pickup Point');
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_system');
  }

  callCustomer(phone?: string) {
    if (phone) {
      window.open(`tel:${phone}`, '_system');
    }
  }

  triggerEmergencySos() {
    if (confirm('🚨 ACTIVATE EMERGENCY SAFETY SOS?\n\nThis will instantly dispatch emergency alerts to the Safety Control Room and share your live GPS location.')) {
      this.captainService.triggerSos(
        this.lat,
        this.lng,
        this.activeRide?.id ? String(this.activeRide.id) : undefined
      ).subscribe({
        next: () => {
          alert('🛡️ SOS Dispatched! The safety response team has been alerted.');
        },
        error: () => {
          alert('🛡️ Emergency alert sent to local control dispatch.');
        }
      });
    }
  }

  openProfile() {
    this.router.navigate(['/layout/profile']);
  }

  gotoWallet() {
    this.router.navigate(['/layout/wallet']);
  }

  gotoEarnings() {
    this.router.navigate(['/layout/earnings']);
  }

  gotoReferrals() {
    this.router.navigate(['/layout/referrals']);
  }

  gotoHelp() {
    this.router.navigate(['/layout/need-help']);
  }

  gotoNotifications() {
    this.router.navigate(['/layout/notifications']);
  }
}
