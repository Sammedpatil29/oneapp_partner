import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { wifiOutline, refreshOutline, cloudOfflineOutline } from 'ionicons/icons';

@Component({
  selector: 'app-no-network',
  templateUrl: './no-network.component.html',
  styleUrls: ['./no-network.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class NoNetworkComponent {
  @Input() title: string = 'No Internet Connection';
  @Input() description: string = 'Please check your mobile data or Wi-Fi settings to continue receiving orders.';
  @Input() retryText: string = 'Retry Connection';
  @Input() isFullscreen: boolean = false;
  @Output() retry = new EventEmitter<void>();

  isRetrying: boolean = false;

  constructor() {
    addIcons({ wifiOutline, refreshOutline, cloudOfflineOutline });
  }

  onRetry() {
    this.isRetrying = true;
    this.retry.emit();
    setTimeout(() => {
      this.isRetrying = false;
    }, 1500);
  }
}

