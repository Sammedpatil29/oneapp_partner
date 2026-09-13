import { Injectable, inject } from '@angular/core';
import { PushNotifications, Token, PushNotification } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Router } from '@angular/router';
import { CaptainService } from './captain.service';

@Injectable({
  providedIn: 'root'
})
export class RegisterFcmService {

  private router = inject(Router);
  private captainService = inject(CaptainService);

  initPush() {
    if (!Capacitor.isNativePlatform()) {
      console.log('[FCM] Skipping on web/browser platform');
      return;
    }

    // Request push notification permissions
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      } else {
        console.warn('[FCM] Push permission not granted');
      }
    });

    // Get and store FCM token, then send to backend
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('[FCM] Token:', token.value);
      localStorage.setItem('CaptainFcmToken', token.value);
      this.captainService.sendFcmToken(token.value).subscribe({
        next: () => console.log('[FCM] Token registered on server'),
        error: (err: any) => console.warn('[FCM] Token registration failed:', err)
      });
    });

    // Handle registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[FCM] Registration error:', error);
    });

    // Foreground notification — show via local notification
    PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotification) => {
      console.log('[FCM] Foreground notification:', notification);

      await LocalNotifications.createChannel({
        id: 'captain_notifications',
        name: 'Captain Notifications',
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: 'default'
      });

      await LocalNotifications.schedule({
        notifications: [
          {
            title: notification.title || 'OneApp Partner',
            body: notification.body || '',
            id: Math.floor(Math.random() * 2147483647),
            extra: notification.data,
            channelId: 'captain_notifications'
          }
        ]
      });
    });

    // Tapped local notification (foreground)
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      this.handleNotificationData(notification.notification.extra);
    });

    // Tapped push notification (background / terminated)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[FCM] Action performed:', action.notification);
      this.handleNotificationData(action.notification.data);
    });
  }

  private handleNotificationData(data: any) {
    if (!data) return;
    if (data.type === 'ride_request' || data.rideId) {
      this.router.navigateByUrl('/layout/home');
    } else if (data.type === 'kyc_update' || data.type === 'kyc_verified') {
      this.router.navigate(['/onboarding'], { queryParams: { step: '4' } });
    }
  }
}
