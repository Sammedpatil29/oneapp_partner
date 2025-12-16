import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonMenuButton, IonMenu, IonToolbar, IonItem, IonLabel, IonToggle,IonIcon, IonCardContent, IonButtons, IonCardTitle, IonCardHeader, IonCard, IonButton } from '@ionic/angular/standalone';
import { SocketService } from 'src/app/services/socket';
import { addIcons } from 'ionicons';
import { powerOutline, radioOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
import { Common } from 'src/app/services/common';
import { Location } from 'src/app/services/location';
import { LoaderComponent } from "src/app/components/loader/loader.component";

addIcons({
  'power-outline': powerOutline,
  'radio-outline': radioOutline
});

declare var google: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonButton, IonCard, IonCardHeader, IonMenu, IonMenuButton, IonCardTitle, IonCardContent, IonToggle, IonIcon, IonLabel, IonItem, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, LoaderComponent]
})
export class HomePage implements OnInit {

  status: boolean = false
  isInsidePolygon: boolean = false
  isLoading: boolean = false
  riderData: any
  rideRequests:any = []
  riderId:any;
clickSound = new Audio('assets/sounds/notification-ping-372476.mp3');
   map!: any;
  marker!: any;
  polygon!: any;
  lat!: number;
  lng!: number;

  constructor(private socketService: SocketService, private router: Router, private service: Common, private locationService: Location) {
      addIcons({powerOutline}); }

  async ngOnInit() {
    this.riderId = localStorage.getItem('riderId')
    this.isLoading = true
    this.socketService.onMessage((msg) => {
      this.isLoading = false
      console.log('📩 Received from server:', msg);
    });

    // Optionally send a message to the server
    let msg:any = {
      riderId: localStorage.getItem('riderId')
    }
    this.socketService.syncRider(msg)
    this.isLoading = true
    this.socketService.riderUpdate((msg:any) => {
      console.log('riderUpdate', msg)
      this.riderData = msg
      this.getStatus(msg.status)
      this.isLoading = false
      
    })
    this.isLoading = true
    this.socketService.rideRequest((msg:any) => {
      console.log('rideRequest', msg)
      this.rideRequests = msg
      this.isLoading = false
    })

    try {
      const loc = await this.locationService.getCurrentLocation();
      this.lat = loc.lat;
      this.lng = loc.lng;
      console.log('Location:', loc);
      
    } catch (err) {
      console.error(err);
    }

    this.getPolygon()

    this.isInsidePolygon = this.checkInsidePolygon(16.725700, 75.059887);
    console.log(this.isInsidePolygon);
  }

  getStatus(status:any){
    if(status == 'offline'){
      this.status = false 
      console.log(this.status)
    } else {
      this.status = true
      this.clickSound.currentTime = 0; // rewind
  this.clickSound.play();
      setTimeout(() => {
      this.loadMap();
    }, 300);
      console.log(this.status)
    }
  }

  changeStatus(){
    // this.isInsidePolygon = this.checkInsidePolygon(this.lat, this.lng);
    // if(this.isInsidePolygon){
    //    alert('You are outside service area')
    // }
    let status;
    if(this.status == true){
      status = 'online'
      this.clickSound.currentTime = 0; // rewind
  this.clickSound.play();
      setTimeout(() => {
      this.loadMap();
    }, 300);
    } else {
      status = 'offline'
      this.clickSound.currentTime = 0; // rewind
  this.clickSound.play();
    }
    let params:any = {
      status: status,
      riderId: localStorage.getItem('riderId')
    }
    this.isLoading = true
    this.socketService.changeRiderStatus(params)
    this.isLoading = false
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

  async loadMap() {

  const latLng = new google.maps.LatLng(this.lat, this.lng);

  this.map = new google.maps.Map(
    document.getElementById('map')!,
    {
      center: latLng,
      zoom: 16,
      disableDefaultUI: true,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      clickableIcons: false,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ saturation: -20 }] },
        { featureType: 'water', stylers: [{ color: '#c9e6ff' }] }
      ]
    }
  );

  // 🔵 USER LOCATION MARKER
  this.marker = new google.maps.Marker({
    position: latLng,
    map: this.map,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3
    }
  });

  // 🔥 CALL POLYGON API AND DRAW
  await this.loadServiceAreaPolygon();
}


  async loadServiceAreaPolygon() {
  try {
    // 1️⃣ Get polygon points from API
    // const polygonPoints:any = await this.getPolygon();

    // 2️⃣ Convert to Google Maps LatLng format
    const paths = this.polygon.polygon

    // 3️⃣ Create polygon
    const serviceArea = new google.maps.Polygon({
      paths,
      strokeColor: this.polygon.border_color,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: this.polygon.inside_color,
      fillOpacity: 0.15
    });

    // 4️⃣ Add polygon to map
    serviceArea.setMap(this.map);

    // 5️⃣ Adjust map to fit polygon
    const bounds = new google.maps.LatLngBounds();
    paths.forEach((point:any) => bounds.extend(point));
    this.map.fitBounds(bounds);

  } catch (err) {
    console.error('Failed to load polygon', err);
  }
}

checkInsidePolygon(lat: number, lng: number): boolean {

  const userPoint = new google.maps.LatLng(lat, lng);

  return google.maps.geometry.poly.containsLocation(
    userPoint,
    this.polygon
  );
}


  openProfile(){
    this.router.navigate(['/layout/profile']);
  }

  gotoWallet(){
        this.router.navigate(['/layout/wallet']);
  }

  getPolygon(){
    this.isLoading = true
    this.service.getPolygon().subscribe((res:any)=>{
      console.log('polygon res', res);
      this.polygon = res;
      this.isLoading = false
    })
  }

  
  }
