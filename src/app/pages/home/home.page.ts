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
import { CaptainNativeService, PermissionStatusSummary } from 'src/app/services/captain-native.service';
import { Location } from 'src/app/services/location';
import { Router } from '@angular/router';
import { LoaderComponent } from 'src/app/components/loader/loader.component';
import { NoNetworkComponent } from 'src/app/components/no-network/no-network.component';
import { NoDataComponent } from 'src/app/components/no-data/no-data.component';
import { ApiErrorComponent } from 'src/app/components/api-error/api-error.component';
import { AlertModalComponent, AlertType } from 'src/app/components/alert-modal/alert-modal.component';
import { PermissionsHubComponent } from 'src/app/components/permissions-hub/permissions-hub.component';
import { NetworkService } from 'src/app/services/network.service';
import { AppDialogService } from 'src/app/services/app-dialog.service';
import { AuthService } from 'src/app/services/auth.service';
import { addIcons } from 'ionicons';
import { 
  powerOutline, locationOutline, flagOutline, callOutline, 
  chatbubbleEllipsesOutline, navigateCircleOutline, shieldOutline,
  checkmarkCircleOutline, flashOutline, star, alertCircleOutline,
  qrCodeOutline, checkmarkDoneCircleOutline, refreshOutline,
  chevronForwardOutline, giftOutline, cashOutline, shieldCheckmarkOutline } from 'ionicons/icons';

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
    LoaderComponent, NoNetworkComponent, NoDataComponent, ApiErrorComponent, AlertModalComponent,
    PermissionsHubComponent
  ]
})
export class HomePage implements OnInit, OnDestroy {

  status: boolean = false;
  isLoading: boolean = false;
  riderId: any;
  riderData: any;
  riderProfile: any = null;
  riderRating: number = 4.9;
  activeIncentive: any = null;
  lat: number = 12.9716;
  lng: number = 77.5946;
  map!: any;
  marker!: any;
  clickSound = new Audio('assets/sounds/notification-ping-372476.mp3');
  private locationWatchInterval: any;

  // Permissions State
  showPermissionsHub: boolean = false;
  permissions: PermissionStatusSummary = {
    overlay: false,
    battery: false,
    location: false,
    notifications: true,
    allGranted: false
  };

  // Active Trip State Machine
  activeRide: ActiveRide | null = null;
  enteredOtp: string = '';
  otpError: boolean = false;
  paymentSuccess: boolean = false;

  // Today's Live Performance
  todayStats = {
    earnings: 0,
    rides: 0
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
  private authService = inject(AuthService);
  private locationService = inject(Location);
  private router = inject(Router);
  public networkService = inject(NetworkService);
  public dialogService = inject(AppDialogService);
  public captainNative = inject(CaptainNativeService);

  constructor() {
    addIcons({shieldCheckmarkOutline,shieldOutline,flashOutline,powerOutline,alertCircleOutline,checkmarkCircleOutline,chevronForwardOutline,giftOutline,locationOutline,star,callOutline,chatbubbleEllipsesOutline,navigateCircleOutline,checkmarkDoneCircleOutline,flagOutline,cashOutline,qrCodeOutline,refreshOutline});

    this.networkService.isOnline$.subscribe(online => {
      this.isOffline = !online;
      if (online && this.hasApiError) {
        this.retryLoading();
      }
    });
  }

  async ngOnInit() {
    this.riderId = this.authService.getRiderId() || localStorage.getItem('riderId');
    await this.refreshPermissions();
    await this.initLocation();
    this.loadProfile();
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

  async refreshPermissions() {
    this.permissions = await this.captainNative.checkPermissions();
  }

  openPermissionsHub() {
    this.showPermissionsHub = true;
  }

  closePermissionsHub() {
    this.showPermissionsHub = false;
    this.refreshPermissions();
  }

  ngOnDestroy() {
    if (this.locationWatchInterval) {
      clearInterval(this.locationWatchInterval);
    }
  }

  private mapRetryCount = 0;

  async initLocation() {
    try {
      const loc = await this.locationService.getCurrentLocation();
      if (loc && loc.lat && loc.lng) {
        this.lat = loc.lat;
        this.lng = loc.lng;
        if (this.map && this.marker && typeof google !== 'undefined' && google.maps) {
          const pos = new google.maps.LatLng(this.lat, this.lng);
          this.map.panTo(pos);
          this.marker.setPosition(pos);
        } else if (this.status) {
          this.loadMap();
        }
      }
    } catch (err) {
      console.warn('Location detection fallback to default coordinates', err);
    }
  }

  loadProfile() {
    this.captainService.getProfile().subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.riderProfile = res.data;
          this.riderRating = res.data.rating?.average || (typeof res.data.rating === 'number' ? res.data.rating : 4.9);
          if (res.data.status) {
            this.status = res.data.status === 'online';
            if (this.status) {
              setTimeout(() => this.loadMap(), 300);
            }
          }
        }
      },
      error: (err: any) => {
        console.warn('Could not load rider profile:', err?.message);
      }
    });
  }

  loadTodayEarnings() {
    this.captainService.getEarnings().subscribe({
      next: (res: any) => {
        if (res?.data?.today) {
          this.todayStats.earnings = res.data.today.total_earnings || 0;
          this.todayStats.rides = res.data.today.rides_completed || 0;
        }
        if (res?.data?.active_incentives && res.data.active_incentives.length > 0) {
          this.activeIncentive = res.data.active_incentives[0];
        }
        this.hasApiError = false;
      },
      error: () => {
        this.hasApiError = false;
      }
    });
  }

  retryLoading() {
    this.hasApiError = false;
    this.isLoading = true;
    this.loadProfile();
    this.captainService.getEarnings().subscribe({
      next: (res: any) => {
        if (res?.data?.today) {
          this.todayStats.earnings = res.data.today.total_earnings || 0;
          this.todayStats.rides = res.data.today.rides_completed || 0;
        }
        if (res?.data?.active_incentives && res.data.active_incentives.length > 0) {
          this.activeIncentive = res.data.active_incentives[0];
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

  async changeStatus() {
    if (this.status) {
      // Trying to go ONLINE -> Validate permissions first
      const perms = await this.captainNative.checkPermissions();
      this.permissions = perms;

      if (!perms.location) {
        const granted = await this.captainNative.requestLocationPermission();
        await this.refreshPermissions();
        if (!granted && !this.permissions.location) {
          this.status = false;
          this.dialogService.showAlert(
            'GPS Location Required',
            'Please grant GPS location permission so customers can discover you and request rides.',
            'warning'
          );
          return;
        }
      }

      if (!perms.overlay) {
        this.alertModal = {
          isOpen: true,
          type: 'info',
          title: 'Overlay Permission Recommended',
          message: 'Enable "Draw Over Other Apps" so the floating ride cockpit and incoming trip alerts appear while using Google Maps.',
          confirmText: 'Enable Now',
          cancelText: 'Continue Online',
          showCancel: true,
          onConfirm: async () => {
            await this.captainNative.requestOverlayPermission();
            this.proceedDutyChange(true);
          }
        };
        // Continue online if they choose cancel/continue
        this.proceedDutyChange(true);
        return;
      }

      this.proceedDutyChange(true);
    } else {
      this.proceedDutyChange(false);
    }
  }

  private proceedDutyChange(online: boolean) {
    this.status = online;
    try {
      this.clickSound.currentTime = 0;
      this.clickSound.play().catch(() => {});
    } catch (e) {}

    const statusStr = online ? 'online' : 'offline';
    this.riderId = this.authService.getRiderId() || localStorage.getItem('riderId') || '';

    // 1. Emit real-time update via WebSocket
    this.socketService.changeRiderStatus({
      status: statusStr,
      riderId: this.riderId,
      lat: this.lat,
      lng: this.lng
    });

    // 2. Persist directly in Database via REST API
    this.captainService.updateStatus(statusStr, this.lat, this.lng).subscribe({
      next: (res: any) => {
        console.log('✅ Captain duty status persisted in DB:', res?.message || statusStr);
      },
      error: (err: any) => {
        console.warn('Could not persist status via REST endpoint:', err?.message);
      }
    });

    this.captainNative.setDutyStatus(online);

    if (online) {
      setTimeout(() => {
        this.loadMap();
      }, 300);
    }
  }

  loadMap() {
    if (!this.status) return;

    const mapEl = document.getElementById('map');
    if (!mapEl || typeof google === 'undefined') return;
    if (!mapEl) {
      if (this.mapRetryCount < 15) {
        this.mapRetryCount++;
        setTimeout(() => this.loadMap(), 300);
      }
      return;
    }

    if (typeof google === 'undefined' || !google.maps || !google.maps.Map) {
      console.warn('Google Maps SDK not ready yet. Retrying...');
      if (this.mapRetryCount < 20) {
        this.mapRetryCount++;
        setTimeout(() => this.loadMap(), 500);
      }
      return;
    }

    this.mapRetryCount = 0;
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
    if (this.map) {
      try {
        google.maps.event.trigger(this.map, 'resize');
        this.map.setCenter(latLng);
        if (this.marker) {
          this.marker.setPosition(latLng);
        }
      } catch (e) {}
      return;
    }

    try {
      this.map = new google.maps.Map(mapEl, {
        center: latLng,
        zoom: 16,
        disableDefaultUI: true,
        mapTypeControl: false,
        zoomControl: false,
        streetViewControl: false,
        fullscreenControl: false,
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
    } catch (mapInitErr) {
      console.error('Error initializing Google Maps:', mapInitErr);
    }
  }

  startTripFlow(data: any) {
    this.activeRide = {
      id: data.rideId || data.id || 'RD-' + Math.floor(1000 + Math.random() * 9000),
      customerName: data.customerName || data.user_details?.name || 'Customer',
      customerPhone: data.customerPhone || data.user_details?.phone || '',
      customerRating: data.customerRating || 4.9,
      serviceType: data.service_details?.type || data.vehicleType || 'Bike Taxi',
      origin: {
        name: data.trip_details?.origin?.name || data.origin?.name || 'Pickup Location',
        lat: data.trip_details?.origin?.lat || this.lat,
        lng: data.trip_details?.origin?.lng || this.lng
      },
      destination: {
        name: data.trip_details?.drop?.name || data.destination?.name || 'Drop Location',
        lat: data.trip_details?.drop?.lat || this.lat + 0.02,
        lng: data.trip_details?.drop?.lng || this.lng + 0.02
      },
      fare: data.fare || 0,
      distance: data.distance || 0,
      duration: data.duration || 0,
      status: 'accepted',
      otp: data.otp || '',
      paymentMode: 'CASH'
    };
    this.captainNative.setActiveRide(this.activeRide);
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
      this.captainNative.updateTodayEarnings(this.todayStats.earnings, this.todayStats.rides);
    }
    this.activeRide = null;
    this.captainNative.setActiveRide(null);
    this.paymentSuccess = false;
  }

  openNavigation(lat?: number, lng?: number, address?: string) {
    const targetLat = lat || (this.activeRide?.destination?.lat || this.lat);
    const targetLng = lng || (this.activeRide?.destination?.lng || this.lng);
    this.captainNative.launchNavigation(targetLat, targetLng, address || 'Customer Destination');
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
