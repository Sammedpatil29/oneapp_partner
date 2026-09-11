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
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

import { LoaderComponent } from 'src/app/components/loader/loader.component';
import { NoNetworkComponent } from 'src/app/components/no-network/no-network.component';
import { NoDataComponent } from 'src/app/components/no-data/no-data.component';
import { ApiErrorComponent } from 'src/app/components/api-error/api-error.component';
import { AlertModalComponent, AlertType } from 'src/app/components/alert-modal/alert-modal.component';
import { NetworkService } from 'src/app/services/network.service';
import { CaptainNativeService } from 'src/app/services/captain-native.service';
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
export class WalletPage implements OnInit, OnDestroy {
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

  pendingOrderId: string | null = null;
  private pollingInterval: any = null;
  private isPaymentDetected: boolean = false;
  private inAppBrowserCloseListener: any = null;
  private inAppBrowserPaymentListener: any = null;

  private captainService = inject(CaptainService);
  private captainNative = inject(CaptainNativeService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private router = inject(Router);
  public networkService = inject(NetworkService);

  constructor() {
    addIcons({arrowBackOutline,walletOutline,cardOutline,cashOutline,addCircleOutline,removeCircleOutline,checkmarkCircleOutline,arrowDownCircleOutline});

    this.networkService.isOnline$.subscribe(online => {
      this.isOffline = !online;
      if (online && this.hasApiError) {
        this.fetchWallet();
      }
    });
  }

  ngOnInit() {
    this.fetchWallet();
    this.checkPendingOrder();
    this.setupInAppBrowserListeners();
  }

  ngOnDestroy() {
    this.stopPolling();
    this.captainNative.closeInAppBrowser();
    if (this.inAppBrowserCloseListener?.remove) {
      this.inAppBrowserCloseListener.remove();
    }
    if (this.inAppBrowserPaymentListener?.remove) {
      this.inAppBrowserPaymentListener.remove();
    }
  }

  async setupInAppBrowserListeners() {
    if (Capacitor.isNativePlatform()) {
      try {
        this.inAppBrowserCloseListener = await this.captainNative.onInAppBrowserClosed(() => {
          console.log('📱 In-app browser closed event');
          this.isProcessingPayment = false;
          this.showPayModal = false;
          this.fetchWallet();
          if (this.pendingOrderId && !this.isPaymentDetected) {
            const amount = Number(localStorage.getItem('pending_commission_amount') || this.payAmount);
            this.checkStatusFromBackend(this.pendingOrderId, amount);
          }
        });

        this.inAppBrowserPaymentListener = await this.captainNative.onInAppBrowserPaymentCompleted((data: any) => {
          console.log('💳 Payment completed event from in-app browser:', data);
          const orderId = data?.razorpay_order_id || this.pendingOrderId || localStorage.getItem('pending_commission_order_id');
          const paymentId = data?.razorpay_payment_id;
          const amount = Number(localStorage.getItem('pending_commission_amount') || this.payAmount);

          if (paymentId && orderId) {
            this.captainService.verifyRazorpayPayment({
              amount,
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: data?.razorpay_signature || 'inapp_signature'
            }).subscribe({
              next: (res: any) => {
                if (res?.success) {
                  this.handleSuccess(res, amount);
                } else {
                  this.checkStatusFromBackend(orderId, amount, paymentId);
                }
              },
              error: () => {
                this.checkStatusFromBackend(orderId, amount, paymentId);
              }
            });
          } else if (orderId) {
            this.checkStatusFromBackend(orderId, amount);
          }
        });
      } catch (e) {
        console.warn('Could not setup in-app browser listeners:', e);
      }
    }
  }

  async checkPendingOrder() {
    const value = localStorage.getItem('pending_commission_order_id');
    const amount = Number(localStorage.getItem('pending_commission_amount') || 0);
    if (value && amount > 0) {
      this.pendingOrderId = value;
      console.log('🔄 Checking pending commission order on resume/launch:', this.pendingOrderId);
      this.startPolling(this.pendingOrderId, amount);
    }
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
    this.stopPolling();
    this.captainNative.closeInAppBrowser();
    this.isProcessingPayment = false;
    this.showPayModal = false;
  }

  // Load Razorpay standard checkout SDK dynamically (for browser/web environments)
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

  async processPayment() {
    if (!this.payAmount || this.payAmount <= 0) {
      await this.presentToast('Please enter a valid payment amount', 'danger');
      return;
    }

    this.isProcessingPayment = true;
    this.isPaymentDetected = false;
    const amountToPay = this.payAmount;

    this.captainService.createRazorpayOrder(amountToPay).subscribe({
      next: async (orderRes: any) => {
        const orderId = orderRes.order_id;
        this.pendingOrderId = orderId;
        localStorage.setItem('pending_commission_order_id', orderId);
        localStorage.setItem('pending_commission_amount', String(amountToPay));

        const hostedUrl = orderRes.hosted_checkout_url || orderRes.payment_link;

        // IN-APP BROWSER on native Android APK:
        // Opens directly inside the app so the user NEVER leaves the app!
        if (Capacitor.isNativePlatform() && hostedUrl) {
          console.log('📱 Opening Razorpay In-App Browser modal Dialog:', hostedUrl);
          await this.captainNative.openInAppBrowser(hostedUrl);
          this.startPolling(orderId, amountToPay);
          return;
        }

        // In web / desktop / fallback: open standard Razorpay checkout
        const loaded = await this.loadRazorpayScript();
        if (!loaded) {
          if (hostedUrl) {
            window.open(hostedUrl, '_blank');
            this.startPolling(orderId, amountToPay);
            return;
          }
          this.isProcessingPayment = false;
          await this.presentToast('Could not load payment gateway. Please check your network connection.', 'danger');
          return;
        }

        const options: any = {
          key: orderRes.key || environment.razorpayKeyId,
          amount: orderRes.amount,
          currency: orderRes.currency || 'INR',
          name: 'Pintu Captain',
          description: 'Platform Commission Settlement',
          order_id: orderId,
          config: {
            display: {
              blocks: {
                upi: {
                  name: 'Pay via UPI (Google Pay, PhonePe, Paytm, BHIM)',
                  instruments: [
                    { method: 'upi', flows: ['intent', 'qr'] }
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
              preferences: { show_default_blocks: true }
            }
          },
          method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true
          },
          upi: { flow: 'intent' },
          handler: (response: any) => {
            this.handleSuccess({
              payment_id: response.razorpay_payment_id
            }, amountToPay);
          },
          modal: {
            ondismiss: () => {
              this.isProcessingPayment = false;
              console.log('Razorpay modal closed by user');
              if (this.pendingOrderId && !this.isPaymentDetected) {
                this.checkStatusFromBackend(this.pendingOrderId, amountToPay);
              }
            }
          },
          prefill: {
            name: localStorage.getItem('riderName') || 'Captain',
            contact: localStorage.getItem('riderPhone') || ''
          },
          theme: { color: '#a000e2' }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', async (failRes: any) => {
          this.isProcessingPayment = false;
          this.stopPolling();
          await this.presentToast(failRes?.error?.description || 'Payment was unsuccessful.', 'danger');
        });

        rzp.open();
        this.startPolling(orderId, amountToPay);
      },
      error: async (err: any) => {
        this.isProcessingPayment = false;
        await this.presentToast(err?.error?.message || 'Failed to initialize payment order. Please try again.', 'danger');
      }
    });
  }

  // --- Payment Polling & Status Verification Logic (matching OneApp cart page) ---

  startPolling(internalOrderId: string, amount: number) {
    console.log('Started polling for order:', internalOrderId);
    this.stopPolling();
    this.pollingInterval = setInterval(() => {
      this.checkStatusFromBackend(internalOrderId, amount);
    }, 3000);

    // Timeout polling after 120 seconds if not detected
    setTimeout(() => {
      if (!this.isPaymentDetected) {
        this.stopPolling();
        this.isProcessingPayment = false;
      }
    }, 120000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  checkStatusFromBackend(internalOrderId: string, amount: number, paymentId?: string) {
    this.captainService.checkRazorpayOrderStatus(internalOrderId, paymentId).subscribe({
      next: (res: any) => {
        if (res && res.success && (res.paid || res.status === 'paid')) {
          this.handleSuccess(res, amount);
        } else if (res && res.status === 'failed') {
          this.stopPolling();
          this.isProcessingPayment = false;
          this.showPayModal = false;
          this.captainNative.closeInAppBrowser();
          localStorage.removeItem('pending_commission_order_id');
          localStorage.removeItem('pending_commission_amount');
          this.presentToast('Payment failed.', 'danger');
          this.fetchWallet();
        }
      },
      error: (err) => console.log('Order status poll error:', err)
    });
  }

  async handleSuccess(res: any, amount: number) {
    this.isPaymentDetected = true;
    this.stopPolling();
    this.isProcessingPayment = false;
    this.showPayModal = false;
    localStorage.removeItem('pending_commission_order_id');
    localStorage.removeItem('pending_commission_amount');

    // Close in-app browser dialog
    await this.captainNative.closeInAppBrowser();

    if (res?.commission_due !== undefined) {
      this.wallet.balance.commission_due = res.commission_due;
    } else {
      this.wallet.balance.commission_due = Math.max(0, (Number(this.wallet.balance?.commission_due) || 0) - amount);
    }

    // Add to recent transactions ledger
    this.wallet.transactions.unshift({
      txnId: res.payment_id || `TXN${Date.now()}`,
      title: `Platform Commission Paid (Razorpay)`,
      amount: amount,
      type: 'CREDIT',
      category: 'commission_payment',
      dateLabel: 'Just now',
      time: 'Now',
      status: 'SUCCESS'
    });

    const alert = await this.alertCtrl.create({
      header: 'Payment Successful! ✅',
      message: `₹${amount} has been settled towards your platform commission.`,
      buttons: ['OK']
    });
    await alert.present();
    this.fetchWallet();
  }

  async presentToast(msg: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2500,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/layout/home']);
  }
}

