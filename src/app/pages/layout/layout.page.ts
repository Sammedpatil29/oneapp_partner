import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonApp, IonRouterOutlet, IonItem, IonLabel, IonToggle,IonIcon, IonCardContent, IonButtons, IonCardTitle, IonCardHeader, IonCard, IonButton } from '@ionic/angular/standalone';
import { SocketService } from 'src/app/services/socket';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: true,
  imports: [IonRouterOutlet, IonApp, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,  IonItem, IonLabel, IonToggle,IonIcon, IonCardContent, IonButtons, IonCardTitle, IonCardHeader, IonCard, IonButton]
})
export class LayoutPage implements OnInit {

  constructor(private socketService: SocketService) { }
  riderId:any;
  rideRequests:any = [];
  isLoading: boolean = false;
  
  ngOnInit() {
    this.riderId = localStorage.getItem('riderId')
    this.socketService.rideRequest((msg: any) => {
  // 1. Create a unique ID or use one from the message
  const requestId = msg.id || Date.now();
  const newRequest = { ...msg, requestId, expiresAt: Date.now() + 10000 };
      console.log(newRequest);
  // 2. Add to your list
  this.rideRequests.push(newRequest);
  this.isLoading = false;

  // 3. Set a timer to automatically remove it after 10 seconds
  setTimeout(() => {
    this.removeExpiredRequest(requestId);
  }, 10000);
});
  }

   removeExpiredRequest(id: any) {
  this.rideRequests = this.rideRequests.filter((req:any) => req.requestId !== id);
}

 onAccept(rideId:any) {
    this.socketService.acceptRide(rideId, this.riderId);
    alert('Ride Accepted!');
    this.rideRequests = [];
  }

   onReject(rideId:any) {
    this.socketService.rejectRide(rideId, this.riderId);
    alert('Ride Rejected!');
    this.rideRequests = [];
  }

}
