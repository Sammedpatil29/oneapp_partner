import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular/standalone';
import { Router, ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  mailOutline,
  mail,
  shieldCheckmarkOutline,
  arrowForwardOutline,
  logoWhatsapp,
  keypadOutline,
  createOutline
} from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth.service';
import { AppDialogService } from 'src/app/services/app-dialog.service';
import { CaptainNativeService } from 'src/app/services/captain-native.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class LoginPage implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialogService = inject(AppDialogService);
  private captainNative = inject(CaptainNativeService);

  email: string = '';
  otpCode: string = '';
  isLoading: boolean = false;
  emailOtpSent: boolean = false;
  otpTimer: number = 0;
  private otpInterval: any;

  returnUrl: string = '/layout/home';

  constructor() {
    addIcons({
      mailOutline,
      mail,
      shieldCheckmarkOutline,
      arrowForwardOutline,
      logoWhatsapp,
      keypadOutline,
      createOutline
    });
  }

  async ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/layout/home';
    try {
      await this.captainNative.requestEssentialPermissions();
    } catch (e) {
      console.warn('Login permissions prompt:', e);
    }
  }

  ngOnDestroy() {
    if (this.otpInterval) {
      clearInterval(this.otpInterval);
    }
  }

  private isValidEmail(val: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((val || '').trim());
  }

  private startTimer(durationSec: number = 60) {
    this.otpTimer = durationSec;
    if (this.otpInterval) clearInterval(this.otpInterval);
    this.otpInterval = setInterval(() => {
      if (this.otpTimer > 0) {
        this.otpTimer--;
      } else {
        clearInterval(this.otpInterval);
      }
    }, 1000);
  }

  isOtpReady(): boolean {
    const code = String(this.otpCode || '').trim();
    return code.length >= 4 && code.length <= 6;
  }

  // ===== EMAIL OTP AUTH FLOW =====
  sendEmailOtp() {
    const cleanEmail = String(this.email || '').toLowerCase().trim();

    if (!this.isValidEmail(cleanEmail)) {
      this.dialogService.showAlert('Invalid Email', 'Please enter a valid email address.', 'warning');
      return;
    }

    this.isLoading = true;
    this.authService.sendEmailOtp(cleanEmail).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.emailOtpSent = true;
        this.startTimer(60);
        this.dialogService.showToast('Verification code sent to ' + cleanEmail, 'success', 3000);
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Failed to send verification email. Please check your connection and try again.';
        this.dialogService.showAlert('Error', msg, 'error');
      }
    });
  }

  ionViewWillEnter() {
    this.resetForm();
  }

  resetForm() {
    this.email = '';
    this.otpCode = '';
    this.emailOtpSent = false;
    this.otpTimer = 0;
    if (this.otpInterval) {
      clearInterval(this.otpInterval);
      this.otpInterval = null;
    }
  }

  verifyEmailOtp() {
    const cleanEmail = String(this.email || '').toLowerCase().trim();
    const cleanOtp = String(this.otpCode || '').trim();

    if (!this.isValidEmail(cleanEmail)) {
      this.dialogService.showAlert('Invalid Email', 'Please enter a valid email address.', 'warning');
      return;
    }

    if (!cleanOtp || cleanOtp.length < 4) {
      this.dialogService.showAlert('Invalid Code', 'Please enter the verification code sent to your email.', 'warning');
      return;
    }

    this.isLoading = true;
    this.authService.verifyEmailOtp(cleanEmail, cleanOtp).subscribe({
      next: (res) => {
        this.isLoading = false;

        // Clear the form and set it to empty
        this.resetForm();

        if (res.is_verified) {
          // Active, approved Captain -> Go directly to Home
          this.dialogService.showToast('Welcome back, Captain!', 'success', 2000);
          this.router.navigateByUrl('/layout/home');
        } else if (res.has_submitted_docs || res.verification_status === 'verifying') {
          // Documents submitted and awaiting review -> Go to Step 4 status review
          this.dialogService.showToast('Welcome back! Your KYC verification is in progress.', 'primary', 2500);
          this.router.navigate(['/onboarding'], { queryParams: { step: '4' } });
        } else {
          // New Captain or yet to submit details -> Go to Step 1 onboarding
          this.dialogService.showToast('Email verified! Let us set up your Captain profile.', 'success', 3000);
          this.router.navigate(['/onboarding'], { queryParams: { step: '1', email: cleanEmail } });
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Invalid or expired verification code. Please check and try again.';
        this.dialogService.showAlert('Verification Failed', msg, 'error');
      }
    });
  }

  changeEmail() {
    this.emailOtpSent = false;
    this.otpCode = '';
  }

  openWhatsAppSupport() {
    const phone = '917406984308';
    const message = encodeURIComponent('Hi Pintu Partner Support, I need assistance logging into my Captain account.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_system');
  }
}

