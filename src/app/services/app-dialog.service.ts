import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular/standalone';

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppDialogService {
  constructor(
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  /**
   * Shows an Alert popup
   */
  async showAlert(title: string, message: string, buttonText: string = 'OK'): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: title,
      message,
      buttons: [
        {
          text: buttonText,
          role: 'confirm'
        }
      ],
      cssClass: 'custom-partner-alert'
    });
    await alert.present();
    await alert.onDidDismiss();
  }

  /**
   * Shows a Confirmation popup with OK & Cancel
   */
  async showConfirm(options: DialogOptions): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: options.title,
        message: options.message,
        buttons: [
          {
            text: options.cancelText || 'Cancel',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: options.confirmText || 'Confirm',
            role: 'confirm',
            handler: () => resolve(true)
          }
        ],
        cssClass: 'custom-partner-alert'
      });
      await alert.present();
    });
  }

  /**
   * Shows a Toast message notification
   */
  async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'primary' | 'medium' = 'primary',
    duration: number = 3000
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'bottom',
      buttons: [{ text: '✕', role: 'cancel' }]
    });
    await toast.present();
  }
}

