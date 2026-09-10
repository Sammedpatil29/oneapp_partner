import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { IonApp, IonRouterOutlet, IonIcon } from '@ionic/angular/standalone';
import { SocketService } from 'src/app/services/socket';
import { addIcons } from 'ionicons';
import { 
  homeOutline, home,
  bicycleOutline, bicycle,
  trendingUpOutline, trendingUp,
  walletOutline, wallet,
  personOutline, person,
  navigateOutline, timeOutline,
  giftOutline, notificationsOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: true,
  imports: [IonRouterOutlet, IonApp, CommonModule, FormsModule, IonIcon, RouterModule]
})
export class LayoutPage implements OnInit {

  riderId: any;
  rideRequests: any[] = [];
  isLoading: boolean = false;
  currentRoute: string = '/layout/home';

  constructor(
    private socketService: SocketService,
    private router: Router
  ) {
    addIcons({
      homeOutline, home,
      bicycleOutline, bicycle,
      trendingUpOutline, trendingUp,
      walletOutline, wallet,
      personOutline, person,
      navigateOutline, timeOutline,
      giftOutline, notificationsOutline,
      shieldCheckmarkOutline
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
      }

      setTimeout(() => {
        this.removeExpiredRequest(requestId);
      }, 15000);
    });
  }

  removeExpiredRequest(id: any) {
    this.rideRequests = this.rideRequests.filter((req: any) => req.requestId !== id);
  }

  onAccept(rideId: any) {
    this.socketService.acceptRide(rideId, this.riderId);
    this.rideRequests = [];
    this.router.navigate(['/layout/home']);
  }

  onReject(rideId: any) {
    this.socketService.rejectRide(rideId, this.riderId);
    this.rideRequests = this.rideRequests.filter(r => r.rideId !== rideId && r.id !== rideId);
  }

  navigateTab(route: string) {
    this.router.navigate([route]);
  }

  isTabActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }
}


