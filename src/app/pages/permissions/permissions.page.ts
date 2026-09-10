import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
  IonSpinner
} from '@ionic/angular/standalone';
import { NavController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  shieldCheckmark,
  alertCircleOutline,
  alertCircle,
  navigateCircleOutline,
  browsersOutline,
  batteryChargingOutline,
  notificationsOutline,
  settingsOutline,
  refreshOutline,
  arrowBackOutline,
  checkmarkCircle,
  closeCircle,
  informationCircleOutline,
  layersOutline,
  phonePortraitOutline,
  openOutline,
  sparklesOutline
} from 'ionicons/icons';
import { CaptainNativeService, PermissionStatusSummary } from 'src/app/services/captain-native.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-permissions',
  templateUrl: './permissions.page.html',
  styleUrls: ['./permissions.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonBadge,
    IonSpinner
  ]
})
export class PermissionsPage implements OnInit, OnDestroy {
  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);
  public captainNative = inject(CaptainNativeService);

  isRefreshing: boolean = false;
  bubbleEnabled: boolean = true;
  appVersion: string = '0.0.6';
  appBuildNumber: number = 3;
  apiUrl: string = environment.apiUrl;

  permissions: PermissionStatusSummary = {
    overlay: false,
    battery: false,
    location: false,
    notifications: true,
    allGranted: false
  };

  private pollInterval: any;

  constructor() {
    addIcons({
      shieldCheckmarkOutline,
      shieldCheckmark,
      alertCircleOutline,
      alertCircle,
      navigateCircleOutline,
      browsersOutline,
      batteryChargingOutline,
      notificationsOutline,
      settingsOutline,
      refreshOutline,
      arrowBackOutline,
      checkmarkCircle,
      closeCircle,
      informationCircleOutline,
      layersOutline,
      phonePortraitOutline,
      openOutline,
      sparklesOutline
    });
  }

  async ngOnInit() {
    this.bubbleEnabled = this.captainNative.currentState.enabled;
    await this.refreshPermissions(false);

    // Auto-refresh when user returns to app from system settings
    this.pollInterval = setInterval(() => {
      this.refreshPermissions(false);
    }, 3000);
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  async refreshPermissions(showToast: boolean = true) {
    this.isRefreshing = true;
    try {
      this.permissions = await this.captainNative.checkPermissions();
      if (showToast) {
        const toast = await this.toastCtrl.create({
          message: this.permissions.allGranted
            ? '✅ All driver permissions are active and verified!'
            : '⚠️ Some permissions are still missing.',
          duration: 2000,
          position: 'bottom',
          color: this.permissions.allGranted ? 'success' : 'warning'
        });
        await toast.present();
      }
    } catch (e) {
      console.warn('Error refreshing permissions:', e);
    } finally {
      this.isRefreshing = false;
    }
  }

  async grantGps() {
    const granted = await this.captainNative.requestLocationPermission();
    await this.refreshPermissions(false);
    if (!granted) {
      await this.captainNative.openLocationSettings();
    }
  }

  async openLocationSettings() {
    await this.captainNative.openLocationSettings();
  }

  async grantOverlay() {
    await this.captainNative.requestOverlayPermission();
    setTimeout(() => this.refreshPermissions(false), 1500);
  }

  async grantBattery() {
    await this.captainNative.requestBatteryOptimizationBypass();
    setTimeout(() => this.refreshPermissions(false), 1500);
  }

  async openAppSettings() {
    await this.captainNative.openAppSettings();
  }

  toggleBubble() {
    this.bubbleEnabled = !this.bubbleEnabled;
    this.captainNative.toggleBubbleEnabled(this.bubbleEnabled);
  }

  goBack() {
    this.navCtrl.back();
  }
}
