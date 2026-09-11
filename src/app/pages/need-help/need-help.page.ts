import { Component, OnInit } from '@angular/core';
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
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  warningOutline,
  callOutline,
  logoWhatsapp,
  helpCircleOutline,
  shieldCheckmarkOutline,
  chevronDownOutline,
  chevronUpOutline
} from 'ionicons/icons';
import { CaptainService } from 'src/app/services/captain.service';
import { SocketService } from 'src/app/services/socket';
import { Location } from 'src/app/services/location';
import { Router } from '@angular/router';

@Component({
  selector: 'app-need-help',
  templateUrl: './need-help.page.html',
  styleUrls: ['./need-help.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    CommonModule,
    FormsModule
  ]
})
export class NeedHelpPage {
  isSosTriggered: boolean = false;
  openFaqIndex: number | null = null;

  faqs = [
    {
      q: 'How does daily payout work?',
      a: 'You can withdraw your earnings anytime instantly to your linked UPI ID or bank account with 0 processing fee.'
    },
    {
      q: 'What should I do if a customer does not show up?',
      a: 'Wait at the pickup location for 5 minutes. If unreachable via phone/chat, tap "Cancel Ride" and select "Customer No-Show". You will receive a cancellation fee.'
    },
    {
      q: 'How do I earn referral bonuses?',
      a: 'Share your personal referral code. When your friend registers as a Captain and completes 10 rides, ₹500 is credited directly into your wallet.'
    },
    {
      q: 'How do I verify customer OTP?',
      a: 'Ask the passenger for the 4-digit start OTP shown on their screen and enter it in the Captain app before starting the trip.'
    }
  ];

  constructor(
    private captainService: CaptainService,
    private socketService: SocketService,
    private locationService: Location,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private router: Router
  ) {
    addIcons({
      arrowBackOutline,
      warningOutline,
      callOutline,
      logoWhatsapp,
      helpCircleOutline,
      shieldCheckmarkOutline,
      chevronDownOutline,
      chevronUpOutline
    });
  }


  async triggerEmergencySos() {
    const alert = await this.alertCtrl.create({
      header: '🚨 TRIGGER EMERGENCY SOS?',
      message: 'This will immediately broadcast your live GPS coordinates to the Central Safety Response Desk and alert local emergency authorities.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'YES, TRIGGER SOS',
          role: 'destructive',
          handler: async () => {
            try {
              const loc = await this.locationService.getCurrentLocation();
              const riderId = localStorage.getItem('riderId') || '101';

              // Send via Socket & HTTP
              this.socketService.sendSos(riderId, loc.lat, loc.lng);
              this.captainService.triggerSos(loc.lat, loc.lng).subscribe();

              this.isSosTriggered = true;
              const toast = await this.toastCtrl.create({
                message: '🚨 SOS Alert Dispatched! Safety team is monitoring your location.',
                duration: 5000,
                color: 'danger'
              });
              await toast.present();
            } catch (err) {
              console.error('SOS error:', err);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  callPolice() {
    window.open('tel:112', '_system');
  }

  callSafetyDesk() {
    window.open('tel:180012374688', '_system');
  }

  openWhatsAppSupport() {
    const phone = '917406984308';
    const message = encodeURIComponent('Hello Pintu Captain Support, I need assistance.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_system');
  }

  toggleFaq(index: number) {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }

  goBack() {
    this.router.navigate(['/layout/home']);
  }
}

