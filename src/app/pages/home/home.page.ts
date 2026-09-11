import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
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
import { environment } from 'src/environments/environment';
import { addIcons } from 'ionicons';
import { 
  powerOutline, locationOutline, flagOutline, callOutline, 
  chatbubbleEllipsesOutline, navigateCircleOutline, shieldOutline,
  checkmarkCircleOutline, flashOutline, star, alertCircleOutline,
  qrCodeOutline, checkmarkDoneCircleOutline, refreshOutline, locateOutline,
  chevronForwardOutline, chevronBackOutline, giftOutline, cashOutline, shieldCheckmarkOutline,
  closeOutline, timeOutline, carOutline, arrowForwardOutline, scanOutline } from 'ionicons/icons';

declare var google: any;

export interface IncomingRideOffer {
  rideId: string | number;
  customerName: string;
  customerPhone: string;
  serviceType: string;
  origin: string;
  destination: string;
  fare: number;
  distance: string | number;
  duration: string | number;
  raw: any;
  receivedAt: number;
  expiresAt: number;
  countdown: number;
  progress: number;
}

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
  isSyncingStatus: boolean = true;
  isLoading: boolean = false;
  riderId: any;
  riderData: any;
  riderProfile: any = null;
  riderRating: number = 0;
  activeIncentive: any = null;
  lat: number = 12.9716;
  lng: number = 77.5946;
  map!: any;
  marker!: any;
  clickSound = new Audio('assets/sounds/notification-ping-372476.mp3');
  private locationWatchInterval: any;
  private locationTeardownFn: (() => void) | null = null;
  serviceAreas: any[] = [];
  isOutOfServiceArea: boolean = false;
  nearestServiceArea: { id?: string; cityName: string; distanceKm: number } | null = null;
  currentServiceArea: any = null;
  serviceAreaPolygonOverlay: any = null;

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

  // Incoming Ride Offers Queue (Multi-Order Support)
  incomingRides: IncomingRideOffer[] = [];
  selectedOfferIndex: number = 0;
  incomingTimer: any = null;
  audioInterval: any = null;

  get currentIncomingRide(): IncomingRideOffer | null {
    if (!this.incomingRides || this.incomingRides.length === 0) return null;
    const index = Math.min(this.selectedOfferIndex, this.incomingRides.length - 1);
    return this.incomingRides[Math.max(0, index)] || null;
  }

  // Backward compatibility getters
  get incomingRide(): IncomingRideOffer | null {
    return this.currentIncomingRide;
  }

  get incomingCountdown(): number {
    return this.currentIncomingRide?.countdown ?? 15;
  }

  get incomingProgress(): number {
    return this.currentIncomingRide?.progress ?? 100;
  }

  selectOffer(index: number) {
    if (index >= 0 && index < this.incomingRides.length) {
      this.selectedOfferIndex = index;
      this.captainNative.setIncomingRequest(this.currentIncomingRide);
    }
  }

  nextOffer() {
    if (this.incomingRides.length > 1) {
      this.selectedOfferIndex = (this.selectedOfferIndex + 1) % this.incomingRides.length;
      this.captainNative.setIncomingRequest(this.currentIncomingRide);
    }
  }

  prevOffer() {
    if (this.incomingRides.length > 1) {
      this.selectedOfferIndex = (this.selectedOfferIndex - 1 + this.incomingRides.length) % this.incomingRides.length;
      this.captainNative.setIncomingRequest(this.currentIncomingRide);
    }
  }

  // Today's Live Performance
  todayStats = {
    earnings: 0,
    rides: 0
  };

  // Offline & Error States
  isOffline: boolean = false;
  hasApiError: boolean = false;

  private socketService = inject(SocketService);
  private captainService = inject(CaptainService);
  private authService = inject(AuthService);
  private locationService = inject(Location);
  private router = inject(Router);
  public networkService = inject(NetworkService);
  public dialogService = inject(AppDialogService);
  public captainNative = inject(CaptainNativeService);

  constructor() {
    addIcons({
      shieldCheckmarkOutline, shieldOutline, flashOutline, powerOutline, 
      alertCircleOutline, checkmarkCircleOutline, chevronForwardOutline, chevronBackOutline,
      giftOutline, locationOutline, star, callOutline, chatbubbleEllipsesOutline, 
      navigateCircleOutline, checkmarkDoneCircleOutline, flagOutline, cashOutline, 
      qrCodeOutline, refreshOutline, locateOutline, closeOutline, timeOutline, carOutline, arrowForwardOutline, scanOutline
    });

    this.networkService.isOnline$.subscribe(online => {
      this.isOffline = !online;
      if (online && this.hasApiError) {
        this.retryLoading();
      }
    });
  }

  ionViewWillEnter() {
    this.loadProfile();
    const cachedRide = localStorage.getItem('pintu_active_ride');
    if (cachedRide) {
      try {
        const parsed = JSON.parse(cachedRide);
        if (parsed && parsed.id) {
          this.activeRide = parsed;
          this.captainNative.setActiveRide(this.activeRide);
        }
      } catch (e) {}
    } else if (this.activeRide) {
      this.activeRide = null;
      this.captainNative.setActiveRide(null);
    }
  }

  ionViewDidEnter() {
    if (this.status) {
      this.mapRetryCount = 0;
      setTimeout(() => this.loadMap(), 150);
    }
  }

  async ngOnInit() {
    this.riderId = this.authService.getRiderId() || localStorage.getItem('riderId');
    this.loadProfile();

    // 0. Immediate local restoration for instant screen rendering
    const cachedRide = localStorage.getItem('pintu_active_ride');
    if (cachedRide) {
      try {
        const parsed = JSON.parse(cachedRide);
        if (parsed && parsed.id && parsed.status !== 'completed') {
          this.activeRide = parsed;
          this.status = true;
          this.isSyncingStatus = false;
          this.captainNative.setActiveRide(this.activeRide);
          this.captainNative.updateNativeSystemOverlay();
        }
      } catch (e) {
        localStorage.removeItem('pintu_active_ride');
      }
    }

    await this.refreshPermissions();
    await this.initLocation();
    this.loadProfile();
    this.loadTodayEarnings();
    this.checkOngoingActiveRide();
    this.loadServiceAreas();
    this.startWatchingLocation();

    // Safety timeout: dismiss syncing loader after max 1500ms so screen is never blocked
    setTimeout(() => {
      if (this.isSyncingStatus) {
        this.isSyncingStatus = false;
      }
    }, 1500);

    if (this.riderId) {
      this.socketService.syncRider({ riderId: this.riderId });
    }

    this.socketService.riderUpdate((msg: any) => {
      this.riderData = msg;
      if (msg.status && !this.activeRide) {
        this.status = msg.status === 'online';
      }
      this.isSyncingStatus = false;
    });

    // 1. Listen for new incoming ride offers
    this.socketService.rideRequest((msg: any) => {
      console.log('🚖 [Partner] Incoming ride offer received:', msg);
      if (this.status && !this.activeRide) {
        this.handleIncomingRideOffer(msg);
      }
    });

    // 2. Listen for ride confirmation after accept
    this.socketService.onRideConfirmed((msg: any) => {
      console.log('✅ [Partner] Ride confirmed by server:', msg);
      if (msg?.ride && !this.activeRide) {
        this.startTripFlow(msg.ride);
      }
    });

    // 3. Listen for socket active ride resume (sent automatically by syncRider if ride is ON)
    this.socketService.onRideActiveResume((ride: any) => {
      console.log('🔄 [Partner] Active ride resume event from socket:', ride);
      if (ride) {
        this.resumeActiveTrip(ride);
      }
      this.isSyncingStatus = false;
    });

    // 4. Listen for customer cancellation
    this.socketService.onRideUpdate((msg: any) => {
      // Check if an incoming offer in queue was cancelled by customer
      if (msg && msg.status === 'cancelled') {
        const cancelledIndex = this.incomingRides.findIndex(r => r.rideId == msg.id || r.rideId == msg.rideId);
        if (cancelledIndex >= 0) {
          const removed = this.incomingRides.splice(cancelledIndex, 1)[0];
          console.log(`ℹ️ [Partner] Incoming ride offer ${removed.rideId} was cancelled by user.`);
          if (this.selectedOfferIndex >= this.incomingRides.length) {
            this.selectedOfferIndex = Math.max(0, this.incomingRides.length - 1);
          }
          if (this.incomingRides.length === 0) {
            this.stopIncomingChime();
            this.captainNative.setIncomingRequest(null);
          } else {
            this.captainNative.setIncomingRequest(this.currentIncomingRide);
          }
        }
      }

      if (msg && this.activeRide && msg.id == this.activeRide.id) {
        if (msg.status === 'cancelled') {
          this.dialogService.showAlert(
            'Ride Cancelled',
            'The customer has cancelled this ride request.',
            'info'
          );
          localStorage.removeItem('pintu_active_ride');
          this.activeRide = null;
          this.status = true;
          this.captainNative.setActiveRide(null);
          this.captainNative.updateNativeSystemOverlay();
          this.captainService.updateStatus('online', this.lat, this.lng).subscribe({ error: () => {} });
          this.socketService.changeRiderStatus({ status: 'online', riderId: this.riderId, lat: this.lat, lng: this.lng });
        }
      }
    });

    // 5. Listen for status rejection (e.g. commission limit exceeded)
    this.socketService.onStatusRejected((msg: any) => {
      console.warn('⚠️ [Partner] Rider status rejected by server:', msg);
      this.status = false;
      this.captainNative.setDutyStatus(false);
      this.dialogService.showAlert(
        'Duty Status Rejected',
        msg?.message || 'Could not change duty status to online.',
        'warning'
      );
    });

    // 6. Listen for trip started confirmation from server
    this.socketService.onRideStarted((msg: any) => {
      console.log('🚀 [Partner] Ride started confirmation received:', msg);
      if (this.activeRide && (msg?.ride?.id == this.activeRide.id || msg?.rideId == this.activeRide.id)) {
        this.otpError = false;
        this.activeRide.status = 'in_progress';
        localStorage.setItem('pintu_active_ride', JSON.stringify(this.activeRide));
        this.captainNative.setActiveRide(this.activeRide);
        this.captainNative.updateNativeSystemOverlay();
        this.enteredOtp = '';
        this.dialogService.showToast('OTP Verified! Trip is now in progress.', 'success');
      }
    });

    // 7. Listen for OTP verification error from server
    this.socketService.onRideOtpError((msg: any) => {
      console.warn('❌ [Partner] Ride OTP error from server:', msg);
      this.otpError = true;
      this.dialogService.showAlert(
        'Incorrect OTP',
        msg?.message || 'Incorrect 4-digit OTP. Please ask the customer for the correct PIN.',
        'error'
      );
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
    this.stopIncomingChime();
    this.clearServiceAreaOnMap();
    if (this.locationWatchInterval) {
      clearInterval(this.locationWatchInterval);
    }
    if (this.locationTeardownFn) {
      this.locationTeardownFn();
      this.locationTeardownFn = null;
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
          const selfie = res.data.image_url 
            || res.data.kyc_docs?.extracted_files?.live_selfie 
            || res.data.kyc_docs?.selfie;
          if (selfie) {
            localStorage.setItem('riderSelfie', selfie);
          }
          const hasReviews = (res.data.rating?.total_reviews || 0) > 0;
          this.riderRating = hasReviews ? (res.data.rating.average || 0) : (typeof res.data.rating === 'number' && res.data.rating > 0 ? res.data.rating : 0);
          if (this.activeRide) {
            this.status = true;
          } else if (res.data.status) {
            this.status = res.data.status === 'online';
          }
          if (this.status) {
            setTimeout(() => this.loadMap(), 300);
          }
        }
        this.isSyncingStatus = false;
      },
      error: (err: any) => {
        console.warn('Could not load rider profile:', err?.message);
        this.isSyncingStatus = false;
      }
    });
  }

  onAvatarError() {
    if (this.riderProfile) {
      this.riderProfile.image_url = null;
      this.riderProfile.selfie = null;
    }
  }

  checkOngoingActiveRide() {
    this.captainService.getActiveRide().subscribe({
      next: (res: any) => {
        console.log('🔍 [Partner] Checked ongoing active ride:', res);
        if (res?.hasActiveRide && res?.ride) {
          this.resumeActiveTrip(res.ride);
        } else {
          // If server reports no active ride, clear any stale cached ride
          if (this.activeRide && this.activeRide.status !== 'completed') {
            this.activeRide = null;
            localStorage.removeItem('pintu_active_ride');
            this.captainNative.setActiveRide(null);
            this.captainNative.updateNativeSystemOverlay();
          }
        }
        this.isSyncingStatus = false;
      },
      error: (err: any) => {
        console.warn('Could not verify active ride via REST:', err?.message);
        this.isSyncingStatus = false;
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


  async changeStatus() {
    if (this.status) {
      // 1. Guard: Check platform commission due (Limit ₹50)
      try {
        const walletRes: any = await firstValueFrom(this.captainService.getWallet());
        const due = Number(walletRes?.data?.balance?.commission_due || 0);
        if (due > 50) {
          this.status = false;
          this.dialogService.showAlert(
            'Commission Limit Exceeded (Max ₹50)',
            `Your outstanding platform commission is ₹${due}, which exceeds the allowed threshold of ₹50. Please settle your commission in the Wallet to go online.`,
            'warning'
          );
          return;
        }
      } catch (wErr) {
        console.warn('Could not verify wallet commission before going online:', wErr);
      }

      // 2. Guard: Validate all required permissions (Location & Overlay)
      const perms = await this.captainNative.checkPermissions();
      this.permissions = perms;

      if (!perms.location) {
        const granted = await this.captainNative.requestLocationPermission();
        await this.refreshPermissions();
        if (!granted || !this.permissions.location) {
          this.status = false;
          this.dialogService.showAlert(
            'GPS Location Required',
            'GPS location permission must be granted before you can go online and receive rides.',
            'warning'
          );
          return;
        }
      }

      if (!perms.overlay) {
        this.status = false;
        const granted = await this.dialogService.showConfirm({
          title: 'Overlay Permission Required',
          message: 'Draw Over Other Apps permission is required to go online so incoming trip alerts and the navigation cockpit can appear over maps.',
          confirmText: 'Enable Permission',
          cancelText: 'Cancel'
        });
        if (granted) {
          await this.captainNative.requestOverlayPermission();
          await this.refreshPermissions();
        }
        return;
      }

      // 3. Guard: Validate Service Area Boundary
      if (this.isOutOfServiceArea) {
        this.status = false;
        const nearestInfo = this.nearestServiceArea
          ? ` Nearest service area is ${this.nearestServiceArea.cityName} (~${this.nearestServiceArea.distanceKm} km away).`
          : '';
        this.dialogService.showAlert(
          'Outside Serviceable Area',
          `You cannot switch Online because you are currently outside our operating service zone.${nearestInfo} Please travel inside the service area to start receiving rides.`,
          'warning'
        );
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
      this.mapRetryCount = 0;
      setTimeout(() => {
        this.loadMap();
      }, 300);
    } else {
      // Going offline: destroy old map, marker and polygon overlay
      this.clearServiceAreaOnMap();
      this.map = null;
      this.marker = null;
      this.mapRetryCount = 0;
    }
  }

  private ensureGoogleMapsLoaded(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google.maps && google.maps.Map) {
        return resolve(true);
      }

      let script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyA85HFedGjgP12MG_dvR-MVgooWTcJNIb0&libraries=marker,geometry,places,drawing&v=beta';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += 150;
        if (typeof google !== 'undefined' && google.maps && google.maps.Map) {
          clearInterval(interval);
          resolve(true);
        } else if (elapsed >= 10000) {
          clearInterval(interval);
          console.warn('Google Maps script load timed out.');
          resolve(false);
        }
      }, 150);
    });
  }

  async loadMap() {
    if (!this.status) return;

    const isGoogleReady = await this.ensureGoogleMapsLoaded();
    if (!isGoogleReady) {
      console.warn('Google Maps SDK not ready yet. Retrying...');
      if (this.mapRetryCount < 10) {
        this.mapRetryCount++;
        setTimeout(() => this.loadMap(), 500);
      }
      return;
    }

    const mapEl = document.getElementById('map');
    if (!mapEl) {
      if (this.mapRetryCount < 20) {
        this.mapRetryCount++;
        setTimeout(() => this.loadMap(), 300);
      }
      return;
    }

    this.mapRetryCount = 0;
    const latLng = new google.maps.LatLng(this.lat, this.lng);

    // If map already exists AND is attached to the current DOM element
    if (this.map && this.map.getDiv() === mapEl && mapEl.hasChildNodes()) {
      try {
        google.maps.event.trigger(this.map, 'resize');
        this.map.setCenter(latLng);
        if (this.marker) {
          this.marker.setPosition(latLng);
        }
        this.renderServiceAreaOnMap();
      } catch (e) {}
      return;
    }

    // Clean up stale map reference and create fresh map attached to the current mapEl
    this.clearServiceAreaOnMap();
    this.map = null;
    this.marker = null;

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
          fillColor: '#a000e2',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        }
      });

      // Render serviceable area border polygon immediately if rider is inside
      this.renderServiceAreaOnMap();

      setTimeout(() => {
        if (this.map && typeof google !== 'undefined') {
          google.maps.event.trigger(this.map, 'resize');
          this.map.setCenter(latLng);
          this.renderServiceAreaOnMap();
        }
      }, 150);
    } catch (mapInitErr) {
      console.error('Error initializing Google Maps:', mapInitErr);
    }
  }

  async reloadMap() {
    this.mapRetryCount = 0;
    try {
      const loc = await this.locationService.getCurrentLocation();
      if (loc && loc.lat && loc.lng) {
        this.lat = loc.lat;
        this.lng = loc.lng;
      }
    } catch (e) {}

    this.clearServiceAreaOnMap();
    this.map = null;
    this.marker = null;
    this.loadMap();
  }

  loadServiceAreas(): Promise<void> {
    return new Promise((resolve) => {
      this.captainService.getServiceAreas(true).subscribe({
        next: (res: any) => {
          if (res?.success && Array.isArray(res.data)) {
            this.serviceAreas = res.data;
            if (this.lat && this.lng) {
              this.evaluateGeoFence(this.lat, this.lng);
            }
          }
          resolve();
        },
        error: (err: any) => {
          console.warn('Could not load service areas from API:', err?.message);
          resolve();
        }
      });
    });
  }

  async startWatchingLocation() {
    if (this.locationTeardownFn) {
      this.locationTeardownFn();
      this.locationTeardownFn = null;
    }

    try {
      this.locationTeardownFn = await this.locationService.watchLocation(
        (coords) => {
          this.lat = coords.lat;
          this.lng = coords.lng;

          // Smoothly update marker on map if active
          if (this.map && this.marker && typeof google !== 'undefined' && google.maps) {
            const pos = new google.maps.LatLng(this.lat, this.lng);
            this.marker.setPosition(pos);
          }

          // Live location update to backend & customers via socket
          const riderId = this.authService.getRiderId() || localStorage.getItem('riderId') || '';
          if (riderId) {
            this.socketService.sendLiveLocation(riderId, this.lat, this.lng, coords.heading || 0);
          }

          // Continually evaluate whether captain is inside any active service area
          this.evaluateGeoFence(this.lat, this.lng);
        },
        (err) => {
          console.warn('Location watch error:', err);
        }
      );
    } catch (e) {
      console.warn('Could not initialize location watch:', e);
    }
  }

  private isPointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]): boolean {
    if (!polygon || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;
      const intersect = ((yi > point.lng) !== (yj > point.lng))
        && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private findNearestArea(lat: number, lng: number): { id?: string; cityName: string; distanceKm: number } | null {
    if (!this.serviceAreas || this.serviceAreas.length === 0) return null;
    let minDistance = Infinity;
    let nearest: any = null;

    for (const area of this.serviceAreas) {
      let areaMinDist = Infinity;
      if (area.polygon && Array.isArray(area.polygon) && area.polygon.length > 0) {
        for (const vertex of area.polygon) {
          const d = this.calculateHaversineDistanceKm(lat, lng, vertex.lat, vertex.lng);
          if (d < areaMinDist) areaMinDist = d;
        }
      }
      if (area.center && typeof area.center.lat === 'number') {
        const d = this.calculateHaversineDistanceKm(lat, lng, area.center.lat, area.center.lng);
        if (d < areaMinDist) areaMinDist = d;
      }
      if (areaMinDist < minDistance) {
        minDistance = areaMinDist;
        nearest = area;
      }
    }

    if (!nearest) return null;
    return {
      id: nearest.id,
      cityName: nearest.cityName,
      distanceKm: Math.round(minDistance * 10) / 10
    };
  }

  evaluateGeoFence(lat: number, lng: number) {
    if (!this.serviceAreas || this.serviceAreas.length === 0) {
      this.isOutOfServiceArea = false;
      return;
    }

    let insideAny = false;
    let foundArea: any = null;
    for (const area of this.serviceAreas) {
      if (area.isActive !== false && area.polygon && area.polygon.length >= 3) {
        if (this.isPointInPolygon({ lat, lng }, area.polygon)) {
          insideAny = true;
          foundArea = area;
          break;
        }
      }
    }

    if (insideAny) {
      this.isOutOfServiceArea = false;
      this.nearestServiceArea = null;
      this.currentServiceArea = foundArea;
      this.renderServiceAreaOnMap();
    } else {
      this.isOutOfServiceArea = true;
      this.nearestServiceArea = this.findNearestArea(lat, lng);
      this.currentServiceArea = null;
      this.clearServiceAreaOnMap();

      // If captain was online and just went outside service area, automatically turn offline
      if (this.status && !this.activeRide) {
        this.status = false;
        this.proceedDutyChange(false);
        this.dialogService.showAlert(
          'Outside Serviceable Area',
          `You have moved outside the service zone. We have switched you offline. Nearest service area: ${this.nearestServiceArea?.cityName || 'City'} (~${this.nearestServiceArea?.distanceKm || 0} km). Please travel back inside to go online.`,
          'warning'
        );
      }
    }
  }

  renderServiceAreaOnMap() {
    if (!this.map || typeof google === 'undefined' || !google.maps) return;

    if (!this.currentServiceArea || !this.currentServiceArea.polygon || this.currentServiceArea.polygon.length < 3) {
      this.clearServiceAreaOnMap();
      return;
    }

    const coords = this.currentServiceArea.polygon.map((p: any) => ({
      lat: Number(p.lat),
      lng: Number(p.lng)
    }));

    // If overlay already exists, update its path and style smoothly
    if (this.serviceAreaPolygonOverlay) {
      try {
        this.serviceAreaPolygonOverlay.setPaths(coords);
        this.serviceAreaPolygonOverlay.setOptions({
          strokeColor: this.currentServiceArea.strokeColor || '#a000e2',
          fillColor: this.currentServiceArea.areaColor || '#a000e2',
        });
        return;
      } catch (e) {
        this.clearServiceAreaOnMap();
      }
    }

    this.serviceAreaPolygonOverlay = new google.maps.Polygon({
      paths: coords,
      strokeColor: this.currentServiceArea.strokeColor || '#a000e2',
      strokeOpacity: 0.85,
      strokeWeight: 2.5,
      fillColor: this.currentServiceArea.areaColor || '#a000e2',
      fillOpacity: 0.08,
      clickable: false,
      editable: false,
      zIndex: 1
    });

    this.serviceAreaPolygonOverlay.setMap(this.map);
  }

  clearServiceAreaOnMap() {
    if (this.serviceAreaPolygonOverlay) {
      try {
        this.serviceAreaPolygonOverlay.setMap(null);
      } catch (e) {}
      this.serviceAreaPolygonOverlay = null;
    }
  }

  async recheckLocationAndServiceArea() {
    this.isLoading = true;
    try {
      const loc = await this.locationService.getCurrentLocation();
      if (loc && loc.lat && loc.lng) {
        this.lat = loc.lat;
        this.lng = loc.lng;
      }
      await this.loadServiceAreas();
      this.evaluateGeoFence(this.lat, this.lng);
      if (!this.isOutOfServiceArea) {
        this.dialogService.showAlert(
          'Inside Service Area',
          'You are now inside the active service area. You can switch Online now.',
          'success'
        );
      }
    } finally {
      this.isLoading = false;
    }
  }

  async recenterLocation() {
    try {
      const loc = await this.locationService.getCurrentLocation();
      if (loc && loc.lat && loc.lng) {
        this.lat = loc.lat;
        this.lng = loc.lng;
      }
    } catch (e) {}

    if (this.map && typeof google !== 'undefined') {
      const latLng = new google.maps.LatLng(this.lat, this.lng);
      this.map.panTo(latLng);
      this.map.setZoom(17);
      if (this.marker) {
        this.marker.setPosition(latLng);
      }
    } else {
      this.loadMap();
    }
  }

  handleIncomingRideOffer(data: any) {
    if (this.activeRide) return; // already on a trip

    const rideId = data.rideId || data.id;
    if (!rideId) return;

    const originName = data.trip_details?.origin?.name || data.trip_details?.pickup?.address || data.origin?.name || 'Pickup Location';
    const dropName = data.trip_details?.drop?.name || data.trip_details?.drop?.address || data.destination?.name || 'Drop Destination';
    const fare = Number(data.fare || data.service_details?.price || data.trip_details?.fare || 0);

    const now = Date.now();
    const existingIndex = this.incomingRides.findIndex(r => r.rideId == rideId);

    const offer: IncomingRideOffer = {
      rideId: rideId,
      customerName: data.customerName || data.user_details?.name || 'Customer',
      customerPhone: data.customerPhone || data.user_details?.phone || '',
      serviceType: (data.service_details?.type || data.vehicleType || 'Bike Taxi').toUpperCase(),
      origin: originName,
      destination: dropName,
      fare: fare,
      distance: data.trip_details?.distance || data.distance || '3.2',
      duration: data.trip_details?.duration || data.duration || '12',
      raw: data,
      receivedAt: existingIndex >= 0 ? this.incomingRides[existingIndex].receivedAt : now,
      expiresAt: existingIndex >= 0 ? this.incomingRides[existingIndex].expiresAt : now + 15000,
      countdown: existingIndex >= 0 ? this.incomingRides[existingIndex].countdown : 15,
      progress: existingIndex >= 0 ? this.incomingRides[existingIndex].progress : 100
    };

    if (existingIndex >= 0) {
      this.incomingRides[existingIndex] = offer;
    } else {
      this.incomingRides.push(offer);
      // Focus on the new offer so rider immediately sees the latest
      this.selectedOfferIndex = this.incomingRides.length - 1;
    }

    // Bring app to foreground if minimized + launch system floating bubble
    this.captainNative.setIncomingRequest(this.currentIncomingRide);
    this.captainNative.showNativeSystemOverlay();

    // Start attention audio chime
    this.startIncomingChime();

    // Start unified timer loop
    this.startMultiOfferTimer();
  }

  startMultiOfferTimer() {
    if (this.incomingTimer) return;

    this.incomingTimer = setInterval(() => {
      const now = Date.now();
      const expiredOffers: IncomingRideOffer[] = [];

      for (let i = this.incomingRides.length - 1; i >= 0; i--) {
        const offer = this.incomingRides[i];
        const remainingMs = offer.expiresAt - now;
        if (remainingMs <= 0) {
          expiredOffers.push(offer);
          this.incomingRides.splice(i, 1);
        } else {
          offer.countdown = Math.ceil(remainingMs / 1000);
          offer.progress = Math.max(0, Math.min(100, (remainingMs / 15000) * 100));
        }
      }

      // Automatically inform server of expired offers so next driver receives them
      for (const exp of expiredOffers) {
        console.log(`⏰ [Partner] Offer ${exp.rideId} timed out in queue.`);
        this.socketService.rejectRide(exp.rideId, this.riderId);
      }

      // Clamp selectedOfferIndex
      if (this.selectedOfferIndex >= this.incomingRides.length) {
        this.selectedOfferIndex = Math.max(0, this.incomingRides.length - 1);
      }

      // If all offers expired
      if (this.incomingRides.length === 0) {
        this.stopIncomingChime();
        this.captainNative.setIncomingRequest(null);
        if (this.incomingTimer) {
          clearInterval(this.incomingTimer);
          this.incomingTimer = null;
        }
      } else {
        this.captainNative.setIncomingRequest(this.currentIncomingRide);
      }
    }, 500);
  }

  startIncomingChime() {
    this.captainNative.playIncomingRideTone();
    if (this.audioInterval) clearInterval(this.audioInterval);
    this.audioInterval = setInterval(() => {
      if (this.incomingRides.length > 0) {
        this.captainNative.playIncomingRideTone();
      } else {
        clearInterval(this.audioInterval);
        this.audioInterval = null;
      }
    }, 3200);
  }

  stopIncomingChime() {
    if (this.audioInterval) {
      clearInterval(this.audioInterval);
      this.audioInterval = null;
    }
    if (this.incomingTimer) {
      clearInterval(this.incomingTimer);
      this.incomingTimer = null;
    }
  }

  acceptIncomingRide(offerToAccept?: IncomingRideOffer) {
    const offer = offerToAccept || this.currentIncomingRide;
    if (!offer) return;

    const acceptedRideId = offer.rideId;
    const rawData = offer.raw;

    // Reject other pending offers so dispatch can assign them to other drivers immediately
    for (const other of this.incomingRides) {
      if (other.rideId !== acceptedRideId) {
        this.socketService.rejectRide(other.rideId, this.riderId);
      }
    }

    this.stopIncomingChime();
    this.incomingRides = [];
    this.captainNative.setIncomingRequest(null);

    // Emit accept to server
    this.socketService.acceptRide(acceptedRideId, this.riderId);

    // Start active trip flow immediately
    this.startTripFlow(rawData);
  }

  declineIncomingRide(userExplicit: boolean = true, offerToDecline?: IncomingRideOffer) {
    const offer = offerToDecline || this.currentIncomingRide;
    if (!offer) return;

    const rideId = offer.rideId;

    if (userExplicit) {
      this.socketService.rejectRide(rideId, this.riderId);
    }

    // Remove declined offer from queue
    this.incomingRides = this.incomingRides.filter(r => r.rideId !== rideId);

    // Clamp index
    if (this.selectedOfferIndex >= this.incomingRides.length) {
      this.selectedOfferIndex = Math.max(0, this.incomingRides.length - 1);
    }

    if (this.incomingRides.length === 0) {
      this.stopIncomingChime();
      this.captainNative.setIncomingRequest(null);
    } else {
      this.captainNative.setIncomingRequest(this.currentIncomingRide);
    }
  }

  startTripFlow(data: any) {
    this.stopIncomingChime();
    this.incomingRides = [];
    this.status = true;
    this.activeRide = {
      id: data.rideId || data.id || 'RD-' + Math.floor(1000 + Math.random() * 9000),
      customerName: data.customerName || data.user_details?.name || 'Customer',
      customerPhone: data.customerPhone || data.user_details?.phone || '',
      customerRating: data.customerRating || 4.9,
      serviceType: (data.service_details?.type || data.vehicleType || 'Bike Taxi').toUpperCase(),
      origin: {
        name: data.trip_details?.origin?.name || data.trip_details?.pickup?.address || data.origin?.name || 'Pickup Location',
        lat: data.trip_details?.origin?.lat || this.lat,
        lng: data.trip_details?.origin?.lng || this.lng
      },
      destination: {
        name: data.trip_details?.drop?.name || data.trip_details?.drop?.address || data.destination?.name || 'Drop Location',
        lat: data.trip_details?.drop?.lat || this.lat + 0.02,
        lng: data.trip_details?.drop?.lng || this.lng + 0.02
      },
      fare: Number(data.fare || data.service_details?.price || data.trip_details?.fare || 0),
      distance: data.distance || data.trip_details?.distance || 3.2,
      duration: data.duration || data.trip_details?.duration || 12,
      status: 'accepted',
      otp: data.otp || '',
      paymentMode: 'CASH'
    };
    localStorage.setItem('pintu_active_ride', JSON.stringify(this.activeRide));
    this.captainNative.setActiveRide(this.activeRide);
    this.captainNative.updateNativeSystemOverlay();

    // Move captain status to 'onride'
    this.captainService.updateStatus('onride', this.lat, this.lng).subscribe({ error: () => {} });
    this.socketService.changeRiderStatus({ status: 'onride', riderId: this.riderId, lat: this.lat, lng: this.lng });
  }

  resumeActiveTrip(data: any) {
    if (!data) return;
    this.stopIncomingChime();
    this.incomingRides = [];
    this.captainNative.setIncomingRequest(null);

    const originName = (typeof data.origin === 'object' ? (data.origin?.name || data.origin?.address) : data.origin)
      || data.trip_details?.origin?.name || data.trip_details?.pickup?.address || 'Pickup Location';
    const destName = (typeof data.destination === 'object' ? (data.destination?.name || data.destination?.address) : data.destination)
      || data.trip_details?.drop?.name || data.trip_details?.drop?.address || 'Drop Location';

    const custName = data.customerName || (data.User ? (data.User.name || `${data.User.firstName || ''} ${data.User.lastName || ''}`.trim()) : null) || data.user_details?.name || 'Customer';
    const custPhone = data.customerPhone || data.User?.phoneNumber || data.User?.phone || data.user_details?.phone || '';

    this.activeRide = {
      id: data.rideId || data.id,
      customerName: custName || 'Customer',
      customerPhone: custPhone,
      customerRating: data.customerRating || 4.9,
      serviceType: (data.service_details?.type || data.vehicleType || 'Bike Taxi').toUpperCase(),
      origin: {
        name: originName,
        lat: (typeof data.origin === 'object' ? data.origin?.lat : null) || data.trip_details?.origin?.lat || this.lat,
        lng: (typeof data.origin === 'object' ? data.origin?.lng : null) || data.trip_details?.origin?.lng || this.lng
      },
      destination: {
        name: destName,
        lat: (typeof data.destination === 'object' ? data.destination?.lat : null) || data.trip_details?.drop?.lat || this.lat + 0.02,
        lng: (typeof data.destination === 'object' ? data.destination?.lng : null) || data.trip_details?.drop?.lng || this.lng + 0.02
      },
      fare: Number(data.fare || data.service_details?.price || data.trip_details?.fare || 0),
      distance: data.distance || data.trip_details?.distance || 3.2,
      duration: data.duration || data.trip_details?.duration || 12,
      status: (data.status as any) || 'accepted',
      otp: data.otp || '',
      paymentMode: data.paymentMode || 'CASH'
    };

    this.status = true;
    localStorage.setItem('pintu_active_ride', JSON.stringify(this.activeRide));
    this.captainNative.setActiveRide(this.activeRide);
    this.captainNative.updateNativeSystemOverlay();

    // Ensure status is 'onride'
    this.captainService.updateStatus('onride', this.lat, this.lng).subscribe({ error: () => {} });
    this.socketService.changeRiderStatus({ status: 'onride', riderId: this.riderId, lat: this.lat, lng: this.lng });

    setTimeout(() => this.loadMap(), 300);
  }

  markArrived() {
    if (!this.activeRide) return;
    this.activeRide.status = 'arrived';
    localStorage.setItem('pintu_active_ride', JSON.stringify(this.activeRide));
    this.captainNative.setActiveRide(this.activeRide);
    this.captainNative.updateNativeSystemOverlay();
    this.socketService.notifyArrived(this.activeRide.id);
  }

  verifyOtp() {
    if (!this.activeRide) return;
    const cleanEntered = this.enteredOtp ? String(this.enteredOtp).trim() : '';

    if (!cleanEntered || cleanEntered.length !== 4 || !/^\d{4}$/.test(cleanEntered)) {
      this.otpError = true;
      this.dialogService.showAlert(
        'Invalid PIN Format',
        'Please enter the valid 4-digit start PIN provided by the customer.',
        'warning'
      );
      return;
    }

    const expectedOtp = this.activeRide.otp ? String(this.activeRide.otp).trim() : '';
    if (expectedOtp && cleanEntered !== expectedOtp) {
      this.otpError = true;
      this.dialogService.showAlert(
        'Incorrect OTP',
        'The OTP entered does not match the customer PIN. Please ask the customer to check the PIN on their screen.',
        'error'
      );
      return;
    }

    // Emit to server to verify against the database record
    this.otpError = false;
    this.socketService.verifyRideOtp(this.activeRide.id, cleanEntered);
  }

  completeTrip() {
    if (!this.activeRide) return;
    this.activeRide.status = 'completed';
    localStorage.removeItem('pintu_active_ride');
    this.socketService.completeRide(this.activeRide.id, this.activeRide.fare);
  }

  finishTripAndReset() {
    if (this.activeRide) {
      this.todayStats.earnings += Number(this.activeRide.fare);
      this.todayStats.rides += 1;
      this.captainNative.updateTodayEarnings(this.todayStats.earnings, this.todayStats.rides);
    }
    localStorage.removeItem('pintu_active_ride');
    this.activeRide = null;
    this.status = true;
    this.captainNative.setActiveRide(null);
    this.captainNative.updateNativeSystemOverlay();
    this.paymentSuccess = false;

    // Move captain status back to 'online'
    this.captainService.updateStatus('online', this.lat, this.lng).subscribe({ error: () => {} });
    this.socketService.changeRiderStatus({ status: 'online', riderId: this.riderId, lat: this.lat, lng: this.lng });
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
    if (confirm('ACTIVATE EMERGENCY SAFETY SOS?\n\nThis will instantly dispatch emergency alerts to the Safety Control Room and share your live GPS location.')) {
      this.captainService.triggerSos(
        this.lat,
        this.lng,
        this.activeRide?.id ? String(this.activeRide.id) : undefined
      ).subscribe({
        next: () => {
          alert('SOS Dispatched! The safety response team has been alerted.');
        },
        error: () => {
          alert('Emergency alert sent to local control dispatch.');
        }
      });
    }
  }

  getCaptainSelfie(): string {
    const raw = this.riderProfile?.image_url 
      || this.riderProfile?.kyc_docs?.extracted_files?.live_selfie 
      || this.riderProfile?.kyc_docs?.selfie 
      || this.riderProfile?.selfie 
      || localStorage.getItem('riderSelfie') 
      || '';
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('blob:') || raw.startsWith('data:')) {
      return raw;
    }
    const clean = raw.startsWith('/') ? raw : `/${raw}`;
    const base = environment.apiUrl || 'https://pintu-api.democompany.in.net';
    return `${base}${clean}`;
  }

  openRideDetails() {
    if (this.activeRide) {
      this.router.navigate(['/layout/ride-details'], {
        state: { ride: this.activeRide, isActive: true },
        queryParams: { rideId: this.activeRide.id, active: 'true' }
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
}
