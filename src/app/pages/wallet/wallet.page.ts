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
  IonList,
  IonModal,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  addCircleOutline,
  removeCircleOutline,
  walletOutline,
  cashOutline,
  cardOutline,
  checkmarkCircleOutline,
  arrowDownCircleOutline
} from 'ionicons/icons';
import { CaptainService } from 'src/app/services/captain.service';
import { Router } from '@angular/router';

import { LoaderComponent } from 'src/app/components/loader/loader.component';
import { NoNetworkComponent } from 'src/app/components/no-network/no-network.component';
import { NoDataComponent } from 'src/app/components/no-data/no-data.component';
import { ApiErrorComponent } from 'src/app/components/api-error/api-error.component';
import { AlertModalComponent, AlertType } from 'src/app/components/alert-modal/alert-modal.component';
import { NetworkService } from 'src/app/services/network.service';

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonModal,
    CommonModule,
    FormsModule,
    LoaderComponent,
    NoNetworkComponent,
    NoDataComponent,
    ApiErrorComponent,
    AlertModalComponent
  ]
})
export class WalletPage implements OnInit {
  isLoading: boolean = false;
  isOffline: boolean = false;
  hasApiError: boolean = false;

  alertModal = {
    isOpen: false,
    type: 'info' as AlertType,
    title: '',
    message: '',
    confirmText: 'OK',
    showCancel: false
  };

  wallet: any = {
    balance: {
      commission_due: 0,
      available: 0,
      cash_collected_in_hand: 0
    },
    stats: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0
    },
    transactions: []
  };

  showPayModal: boolean = false;
  payAmount: number = 0;
  isProcessingPayment: boolean = false;

  private captainService = inject(CaptainService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private router = inject(Router);
  public networkService = inject(NetworkService);

  constructor() {
    addIcons({
      arrowBackOutline,
      addCircleOutline,
      removeCircleOutline,
      walletOutline,
      cashOutline,
      cardOutline,
      checkmarkCircleOutline,
      arrowDownCircleOutline
    });

    this.networkService.isOnline$.subscribe(online => {
      this.isOffline = !online;
      if (online && this.hasApiError) {
        this.fetchWallet();
      }
    });
  }

  ngOnInit() {
    this.fetchWallet();
  }

  fetchWallet() {
    this.isLoading = true;
    this.hasApiError = false;
    this.captainService.getWallet().subscribe({
      next: (res) => {
        if (res?.data) {
          this.wallet = res.data;
          const due = Number(this.wallet.balance?.commission_due || 0);
          if (due > 0 && !this.payAmount) {
            this.payAmount = due;
          }
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

  openPayNow() {
    const due = Number(this.wallet.balance?.commission_due || 0);
    this.payAmount = due > 0 ? due : 50;
    this.showPayModal = true;
  }

  closePayNow() {
    this.showPayModal = false;
  }

  async processPayment() {
    if (!this.payAmount || this.payAmount <= 0) {
      const toast = await this.toastCtrl.create({
        message: 'Please enter a valid payment amount',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    this.isProcessingPayment = true;
    this.captainService.payCommission(this.payAmount).subscribe({
      next: async (res) => {
        this.isProcessingPayment = false;
        this.showPayModal = false;
        const paid = this.payAmount;

        if (res?.commission_due !== undefined) {
          this.wallet.balance.commission_due = res.commission_due;
        } else {
          this.wallet.balance.commission_due = Math.max(0, (Number(this.wallet.balance?.commission_due) || 0) - paid);
        }

        // Add to recent transactions ledger
        this.wallet.transactions.unshift({
          txnId: `TXN${Date.now()}`,
          title: `Platform Commission Paid`,
          amount: paid,
          type: 'CREDIT',
          category: 'commission_payment',
          dateLabel: 'Just now',
          time: 'Now',
          status: 'SUCCESS'
        });

        const alert = await this.alertCtrl.create({
          header: 'Payment Successful! ✅',
          message: res?.message || `₹${paid} has been paid towards your platform commission.`,
          buttons: ['OK']
        });
        await alert.present();
      },
      error: async (err) => {
        this.isProcessingPayment = false;
        const toast = await this.toastCtrl.create({
          message: err?.error?.message || 'Payment failed. Please try again.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  goBack() {
    this.router.navigate(['/layout/home']);
  }
}

