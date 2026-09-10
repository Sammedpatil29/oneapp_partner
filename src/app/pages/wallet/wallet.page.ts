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
  arrowDownCircleOutline, phonePortraitOutline } from 'ionicons/icons';
import { CaptainService } from 'src/app/services/captain.service';
import { Router } from '@angular/router';

import { LoaderComponent } from 'src/app/components/loader/loader.component';
import { NoNetworkComponent } from 'src/app/components/no-network/no-network.component';
import { NoDataComponent } from 'src/app/components/no-data/no-data.component';
import { ApiErrorComponent } from 'src/app/components/api-error/api-error.component';
import { AlertModalComponent, AlertType } from 'src/app/components/alert-modal/alert-modal.component';
import { NetworkService } from 'src/app/services/network.service';
import { CaptainNativeService, UpiAppInfo } from 'src/app/services/captain-native.service';
import { environment } from 'src/environments/environment';

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

  installedUpiApps: UpiAppInfo[] = [];
  selectedUpiApp: string | null = null;

  private captainService = inject(CaptainService);
  private captainNative = inject(CaptainNativeService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private router = inject(Router);
  public networkService = inject(NetworkService);

  constructor() {
    addIcons({arrowBackOutline,walletOutline,cardOutline,cashOutline,phonePortraitOutline,addCircleOutline,removeCircleOutline,checkmarkCircleOutline,arrowDownCircleOutline});

    this.networkService.isOnline$.subscribe(online => {
      this.isOffline = !online;
      if (online && this.hasApiError) {
        this.fetchWallet();
      }
    });
  }

  ngOnInit() {
    this.fetchWallet();
    this.loadInstalledUpiApps();
  }

  async loadInstalledUpiApps() {
    try {
      this.installedUpiApps = await this.captainNative.getInstalledUpiApps();
    } catch (e) {
      console.warn('Could not query UPI apps on device:', e);
      this.installedUpiApps = [];
    }
  }

  payWithApp(packageName: string) {
    this.selectedUpiApp = packageName;
    this.processPayment(packageName);
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
    if (due <= 0) return;
    this.payAmount = due;
    this.showPayModal = true;
  }

  setPayAmount(amount: number) {
    const maxDue = Number(this.wallet?.balance?.commission_due || 0);
    this.payAmount = Math.max(1, Math.min(amount, maxDue));
  }

  onPayAmountChange() {
    const maxDue = Number(this.wallet?.balance?.commission_due || 0);
    if (this.payAmount > maxDue) {
      this.payAmount = maxDue;
    }
  }

  closePayNow() {
    this.showPayModal = false;
  }

  // Load Razorpay standard checkout SDK dynamically
  private loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async processPayment(targetAppPackage?: string) {
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

    this.captainService.createRazorpayOrder(this.payAmount).subscribe({
      next: async (orderRes: any) => {
        const loaded = await this.loadRazorpayScript();
        if (!loaded) {
          this.isProcessingPayment = false;
          const toast = await this.toastCtrl.create({
            message: 'Could not load payment gateway. Please check your network connection.',
            duration: 3000,
            color: 'danger'
          });
          await toast.present();
          return;
        }

        const options: any = {
          key: orderRes.key || environment.razorpayKeyId,
          amount: orderRes.amount,
          currency: orderRes.currency || 'INR',
          name: 'Pintu Captain',
          description: 'Platform Commission Settlement',
          order_id: orderRes.order_id,
          config: {
            display: {
              blocks: {
                upi: {
                  name: 'Pay via UPI (Google Pay, PhonePe, Paytm, BHIM)',
                  instruments: [
                    {
                      method: 'upi',
                      flows: ['intent', 'qr']
                    }
                  ]
                },
                other: {
                  name: 'Cards, NetBanking & Wallets',
                  instruments: [
                    { method: 'card' },
                    { method: 'netbanking' },
                    { method: 'wallet' }
                  ]
                }
              },
              sequence: ['block.upi', 'block.other'],
              preferences: {
                show_default_blocks: true
              }
            }
          },
          method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true
          },
          upi: {
            flow: 'intent'
          },
          handler: (response: any) => {
            this.verifyAndCompletePayment({
              amount: this.payAmount,
              razorpay_order_id: response.razorpay_order_id || orderRes.order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
          },
          modal: {
            ondismiss: () => {
              this.isProcessingPayment = false;
              this.selectedUpiApp = null;
              console.log('Razorpay modal closed by user');
            }
          },
          prefill: {
            name: localStorage.getItem('riderName') || 'Captain',
            contact: localStorage.getItem('riderPhone') || ''
          },
          theme: {
            color: '#a000e2'
          }
        };

        if (targetAppPackage) {
          options.upi = {
            flow: 'intent',
            app: targetAppPackage
          };
        }

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', async (failRes: any) => {
          this.isProcessingPayment = false;
          this.selectedUpiApp = null;
          const toast = await this.toastCtrl.create({
            message: failRes?.error?.description || 'Payment was unsuccessful.',
            duration: 3000,
            color: 'danger'
          });
          await toast.present();
        });

        rzp.open();
      },
      error: async (err: any) => {
        this.isProcessingPayment = false;
        this.selectedUpiApp = null;
        const toast = await this.toastCtrl.create({
          message: err?.error?.message || 'Failed to initialize payment order. Please try again.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  private verifyAndCompletePayment(payload: {
    amount: number;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature?: string;
  }) {
    this.isProcessingPayment = true;
    this.captainService.verifyRazorpayPayment(payload).subscribe({
      next: async (res) => {
        this.isProcessingPayment = false;
        this.showPayModal = false;
        const paid = payload.amount;

        if (res?.commission_due !== undefined) {
          this.wallet.balance.commission_due = res.commission_due;
        } else {
          this.wallet.balance.commission_due = Math.max(0, (Number(this.wallet.balance?.commission_due) || 0) - paid);
        }

        // Add to recent transactions ledger
        this.wallet.transactions.unshift({
          txnId: payload.razorpay_payment_id || `TXN${Date.now()}`,
          title: `Platform Commission Paid (Razorpay)`,
          amount: paid,
          type: 'CREDIT',
          category: 'commission_payment',
          dateLabel: 'Just now',
          time: 'Now',
          status: 'SUCCESS'
        });

        const alert = await this.alertCtrl.create({
          header: 'Payment Successful! ✅',
          message: res?.message || `₹${paid} has been settled towards your platform commission.`,
          buttons: ['OK']
        });
        await alert.present();
      },
      error: async (err) => {
        this.isProcessingPayment = false;
        const toast = await this.toastCtrl.create({
          message: err?.error?.message || 'Payment verification failed. Please contact support.',
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

