import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons, IonIcon, IonCard, IonCardContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: true,
  imports: [IonCardContent, IonCard, IonIcon, IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class OnboardingPage implements OnInit {
userStatus: string = ''
  constructor(private navCtrl: NavController ) { }

  ngOnInit() {
  }

  logout(){
    localStorage.removeItem('riderJwt')
    localStorage.removeItem('riderId')
    this.navCtrl.navigateRoot('/login')
  }

  sendWhatsApp() {
  const phone = '917406984308'; // country code + number (NO +)
  const message = encodeURIComponent(
    'Hi, I need help regarding my Onboarding.'
  );

  const url = `https://wa.me/${phone}?text=${message}`;
  window.open(url, '_system'); // opens WhatsApp app
}
}
