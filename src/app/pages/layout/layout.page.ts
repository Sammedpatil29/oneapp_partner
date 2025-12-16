import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonApp, IonRouterOutlet, IonItem, IonLabel, IonToggle,IonIcon, IonCardContent, IonButtons, IonCardTitle, IonCardHeader, IonCard, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: true,
  imports: [IonRouterOutlet, IonApp, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,  IonItem, IonLabel, IonToggle,IonIcon, IonCardContent, IonButtons, IonCardTitle, IonCardHeader, IonCard, IonButton]
})
export class LayoutPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
