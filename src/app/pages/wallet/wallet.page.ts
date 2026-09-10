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
      available: 1420,
      pending_settlement: 350,
      cash_collected_in_hand: 280
    },
    stats: {
      today: 580,
      thisWeek: 3840,
      thisMonth: 16450
    },
    payout_account: {
      upi_id: 'captain@okhdfcbank',
      bank_name: 'HDFC Bank',
      account_number: '•••• •••• 4912',
      is_verified: true
    },
    transactions: [
      {
        txnId: "TXN1001",
        type: "CREDIT",
        title: "Ride Earning",
        amount: 120,
        dateLabel: "Today",
        time: "10:32 AM"
      },
      {
        txnId: "TXN1002",
        type: "DEBIT",
        title: "Withdrawal",
        amount: 500,
        dateLabel: "Yesterday",
        time: "7:10 PM"
      },
      {
        txnId: "TXN1003",
        type: "CREDIT",
        title: "Ride Earning",
        amount: 200,
        dateLabel: "Yesterday",
        time: "4:45 PM"
      }
    ]
  };

  showWithdrawModal: boolean = false;
  withdrawAmount: number = 500;
  withdrawUpiId: string = 'captain@okhdfcbank';
  isProcessingPayout: boolean = false;

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
          this.withdrawUpiId = this.wallet.payout_account?.upi_id || 'captain@okhdfcbank';
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

  openWithdraw() {
    this.showWithdrawModal = true;
  }

  closeWithdraw() {
    this.showWithdrawModal = false;
  }

  async processWithdrawal() {
    if (!this.withdrawAmount || this.withdrawAmount <= 0) {
      const toast = await this.toastCtrl.create({
        message: 'Please enter a valid withdrawal amount',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    if (this.withdrawAmount > this.wallet.balance.available) {
      const toast = await this.toastCtrl.create({
        message: 'Withdrawal amount exceeds available balance',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    this.isProcessingPayout = true;
    this.captainService.withdrawEarnings(this.withdrawAmount, this.withdrawUpiId).subscribe({
      next: async (res) => {
        this.isProcessingPayout = false;
        this.showWithdrawModal = false;
        this.wallet.balance.available -= this.withdrawAmount;

        // Add to recent transactions
        this.wallet.transactions.unshift({
          txnId: `TXN${Date.now()}`,
          title: `Payout to ${this.withdrawUpiId}`,
          amount: this.withdrawAmount,
          type: 'DEBIT',
          category: 'withdrawal',
          dateLabel: 'Just now',
          time: 'Now',
          status: 'SUCCESS'
        });

        const alert = await this.alertCtrl.create({
          header: 'Withdrawal Initiated! 💸',
          message: res?.message || `₹${this.withdrawAmount} will be deposited to ${this.withdrawUpiId} in 15 minutes.`,
          buttons: ['Great']
        });
        await alert.present();
      },
      error: async (err) => {
        this.isProcessingPayout = false;
        const toast = await this.toastCtrl.create({
          message: err?.error?.message || 'Payout failed. Try again later.',
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

