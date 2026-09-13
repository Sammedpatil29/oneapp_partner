import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ToastController } from '@ionic/angular/standalone';
import { AlertType } from 'src/app/components/alert-modal/alert-modal.component';

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export interface GlobalAlertState {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  showCancel: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const CLOSED_STATE: GlobalAlertState = {
  isOpen: false,
  type: 'info',
  title: '',
  message: '',
  confirmText: 'OK',
  cancelText: 'Cancel',
  showCancel: false
};

@Injectable({
  providedIn: 'root'
})
export class AppDialogService {
  private _state = new BehaviorSubject<GlobalAlertState>(CLOSED_STATE);
  readonly state$ = this._state.asObservable();

  constructor(private toastCtrl: ToastController) {}

  // ─── Simple Alert (one button, centred) ───────────────────────────────────
  showAlert(
    title: string,
    message: string,
    type: AlertType = 'info',
    confirmText: string = 'OK'
  ): Promise<void> {
    return new Promise((resolve) => {
      this._state.next({
        isOpen: true,
        type,
        title,
        message,
        confirmText,
        cancelText: 'Cancel',
        showCancel: false,
        onConfirm: () => resolve(),
        onCancel: () => resolve()
      });
    });
  }

  // ─── Confirm Dialog (two buttons side-by-side) ───────────────────────────
  showConfirm(options: DialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this._state.next({
        isOpen: true,
        type: 'confirm',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Yes',
        cancelText: options.cancelText || 'No',
        showCancel: true,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }

  // ─── Danger Confirm (destructive — e.g. logout, delete) ──────────────────
  showDangerConfirm(options: DialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this._state.next({
        isOpen: true,
        type: 'warning',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Yes, Proceed',
        cancelText: options.cancelText || 'Cancel',
        showCancel: true,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }

  // ─── Called by layout when the modal resolves ─────────────────────────────
  confirm() {
    const cb = this._state.value.onConfirm;
    this._state.next(CLOSED_STATE);
    if (cb) cb();
  }

  cancel() {
    const cb = this._state.value.onCancel;
    this._state.next(CLOSED_STATE);
    if (cb) cb();
  }

  // ─── Toast notification (non-blocking) ───────────────────────────────────
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


