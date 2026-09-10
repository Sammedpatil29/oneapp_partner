import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  shieldCheckmark, checkmarkCircle, alertCircle, 
  browsersOutline, batteryChargingOutline, navigateCircleOutline, 
  layersOutline, arrowForward, refreshOutline, close 
} from 'ionicons/icons';
import { CaptainNativeService, PermissionStatusSummary } from 'src/app/services/captain-native.service';

@Component({
  selector: 'app-permissions-hub',
  templateUrl: './permissions-hub.component.html',
  styleUrls: ['./permissions-hub.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class PermissionsHubComponent implements OnInit {
  private captainNative = inject(CaptainNativeService);

  @Output() closed = new EventEmitter<void>();

  permissions: PermissionStatusSummary = {
    overlay: false,
    battery: false,
    location: false,
    notifications: true,
    allGranted: false
  };

  bubbleEnabled: boolean = true;

  constructor() {
    addIcons({
      shieldCheckmark, checkmarkCircle, alertCircle,
      browsersOutline, batteryChargingOutline, navigateCircleOutline,
      layersOutline, arrowForward, refreshOutline, close
    });
  }

  async ngOnInit() {
    await this.refreshPermissions();
    this.bubbleEnabled = this.captainNative.currentState.enabled;
  }

  async refreshPermissions() {
    this.permissions = await this.captainNative.checkPermissions();
  }

  async grantOverlay() {
    await this.captainNative.requestOverlayPermission();
    setTimeout(() => this.refreshPermissions(), 1500);
  }

  async grantBattery() {
    await this.captainNative.requestBatteryOptimizationBypass();
    setTimeout(() => this.refreshPermissions(), 1500);
  }

  async openGpsSettings() {
    await this.captainNative.openLocationSettings();
    setTimeout(() => this.refreshPermissions(), 1500);
  }

  toggleBubble() {
    this.bubbleEnabled = !this.bubbleEnabled;
    this.captainNative.toggleBubbleEnabled(this.bubbleEnabled);
  }

  close() {
    this.closed.emit();
  }
}

