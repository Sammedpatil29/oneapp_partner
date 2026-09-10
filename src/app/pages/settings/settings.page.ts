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
  IonToggle
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  shieldCheckmarkOutline,
  layersOutline,
  settingsOutline,
  notificationsOutline,
  informationCircleOutline,
  chevronForwardOutline,
  volumeHighOutline
} from 'ionicons/icons';
import { CaptainNativeService } from 'src/app/services/captain-native.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonToggle,
    CommonModule,
    FormsModule
  ]
})
export class SettingsPage implements OnInit {
  private router = inject(Router);
  private navCtrl = inject(NavController);
  public captainNative = inject(CaptainNativeService);

  bubbleEnabled: boolean = true;
  soundEnabled: boolean = true;
  allPermissionsGranted: boolean = true;

  constructor() {
    addIcons({
      arrowBackOutline,
      shieldCheckmarkOutline,
      layersOutline,
      settingsOutline,
      notificationsOutline,
      informationCircleOutline,
      chevronForwardOutline,
      volumeHighOutline
    });
  }

  async ngOnInit() {
    this.bubbleEnabled = this.captainNative.currentState.enabled;
    try {
      const perms = await this.captainNative.checkPermissions();
      this.allPermissionsGranted = perms.allGranted;
    } catch (e) {}
  }

  toggleBubble() {
    this.bubbleEnabled = !this.bubbleEnabled;
    this.captainNative.toggleBubbleEnabled(this.bubbleEnabled);
  }

  gotoPermissions() {
    this.router.navigate(['/layout/permissions']);
  }

  openSystemSettings() {
    this.captainNative.openAppSettings();
  }

  goBack() {
    this.navCtrl.back();
  }
}

