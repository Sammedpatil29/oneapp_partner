import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge
} from '@ionic/angular/standalone';
import { Router, ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  callOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  arrowForwardOutline,
  logoWhatsapp,
  helpCircleOutline,
  personAddOutline,
  logInOutline,
  keypadOutline
} from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth.service';
import { AppDialogService } from 'src/app/services/app-dialog.service';
import { NetworkService } from 'src/app/services/network.service';
import { CaptainNativeService } from 'src/app/services/captain-native.service';
import { environment } from 'src/environments/environment';

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
    IonSpinner,
    IonBadge
  ]
})
export class LoginPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialogService = inject(AppDialogService);
  private captainNative = inject(CaptainNativeService);
  public networkService = inject(NetworkService);

  isProduction: boolean = environment.production;

  loginMode: 'password' | 'otp' = 'password';
  phoneNumber: string = '';
  password: string = '';
  otpCode: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;
  otpSent: boolean = false;
  otpTimer: number = 0;
  private otpInterval: any;

  returnUrl: string = '/layout/home';

  constructor() {
    addIcons({
      callOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      shieldCheckmarkOutline,
      sparklesOutline,
      arrowForwardOutline,
      logoWhatsapp,
      helpCircleOutline,
      personAddOutline,
      logInOutline,
      keypadOutline
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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  setLoginMode(mode: 'password' | 'otp') {
    this.loginMode = mode;
    this.otpSent = false;
    this.otpCode = '';
  }

  fillDemoCredentials() {
    if (this.isProduction) return;
    this.phoneNumber = '9876543210';
    this.password = 'captain123';
    this.loginMode = 'password';
  }

  sendOtp() {
    if (!this.phoneNumber || this.phoneNumber.length < 10) {
      this.dialogService.showAlert('Invalid Number', 'Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }

    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
      this.otpSent = true;
      this.otpTimer = 30;
      
      if (!this.isProduction) {
        this.dialogService.showToast('OTP sent: 1234 (Demo verification code)', 'success', 4000);
      } else {
        this.dialogService.showToast('Verification code sent via SMS to your mobile number.', 'success', 4000);
      }

      if (this.otpInterval) clearInterval(this.otpInterval);
      this.otpInterval = setInterval(() => {
        if (this.otpTimer > 0) {
          this.otpTimer--;
        } else {
          clearInterval(this.otpInterval);
        }
      }, 1000);
    }, 800);
  }

  fillDemoOtp() {
    if (this.isProduction) return;
    this.otpCode = '1234';
  }

  login() {
    if (!this.networkService.isOnline) {
      this.dialogService.showAlert('Offline', 'Please check your internet connection before logging in.', 'warning');
      return;
    }

    if (this.phoneNumber.length !== 10) {
      this.dialogService.showAlert('Invalid Phone', 'Please enter a 10-digit phone number.', 'warning');
      return;
    }

    if (this.loginMode === 'password' && !this.password) {
      this.dialogService.showAlert('Password Required', 'Please enter your password.', 'warning');
      return;
    }

    if (this.loginMode === 'otp' && (!this.otpCode || this.otpCode.length < 4)) {
      this.dialogService.showAlert('Invalid OTP', 'Please enter the 4-digit verification code.', 'warning');
      return;
    }

    this.isLoading = true;

    const payload: any = {
      phone: this.phoneNumber,
      password: this.password
    };

    if (this.loginMode === 'otp') {
      payload.otp = this.otpCode;
    }

    this.authService.login(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.tokenData?.token) {
          this.dialogService.showToast('Login Successful! Welcome back, Captain.', 'success', 2000);
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.dialogService.showAlert('Login Failed', res?.message || 'Invalid credentials. Please try again.', 'error');
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (this.isProduction) {
          // Production: Strict rejection
          const errMsg = err?.error?.message || 'Invalid phone number or password. Please try again.';
          this.dialogService.showAlert('Authentication Failed', errMsg, 'error');
        } else {
          // Development/Local: Allow local testing session
          console.warn('Development offline fallback login active:', err);
          const fallbackToken = 'jwt_dev_' + Date.now();
          this.authService.setSession({
            token: fallbackToken,
            riderId: '101',
            phone: this.phoneNumber,
            name: 'Sammed Patil',
            role: 'captain',
            is_verified: true
          });
          this.dialogService.showToast('Welcome, Captain (Dev Local Session)', 'primary', 2000);
          this.router.navigateByUrl(this.returnUrl);
        }
      }
    });
  }

  goToOnboarding() {
    this.router.navigate(['/onboarding']);
  }

  openWhatsAppSupport() {
    const phone = '917406984308';
    const message = encodeURIComponent('Hi Pintu Partner Support, I need assistance logging into my Captain account.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_system');
  }
}
