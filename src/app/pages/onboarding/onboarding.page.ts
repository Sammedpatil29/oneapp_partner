import { Component, OnInit, inject } from '@angular/core';
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
  closeCircle,
  trashOutline, paperPlaneOutline } from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth.service';
import { CaptainService } from 'src/app/services/captain.service';
import { AppDialogService } from 'src/app/services/app-dialog.service';
import { NetworkService } from 'src/app/services/network.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import JSZip from 'jszip';

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
export class OnboardingPage implements OnInit {
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
  isCheckingPhone: boolean = false;
  phoneError: string = '';
  createdRiderId: string = '';
  isEmailPreVerified: boolean = false;

  // Local storage for uploaded raw document files (to bundle into ZIP)
  localDocFiles: { [key: string]: File } = {};

  // Step 4: Database-driven Verification Checklist (pending | verified | not_verified)
  verificationChecklist: { [key: string]: 'pending' | 'verified' | 'not_verified' | string } = {
    personal_details: 'pending',
    vehicle_details: 'pending',
    driving_license: 'pending',
    vehicle_rc: 'pending',
    vehicle_insurance: 'pending',
    aadhaar_pan: 'pending',
    live_selfie: 'pending',
    background_verification: 'pending',
    safety_activation: 'pending'
  };

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
    addIcons({arrowBackOutline,logoWhatsapp,logOutOutline,checkmarkCircle,closeCircle,personOutline,alertCircleOutline,arrowForwardOutline,bicycleOutline,documentTextOutline,cloudUploadOutline,cameraOutline,shieldCheckmarkOutline,paperPlaneOutline,timeOutline,flashOutline,refreshOutline,carOutline,checkmarkCircleOutline,sparklesOutline,callOutline,checkmarkDoneOutline,trashOutline});
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
        // Do NOT populate name based on email - let user add their real legal name
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

    // If starting on Step 4 (status review), fetch current status immediately
    if (this.currentStep === 4) {
      this.fetchVerificationStatus(false);
    }
  }

  onPhoneChange() {
    const cleanPhone = String(this.personal.phone || '').trim();
    if (cleanPhone.length !== 10) {
      this.phoneError = cleanPhone.length > 0 ? 'Mobile number must be exactly 10 digits' : '';
      return;
    }

    this.isCheckingPhone = true;
    this.phoneError = '';
    this.authService.checkPhoneAvailable(cleanPhone, this.createdRiderId).subscribe({
      next: (res) => {
        this.isCheckingPhone = false;
        if (res?.exists) {
          this.phoneError = 'This mobile number is already linked with another Captain account. Please use a different number.';
          this.dialogService.showToast('Mobile number already registered with another account!', 'warning', 3500);
        } else {
          this.phoneError = '';
        }
      },
      error: () => {
        this.isCheckingPhone = false;
      }
    });
  }

  selectVehicleType(typeId: string) {
    this.vehicle.type = typeId;
  }

  nextStep() {
    if (this.currentStep === 1) {
      const name = (this.personal.fullName || '').trim();
      const phone = (this.personal.phone || '').trim();

      if (!name || name.length < 2) {
        this.dialogService.showAlert('Required Field', 'Please enter your Full Legal Name as on your Driving License.', 'warning');
        return;
      }
      if (!phone || phone.length !== 10) {
        this.dialogService.showAlert('Invalid Mobile', 'Please enter a valid 10-digit mobile number.', 'warning');
        return;
      }
      if (this.phoneError) {
        this.dialogService.showAlert('Mobile Already Linked', this.phoneError, 'warning');
        return;
      }
      if (this.isCheckingPhone) {
        this.dialogService.showToast('Verifying mobile number availability... please wait', 'primary', 2000);
        return;
      }
      this.currentStep = 2;
    } else if (this.currentStep === 2) {
      const model = (this.vehicle.model || '').trim();
      const num = (this.vehicle.number || '').trim();
      const year = (this.vehicle.year || '').trim();

      if (!model || model.length < 2) {
        this.dialogService.showAlert('Vehicle Details', 'Please enter your vehicle make and model.', 'warning');
        return;
      }
      if (!num || num.length < 4) {
        this.dialogService.showAlert('Vehicle Details', 'Please provide a valid vehicle registration number (RC).', 'warning');
        return;
      }
      if (!year) {
        this.dialogService.showAlert('Vehicle Details', 'Please select your vehicle manufacturing year.', 'warning');
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

    // Standard filename prefixes based on document type
    const prefixMap: { [key: string]: string } = {
      drivingLicense: 'dl',
      vehicleRc: 'rc',
      insurance: 'insurance',
      aadhaarPan: 'aadhaar',
      selfie: 'selfie'
    };

    const prefix = prefixMap[docKey] || docKey;
    let ext = 'jpg';
    if (file.name && file.name.includes('.')) {
      ext = file.name.split('.').pop().toLowerCase();
    } else if (file.type) {
      ext = file.type.includes('pdf') ? 'pdf' : (file.type.includes('png') ? 'png' : 'jpg');
    }

    const renamedFileName = `${prefix}.${ext}`;
    const renamedFile = new File([file], renamedFileName, { type: file.type });

    // Cache the renamed File object locally for final ZIP bundling
    this.localDocFiles[docKey] = renamedFile;

    const fileSizeFormatted = (file.size / 1024 < 1024) 
      ? `${(file.size / 1024).toFixed(0)} KB` 
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.documents[docKey] = {
        ...this.documents[docKey],
        uploaded: true,
        fileName: renamedFileName,
        fileSize: fileSizeFormatted,
        filePreview: e.target.result
      };
      if (docKey === 'selfie' && e.target.result) {
        localStorage.setItem('riderSelfie', e.target.result);
      }
      this.dialogService.showToast(`${this.documents[docKey].name} uploaded (${renamedFileName})`, 'success', 2000);
    };
    reader.readAsDataURL(file);
  }

  async submitOnboardingApplication() {
    // 1. Strict Validation for all 5 documents (including mandatory selfie)
    const missingItems: string[] = [];

    if (!this.documents['drivingLicense'].uploaded || !this.localDocFiles['drivingLicense']) {
      missingItems.push('Driving License (DL) photo/document');
    }
    if (!this.documents['drivingLicense'].number?.trim()) {
      missingItems.push('Driving License Number');
    }

    if (!this.documents['vehicleRc'].uploaded || !this.localDocFiles['vehicleRc']) {
      missingItems.push('Vehicle RC Book photo/document');
    }
    if (!this.documents['vehicleRc'].number?.trim()) {
      missingItems.push('Vehicle RC Number');
    }

    if (!this.documents['insurance'].uploaded || !this.localDocFiles['insurance']) {
      missingItems.push('Active Vehicle Insurance document');
    }
    if (!this.documents['insurance'].validUntil?.trim()) {
      missingItems.push('Insurance Validity Date');
    }

    if (!this.documents['aadhaarPan'].uploaded || !this.localDocFiles['aadhaarPan']) {
      missingItems.push('Aadhaar / PAN Card document');
    }
    if (!this.documents['aadhaarPan'].number?.trim()) {
      missingItems.push('Aadhaar / PAN Card Number');
    }

    if (!this.documents['selfie'].uploaded || !this.localDocFiles['selfie']) {
      missingItems.push('Captain Live Selfie (Mandatory)');
    }

    if (missingItems.length > 0) {
      this.dialogService.showAlert(
        'Missing Required Documents',
        `Please complete the following required items before submitting:\n\n• ${missingItems.join('\n• ')}`,
        'warning'
      );
      return;
    }

    this.isSubmitting = true;

    try {
      this.dialogService.showToast('Packaging documents into secure ZIP archive... 📦', 'primary', 2500);

      // 2. Bundle all renamed local documents into a ZIP archive via JSZip
      const zip = new JSZip();
      const sanitizedPhone = String(this.personal.phone || 'captain').trim();
      const folder = zip.folder(`kyc_${sanitizedPhone}`);

      for (const [key, file] of Object.entries(this.localDocFiles)) {
        folder?.file(file.name, file);
      }

      const kycDocsMeta = {
        driving_license: {
          number: this.documents['drivingLicense'].number.trim(),
          filename: this.documents['drivingLicense'].fileName,
          status: 'pending',
          uploaded: true
        },
        vehicle_rc: {
          number: this.documents['vehicleRc'].number.trim().toUpperCase(),
          filename: this.documents['vehicleRc'].fileName,
          status: 'pending',
          uploaded: true
        },
        vehicle_insurance: {
          number: this.documents['insurance'].number?.trim() || '',
          valid_until: this.documents['insurance'].validUntil,
          filename: this.documents['insurance'].fileName,
          status: 'pending',
          uploaded: true
        },
        aadhaar_pan: {
          number: this.documents['aadhaarPan'].number.trim(),
          filename: this.documents['aadhaarPan'].fileName,
          status: 'pending',
          uploaded: true
        },
        selfie: {
          filename: this.documents['selfie'].fileName,
          status: 'pending',
          uploaded: true
        }
      };

      folder?.file('metadata.json', JSON.stringify({
        captain: {
          name: this.personal.fullName.trim(),
          phone: this.personal.phone.trim(),
          email: this.personal.email.trim(),
          city: this.personal.city,
          emergencyContact: this.personal.emergencyContact
        },
        vehicle: this.vehicle,
        documents: kycDocsMeta,
        submittedAt: new Date().toISOString()
      }, null, 2));

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // 3. Prepare FormData payload with ZIP and rider details
      const formData = new FormData();
      formData.append('kycZip', zipBlob, `kyc_${sanitizedPhone}_${Date.now()}.zip`);
      if (this.createdRiderId) {
        formData.append('riderId', this.createdRiderId);
      }
      formData.append('name', this.personal.fullName.trim());
      formData.append('contact', this.personal.phone.trim());
      formData.append('email', this.personal.email.trim());
      formData.append('vehicle_type', this.vehicle.type);
      formData.append('vehicle_model', this.vehicle.model.trim());
      formData.append('vehicle_number', this.vehicle.number.trim().toUpperCase());
      formData.append('fuel_type', this.vehicle.fuelType);
      formData.append('vehicle_year', this.vehicle.year);
      formData.append('kyc_docs', JSON.stringify(kycDocsMeta));

      // 4. Upload ZIP and details to server
      this.authService.submitKycWithZip(formData).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          if (res?.data?.id) {
            this.createdRiderId = String(res.data.id);
            localStorage.setItem('riderId', this.createdRiderId);
          }
          this.currentStep = 4;
          this.verificationStatus = 'pending';
          this.dialogService.showAlert(
            'Application & Documents Submitted! 🎉',
            'Your vehicle information and KYC documents ZIP have been successfully uploaded to the operations review desk. Fast-track verification is now in progress.',
            'success'
          );
        },
        error: (err) => {
          console.error('KYC ZIP upload error:', err);
          this.isSubmitting = false;
          const msg = err?.error?.message || 'Failed to upload KYC archive. Please check your internet connection and try again.';
          this.dialogService.showAlert('Upload Failed', msg, 'error');
        }
      });
    } catch (zipErr: any) {
      this.isSubmitting = false;
      console.error('Error generating ZIP:', zipErr);
      this.dialogService.showAlert('Packaging Error', 'Could not create document archive: ' + zipErr.message, 'error');
    }
  }

  fetchVerificationStatus(showToastOnCheck: boolean = false) {
    this.authService.checkAuthStatus().subscribe({
      next: (res) => {
        const incomingChecklist = res?.verification_checklist || (res as any)?.kyc_docs?.checklist || (res as any)?.rider?.kyc_docs?.checklist || (res as any)?.rider?.verification_checklist;
        if (incomingChecklist && typeof incomingChecklist === 'object') {
          this.verificationChecklist = {
            ...this.verificationChecklist,
            ...incomingChecklist
          };
        }

        const anyNotVerified = Object.values(this.verificationChecklist).some(s => s === 'not_verified');
        const allVerified = Object.values(this.verificationChecklist).every(s => s === 'verified');

        if (res?.is_verified || allVerified) {
          this.verificationStatus = 'verified';
          this.verificationMessage = 'Your account has been fully verified and approved by operations!';
          if (showToastOnCheck) {
            this.dialogService.showToast('Account Verified & Approved! 🚀', 'success', 3000);
          }
        } else if (anyNotVerified) {
          this.verificationStatus = 'rejected';
          this.verificationMessage = 'One or more checklist documents require your attention or re-upload.';
          if (showToastOnCheck) {
            this.dialogService.showToast('Some documents were not approved', 'danger', 3000);
          }
        } else {
          this.verificationStatus = 'pending';
          this.verificationMessage = 'Our security operations team is reviewing your KYC documents.';
          if (showToastOnCheck) {
            this.dialogService.showToast('Verification in progress: 15–30 min remaining', 'primary', 2500);
          }
        }
      },
      error: () => {
        // Fallback to direct profile lookup if needed
        const id = this.createdRiderId || localStorage.getItem('riderId');
        if (id) {
          this.http.get<any>(`${this.apiUrl}/api/rider/profile/${id}`).subscribe({
            next: (res) => {
              const incomingChecklist = res?.data?.verification_checklist || res?.verification_checklist;
              if (incomingChecklist && typeof incomingChecklist === 'object') {
                this.verificationChecklist = {
                  ...this.verificationChecklist,
                  ...incomingChecklist
                };
              }
              const allVerified = Object.values(this.verificationChecklist).every(s => s === 'verified');
              if (res?.data?.is_verified || allVerified) {
                this.verificationStatus = 'verified';
                this.verificationMessage = 'Your account has been fully verified and approved by operations!';
                if (showToastOnCheck) {
                  this.dialogService.showToast('Account Verified & Approved!', 'success', 3000);
                }
              }
            }
          });
        }
        if (showToastOnCheck) {
          this.dialogService.showToast('Checking verification queue...', 'primary', 2000);
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
