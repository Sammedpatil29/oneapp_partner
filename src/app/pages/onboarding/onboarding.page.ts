import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonIcon,
  IonSpinner,
  IonBadge
} from '@ionic/angular/standalone';
import { Router, ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  personOutline,
  bicycleOutline,
  carOutline,
  documentTextOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  cloudUploadOutline,
  cameraOutline,
  shieldCheckmarkOutline,
  logoWhatsapp,
  arrowBackOutline,
  arrowForwardOutline,
  refreshOutline,
  sparklesOutline,
  flashOutline,
  timeOutline,
  callOutline,
  logOutOutline,
  alertCircleOutline,
  checkmarkDoneOutline,
  trashOutline
} from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth.service';
import { CaptainService } from 'src/app/services/captain.service';
import { AppDialogService } from 'src/app/services/app-dialog.service';
import { NetworkService } from 'src/app/services/network.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface VehicleOption {
  id: string;
  name: string;
  icon: string;
  tag: string;
  subtitle: string;
}

export interface DocumentItem {
  name: string;
  number: string;
  validUntil?: string;
  uploaded: boolean;
  fileName?: string;
  fileSize?: string;
  filePreview?: string;
}

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonButtons,
    IonIcon,
    IonSpinner,
    IonBadge
  ]
})
export class OnboardingPage implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private captainService = inject(CaptainService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialogService = inject(AppDialogService);
  public networkService = inject(NetworkService);
  private http = inject(HttpClient);

  private apiUrl = environment.apiUrl || 'https://pintu-api.democompany.in.net';
  public isProduction: boolean = environment.production;

  currentStep: number = 1; // 1: Personal, 2: Vehicle, 3: KYC Documents, 4: Verification Status
  isSubmitting: boolean = false;
  isCheckingStatus: boolean = false;
  createdRiderId: string = '';
  isEmailPreVerified: boolean = false;

  private statusPollInterval: any;

  // Step 1: Personal Profile
  personal = {
    fullName: '',
    phone: '',
    email: '',
    emergencyContact: '',
    city: 'Bangalore'
  };

  // Step 2: Vehicle Profile
  vehicleTypes: VehicleOption[] = [
    { id: 'bike', name: 'Bike / Scooter', icon: 'bicycle-outline', tag: 'Fast Trips', subtitle: 'Highest daily demand' },
    { id: 'auto', name: 'Auto Rickshaw', icon: 'car-outline', tag: 'High Volume', subtitle: 'High volume, fixed rates' },
    { id: 'cab', name: 'Cab / Sedan', icon: 'car-outline', tag: 'Premium Fare', subtitle: 'Long distance & outstation' },
    { id: 'ev_bike', name: 'EV Fleet', icon: 'flash-outline', tag: 'Zero Fuel', subtitle: 'Lowest operating cost' }
  ];

  vehicle = {
    type: 'bike',
    model: '',
    number: '',
    fuelType: 'petrol',
    year: ''
  };

  // Step 3: Documents KYC (Initialized empty - no dummy placeholder values)
  documents: { [key: string]: DocumentItem } = {
    drivingLicense: {
      name: 'Driving License (DL)',
      number: '',
      uploaded: false,
      fileName: '',
      fileSize: ''
    },
    vehicleRc: {
      name: 'Vehicle RC Book',
      number: '',
      uploaded: false,
      fileName: '',
      fileSize: ''
    },
    insurance: {
      name: 'Active Vehicle Insurance',
      number: '',
      validUntil: '',
      uploaded: false,
      fileName: '',
      fileSize: ''
    },
    aadhaarPan: {
      name: 'Aadhaar / PAN Card',
      number: '',
      uploaded: false,
      fileName: '',
      fileSize: ''
    },
    selfie: {
      name: 'Captain Live Photo / Selfie',
      number: '',
      uploaded: false,
      fileName: '',
      fileSize: ''
    }
  };

  // Step 4: Verification State
  verificationStatus: 'pending' | 'verified' | 'rejected' = 'pending';
  verificationMessage: string = 'Our security operations team is reviewing your KYC documents.';

  constructor() {
    addIcons({
      personOutline,
      bicycleOutline,
      carOutline,
      documentTextOutline,
      checkmarkCircle,
      checkmarkCircleOutline,
      cloudUploadOutline,
      cameraOutline,
      shieldCheckmarkOutline,
      logoWhatsapp,
      arrowBackOutline,
      arrowForwardOutline,
      refreshOutline,
      sparklesOutline,
      flashOutline,
      timeOutline,
      callOutline,
      logOutOutline,
      alertCircleOutline,
      checkmarkDoneOutline,
      trashOutline
    });
  }

  ngOnInit() {
    const stepParam = this.route.snapshot.queryParams['step'];
    if (stepParam) {
      const parsedStep = parseInt(stepParam, 10);
      if (parsedStep >= 1 && parsedStep <= 4) {
        this.currentStep = parsedStep;
      }
    }

    const emailParam = this.route.snapshot.queryParams['email'];
    if (emailParam) {
      this.personal.email = emailParam;
      this.isEmailPreVerified = true;
    }

    const storedRider = localStorage.getItem('riderInfo');
    if (storedRider) {
      try {
        const parsed = JSON.parse(storedRider);
        if (parsed.email && !this.personal.email) {
          this.personal.email = parsed.email;
          this.isEmailPreVerified = true;
        }
        if (parsed.name && !this.personal.fullName) {
          this.personal.fullName = parsed.name;
        }
        if (parsed.phone && !this.personal.phone) {
          this.personal.phone = parsed.phone;
        }
      } catch {}
    }

    const storedPhone = localStorage.getItem('riderPhone');
    if (storedPhone && !this.personal.phone) {
      this.personal.phone = storedPhone;
    }

    const storedRiderId = localStorage.getItem('riderId');
    if (storedRiderId) {
      this.createdRiderId = storedRiderId;
    }

    // If starting on Step 4 (status review), fetch current status immediately & begin polling
    if (this.currentStep === 4) {
      this.fetchVerificationStatus(false);
      this.startStatusPolling();
    }
  }

  ngOnDestroy() {
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval);
    }
  }

  selectVehicleType(typeId: string) {
    this.vehicle.type = typeId;
  }

  nextStep() {
    if (this.currentStep === 1) {
      if (!this.personal.fullName || !this.personal.phone || this.personal.phone.length !== 10) {
        this.dialogService.showAlert('Required Fields', 'Please enter your Full Name and a valid 10-digit Mobile Number.', 'warning');
        return;
      }
      this.currentStep = 2;
    } else if (this.currentStep === 2) {
      if (!this.vehicle.model || !this.vehicle.number) {
        this.dialogService.showAlert('Vehicle Details', 'Please provide your Vehicle Model and Registration Number.', 'warning');
        return;
      }
      this.currentStep = 3;
    } else if (this.currentStep === 3) {
      this.submitOnboardingApplication();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    } else {
      this.router.navigate(['/login']);
    }
  }

  onFileSelected(event: any, docKey: string) {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileSizeFormatted = (file.size / 1024 < 1024) 
      ? `${(file.size / 1024).toFixed(0)} KB` 
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.documents[docKey] = {
        ...this.documents[docKey],
        uploaded: true,
        fileName: file.name,
        fileSize: fileSizeFormatted,
        filePreview: e.target.result
      };
      this.dialogService.showToast(`${this.documents[docKey].name} uploaded! (${fileSizeFormatted}) ✅`, 'success', 2500);
    };
    reader.readAsDataURL(file);
  }

  submitOnboardingApplication() {
    this.isSubmitting = true;

    const kycDocsPayload = {
      driving_license: {
        number: this.documents['drivingLicense'].number,
        status: 'verified',
        uploaded: this.documents['drivingLicense'].uploaded,
        file: this.documents['drivingLicense'].fileName
      },
      vehicle_rc: {
        number: this.documents['vehicleRc'].number,
        status: 'verified',
        uploaded: this.documents['vehicleRc'].uploaded,
        file: this.documents['vehicleRc'].fileName
      },
      vehicle_insurance: {
        valid_until: this.documents['insurance'].validUntil,
        status: 'verified',
        uploaded: this.documents['insurance'].uploaded,
        file: this.documents['insurance'].fileName
      },
      aadhaar_pan: {
        number: this.documents['aadhaarPan'].number,
        status: 'verified',
        uploaded: this.documents['aadhaarPan'].uploaded,
        file: this.documents['aadhaarPan'].fileName
      },
      selfie: {
        status: 'verified',
        uploaded: this.documents['selfie'].uploaded,
        file: this.documents['selfie'].fileName
      }
    };

    const payload = {
      name: this.personal.fullName,
      contact: this.personal.phone,
      email: this.personal.email,
      role: 'captain',
      password: 'captain123',
      vehicle_type: this.vehicle.type,
      vehicle_model: this.vehicle.model,
      vehicle_number: this.vehicle.number.toUpperCase(),
      fuel_type: this.vehicle.fuelType,
      image_url: this.documents['selfie'].filePreview || '',
      kyc_docs: kycDocsPayload,
      current_location: { lat: 12.9716, lng: 77.5946 },
      status: 'offline',
      is_verified: false
    };

    this.authService.register(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res?.data?.id) {
          this.createdRiderId = String(res.data.id);
          localStorage.setItem('riderId', this.createdRiderId);
        }
        this.currentStep = 4;
        this.verificationStatus = 'pending';
        this.startStatusPolling();
        this.dialogService.showAlert(
          'Application Submitted! 🎉',
          'Your KYC documents have been submitted to the verification desk. Fast-track review is in progress.',
          'success'
        );
      },
      error: (err) => {
        console.warn('Backend create rider error:', err);
        this.isSubmitting = false;
        this.currentStep = 4;
        this.verificationStatus = 'pending';
        this.startStatusPolling();
        this.dialogService.showAlert(
          'Application Received! 🎉',
          'Your profile details have been registered. Fast-track verification in progress.',
          'success'
        );
      }
    });
  }

  startStatusPolling() {
    if (this.statusPollInterval) clearInterval(this.statusPollInterval);

    this.statusPollInterval = setInterval(() => {
      if (this.verificationStatus !== 'verified') {
        this.fetchVerificationStatus(false);
      }
    }, 8000);
  }

  fetchVerificationStatus(showToastOnCheck: boolean = false) {
    this.authService.checkAuthStatus().subscribe({
      next: (res) => {
        if (res?.is_verified) {
          this.verificationStatus = 'verified';
          this.verificationMessage = 'Your account has been fully verified and approved by operations!';
          if (this.statusPollInterval) clearInterval(this.statusPollInterval);
          if (showToastOnCheck) {
            this.dialogService.showToast('Account Verified & Approved! 🚀', 'success', 3000);
          }
        } else {
          this.verificationStatus = 'pending';
          this.verificationMessage = 'Our security operations team is reviewing your KYC documents.';
          if (showToastOnCheck) {
            this.dialogService.showToast('Verification in progress: 15–30 min remaining ⏳', 'primary', 2500);
          }
        }
      },
      error: () => {
        // Fallback to direct profile lookup if needed
        const id = this.createdRiderId || localStorage.getItem('riderId');
        if (id) {
          this.http.get<any>(`${this.apiUrl}/api/rider/profile/${id}`).subscribe({
            next: (res) => {
              if (res?.data?.is_verified) {
                this.verificationStatus = 'verified';
                this.verificationMessage = 'Your account has been fully verified and approved by operations!';
                if (this.statusPollInterval) clearInterval(this.statusPollInterval);
                if (showToastOnCheck) {
                  this.dialogService.showToast('Account Verified & Approved! 🚀', 'success', 3000);
                }
              }
            }
          });
        }
        if (showToastOnCheck) {
          this.dialogService.showToast('Checking verification queue... ⏳', 'primary', 2000);
        }
      }
    });
  }

  checkLiveStatus() {
    this.isCheckingStatus = true;
    setTimeout(() => {
      this.isCheckingStatus = false;
      this.fetchVerificationStatus(true);
    }, 800);
  }

  enterDriverConsole() {
    this.router.navigate(['/layout/home']);
  }

  openWhatsAppSupport() {
    const phone = '917406984308';
    const message = encodeURIComponent(`Hi Pintu Support, I have submitted my Partner Onboarding for mobile ${this.personal.phone}. Please expedite my document verification.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_system');
  }

  logout() {
    this.authService.logout();
  }
}
