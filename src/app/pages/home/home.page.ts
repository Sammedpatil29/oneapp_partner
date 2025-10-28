import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonLabel, IonToggle, IonCardContent, IonCardTitle, IonCardHeader, IonCard, IonButton } from '@ionic/angular/standalone';
import { SocketService } from 'src/app/services/socket';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonToggle, IonLabel, IonItem, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class HomePage implements OnInit {

  status: boolean = false
  riderData: any
  rideRequests:any = []
  riderId:any;

  constructor(private socketService: SocketService) { }

  ngOnInit() {
    this.riderId = localStorage.getItem('riderId')
    this.socketService.onMessage((msg) => {
      console.log('📩 Received from server:', msg);
    });

    // Optionally send a message to the server
    let msg:any = {
      riderId: localStorage.getItem('riderId')
    }
    this.socketService.syncRider(msg)

    this.socketService.riderUpdate((msg:any) => {
      console.log('riderUpdate', msg)
      this.riderData = msg
      this.getStatus(msg.status)
      
    })

    this.socketService.rideRequest((msg:any) => {
      console.log('rideRequest', msg)
      this.rideRequests = msg
    })
    
  }

  getStatus(status:any){
    if(status == 'offline'){
      this.status = false 
      console.log(this.status)
    } else {
      this.status = true
      console.log(this.status)
    }
  }

  changeStatus(){
    let status;
    if(this.status == true){
      status = 'online'
    } else {
      status = 'offline'
    }
    let params:any = {
      status: status,
      riderId: localStorage.getItem('riderId')
    }
    this.socketService.changeRiderStatus(params)
  }

  onAccept() {
    this.socketService.acceptRide(this.rideRequests.rideId, this.riderId);
    alert('Ride Accepted!');
    this.rideRequests = [];
  }

   onReject() {
    this.socketService.rejectRide(this.rideRequests.rideId, this.riderId);
    alert('Ride Rejected!');
    this.rideRequests = [];
  }

}
