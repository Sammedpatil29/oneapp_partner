import { Injectable, NgZone, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { OtaKit } from '@otakit/capacitor-updater';

const OTA_UPDATE_FLAG = 'pintu_partner_ota_just_updated';
const OTA_UPDATE_VERSION_KEY = 'pintu_partner_ota_new_version';

@Injectable({
  providedIn: 'root'
})
export class OtaService {
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private ngZone = inject(NgZone);

  private isApplyingUpdate = false;

  /**
   * Initializes OtaKit on native device, confirms current bundle,
   * and displays the update completion alert if just updated.
   */
  async initialize() {
    if (!Capacitor.isNativePlatform()) {
      console.log('ℹ️ [OtaKit] Running in browser, skipping native OTA checks.');
      // Check simulation flag on web
      this.checkAndShowPostUpdateAlert();
      return;
    }

    try {
      // 1. Notify OtaKit that the app started successfully (prevents automatic rollback)
      await OtaKit.notifyAppReady();
      console.log('✅ [OtaKit] notifyAppReady confirmed');
    } catch (e) {
      console.warn('[OtaKit] notifyAppReady warning:', e);
    }

    // 2. Check if the app was just relaunched after an OTA update
    this.checkAndShowPostUpdateAlert();

    // 3. Setup silent background OTA checks & auto-relaunch
    this.setupOtaUpdates();
  }

  /**
   * Shows a confirmation alert if the app just relaunched from an OTA update
   */
  private async checkAndShowPostUpdateAlert() {
    const justUpdated = localStorage.getItem(OTA_UPDATE_FLAG);
    if (justUpdated === 'true') {
      const version = localStorage.getItem(OTA_UPDATE_VERSION_KEY) || '';
      localStorage.removeItem(OTA_UPDATE_FLAG);
      localStorage.removeItem(OTA_UPDATE_VERSION_KEY);

      setTimeout(async () => {
        try {
          const alert = await this.alertCtrl.create({
            header: '🎉 Update Completed!',
            subHeader: version ? `Version v${version}` : 'Latest Version Installed',
            message: 'Pintu Partner has been successfully updated. All new features and optimizations are now active.',
            buttons: [
              {
                text: 'Awesome, Let\'s Ride',
                role: 'confirm'
              }
            ],
            backdropDismiss: false
          });
          await alert.present();
        } catch (err) {
          console.warn('Could not present post-update alert:', err);
        }
      }, 1200);
    }
  }

  private async setupOtaUpdates() {
    try {
      // 1. Listen for download completion (staged bundle)
      await OtaKit.addListener('updateStaged', (event) => {
        this.ngZone.run(() => {
          const version = event.bundle?.version || '';
          console.log('📦 [Partner OtaKit] Bundle download completed & staged:', version);
          this.relaunchAndApplyUpdate(version);
        });
      });

      // 2. Check if an update was already staged previously
      const state = await OtaKit.getState();
      if (state.staged) {
        this.ngZone.run(() => {
          console.log('📦 [Partner OtaKit] Found previously staged bundle. Relaunching now.');
          this.relaunchAndApplyUpdate(state.staged?.version || '');
        });
        return;
      }

      // 3. Perform background check & download
      const check = await OtaKit.check();
      if (check.kind === 'update_available') {
        console.log('🚀 [Partner OtaKit] New update available:', check.latest?.version);
        // Automatically download bundle in background
        await OtaKit.download();
      } else if (check.kind === 'already_staged') {
        this.ngZone.run(() => {
          this.relaunchAndApplyUpdate(check.latest?.version || '');
        });
      }
    } catch (err) {
      console.warn('[Partner OtaKit] Silent update setup error:', err);
    }
  }

  /**
   * Automatically relaunches the app and marks the post-update alert flag
   */
  private async relaunchAndApplyUpdate(version: string) {
    if (this.isApplyingUpdate) return;
    this.isApplyingUpdate = true;

    try {
      // Set flag so next startup shows the update completed alert
      localStorage.setItem(OTA_UPDATE_FLAG, 'true');
      if (version) {
        localStorage.setItem(OTA_UPDATE_VERSION_KEY, version);
      }

      console.log('🔄 [Partner OtaKit] Relaunching app with new bundle...');

      // Optional short toast before reload
      try {
        const toast = await this.toastCtrl.create({
          message: 'Update downloaded! Restarting Pintu Partner...',
          duration: 1500,
          position: 'top',
          color: 'success'
        });
        await toast.present();
      } catch (tErr) {
        // continue
      }

      // Small delay to let toast show then apply & relaunch
      setTimeout(async () => {
        try {
          await OtaKit.apply();
        } catch (applyErr) {
          console.error('[Partner OtaKit] Failed to apply update bundle:', applyErr);
          window.location.reload();
        }
      }, 1000);
    } catch (e) {
      console.error('[Partner OtaKit] Error in relaunch flow:', e);
      this.isApplyingUpdate = false;
    }
  }
}
