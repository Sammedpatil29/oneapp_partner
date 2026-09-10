import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { IonApp, IonRouterOutlet, IonIcon } from '@ionic/angular/standalone';
import { SocketService } from 'src/app/services/socket';
import { addIcons } from 'ionicons';
import { 
  compassOutline, compass,
  homeOutline, home,
  bicycleOutline, bicycle,
  analyticsOutline, analytics,
  cashOutline, cash,
  walletOutline, wallet,
  cardOutline, card,
  shieldCheckmarkOutline, shieldCheckmark,
  personOutline, person,
  navigateOutline, timeOutline,
  giftOutline, notificationsOutline
} from 'ionicons/icons';
import { filter } from 'rxjs/operators';
import { PermissionsHubComponent } from 'src/app/components/permissions-hub/permissions-hub.component';
import { CaptainNativeService } from 'src/app/services/captain-native.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: true,
  imports: [
    IonRouterOutlet, 
    IonApp, 
    CommonModule, 
    FormsModule, 
    IonIcon, 
    RouterModule,
    PermissionsHubComponent
  ]
})
export class LayoutPage implements OnInit {
  private captainNative = inject(CaptainNativeService);

  riderId: any;
  rideRequests: any[] = [];
  isLoading: boolean = false;
  currentRoute: string = '/layout/home';
  showPermissionsHub: boolean = false;

  constructor(
    private socketService: SocketService,
    private router: Router
  ) {
    addIcons({
      compassOutline, compass,
      homeOutline, home,
      bicycleOutline, bicycle,
      analyticsOutline, analytics,
      cashOutline, cash,
      walletOutline, wallet,
      cardOutline, card,
      shieldCheckmarkOutline, shieldCheckmark,
      personOutline, person,
      navigateOutline, timeOutline,
      giftOutline, notificationsOutline
    });
  }

  ngOnInit() {
    this.riderId = localStorage.getItem('riderId');
    this.currentRoute = this.router.url;

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.urlAfterRedirects || event.url;
    });

    this.socketService.rideRequest((msg: any) => {
      const requestId = msg.id || msg.rideId || Date.now();
      const newRequest = { ...msg, requestId, expiresAt: Date.now() + 15000 };
      
      // Avoid duplicate requests
      if (!this.rideRequests.some(r => r.requestId === requestId || (r.rideId && r.rideId === msg.rideId))) {
        this.rideRequests.push(newRequest);
        this.captainNative.setIncomingRequest(newRequest);
      }

      setTimeout(() => {
        this.removeExpiredRequest(requestId);
      }, 15000);
    });
  }

  removeExpiredRequest(id: any) {
    this.rideRequests = this.rideRequests.filter((req: any) => req.requestId !== id);
    if (this.rideRequests.length === 0) {
      this.captainNative.setIncomingRequest(null);
    }
  }

  onAccept(rideId: any) {
    this.socketService.acceptRide(rideId, this.riderId);
    this.rideRequests = [];
    this.captainNative.setIncomingRequest(null);
    this.router.navigate(['/layout/home']);
  }

  onReject(rideId: any) {
    this.socketService.rejectRide(rideId, this.riderId);
    this.rideRequests = this.rideRequests.filter(r => r.rideId !== rideId && r.id !== rideId);
    if (this.rideRequests.length === 0) {
      this.captainNative.setIncomingRequest(null);
    }
  }

  openPermissionsModal() {
    this.showPermissionsHub = true;
  }

  closePermissionsModal() {
    this.showPermissionsHub = false;
  }

  triggerEmergencySos() {
    const riderId = localStorage.getItem('riderId');
    this.socketService.sendSos(riderId, 18.5204, 73.8567);
    alert('🚨 Emergency SOS Dispatched! Safety team has received your GPS coordinates.');
  }

  navigateTab(route: string) {
    this.router.navigate([route]);
  }

  isTabActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }
}


