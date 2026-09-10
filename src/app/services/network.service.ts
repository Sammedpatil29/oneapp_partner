import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private isOnlineSubject = new BehaviorSubject<boolean>(
    typeof window !== 'undefined' ? window.navigator.onLine : true
  );
  public isOnline$: Observable<boolean> = this.isOnlineSubject.asObservable();

  constructor(private ngZone: NgZone) {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.ngZone.run(() => {
          console.log('🌐 [Network] Device is ONLINE');
          this.isOnlineSubject.next(true);
        });
      });

      window.addEventListener('offline', () => {
        this.ngZone.run(() => {
          console.warn('⚠️ [Network] Device is OFFLINE');
          this.isOnlineSubject.next(false);
        });
      });
    }
  }

  get isOnline(): boolean {
    return this.isOnlineSubject.value;
  }
}

