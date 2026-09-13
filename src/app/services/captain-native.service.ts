import { Injectable, inject } from '@angular/core';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Geolocation, WatchPositionCallback } from '@capacitor/geolocation';
import { BehaviorSubject, Observable } from 'rxjs';
import { SocketService } from './socket';

export interface CaptainNativePluginInterface {
  canDrawOverlays(): Promise<{ hasPermission: boolean }>;
  requestDrawOverlays(): Promise<{ success: boolean }>;
  isIgnoringBatteryOptimizations(): Promise<{ isIgnoring: boolean }>;
  requestIgnoreBatteryOptimizations(): Promise<{ success: boolean }>;
  openAppSettings(): Promise<{ success: boolean }>;
  openLocationSettings(): Promise<{ success: boolean }>;
  launchNavigation(options: { lat: number; lng: number; label?: string }): Promise<{ success: boolean }>;
  setKeepScreenOn(options: { enable: boolean }): Promise<{ keepScreenOn: boolean }>;
  bringAppToForeground(): Promise<{ success: boolean }>;
  showSystemOverlay(options: { earnings?: string; status?: string }): Promise<{ success: boolean }>;
  hideSystemOverlay(): Promise<{ success: boolean }>;
  updateSystemOverlay(options: { earnings?: string; status?: string }): Promise<{ success: boolean }>;
  getInstalledUpiApps(): Promise<{ apps: UpiAppInfo[]; total: number }>;
  launchUpiIntent(options: { url: string; packageName?: string }): Promise<{ success: boolean }>;
  openInBrowser(options: { url: string }): Promise<{ success: boolean }>;
  openInAppBrowser(options: { url: string }): Promise<{ success: boolean }>;
  closeInAppBrowser(): Promise<{ success: boolean }>;
  addListener(eventName: string, listenerFunc: (...args: any[]) => void): Promise<any>;
}

export interface UpiAppInfo {
  packageName: string;
  name: string;
  iconKey: 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'cred' | 'amazonpay' | 'whatsapp' | 'generic';
}

const CaptainNative = registerPlugin<CaptainNativePluginInterface>('CaptainNative');

export interface PermissionStatusSummary {
  overlay: boolean;
  battery: boolean;
  location: boolean;
  notifications: boolean;
  allGranted: boolean;
}

export interface FloatingBubbleState {
  enabled: boolean;
  isOnline: boolean;
  isOnRide: boolean;
  todayEarnings: number;
  completedRides: number;
  activeRide: any | null;
  incomingRequest: any | null;
}

@Injectable({
  providedIn: 'root'
})
export class CaptainNativeService {
  private socketService = inject(SocketService);

  private isNative = Capacitor.isNativePlatform();
  private locationWatchId: string | null = null;
  private audioContext: AudioContext | null = null;

  // Floating Bubble State
  private bubbleStateSubject = new BehaviorSubject<FloatingBubbleState>({
    enabled: true,
    isOnline: false,
    isOnRide: false,
    todayEarnings: 580,
    completedRides: 6,
    activeRide: null,
    incomingRequest: null
  });
  public bubbleState$: Observable<FloatingBubbleState> = this.bubbleStateSubject.asObservable();

  // App Foreground / Background State
  private isAppActiveSubject = new BehaviorSubject<boolean>(true);
  public isAppActive$: Observable<boolean> = this.isAppActiveSubject.asObservable();

  constructor() {
    this.initAppLifecycle();
    this.initSoundEngine();
  }

  get currentState(): FloatingBubbleState {
    return this.bubbleStateSubject.value;
  }

  private initAppLifecycle() {
    try {
      App.addListener('appStateChange', (state) => {
        console.log('📱 [CaptainNative] App state changed. isActive:', state.isActive);
        this.isAppActiveSubject.next(state.isActive);

        if (!state.isActive) {
          if (this.currentState.isOnline) {
            console.log('⚡ [CaptainNative] App in background while online. Activating background GPS & OS floating bubble.');
            this.startContinuousLocationTracking();
            if (this.currentState.enabled) {
              this.showNativeSystemOverlay();
            }
          }
        } else {
          // App brought back to foreground
          this.hideNativeSystemOverlay();
        }
      });
    } catch (e) {
      console.warn('App lifecycle listener not available on web:', e);
    }
  }

  public async showNativeSystemOverlay() {
    if (this.isNative) {
      try {
        const earningsStr = `₹${this.currentState.todayEarnings}`;
        const statusStr = this.currentState.isOnRide ? 'ON_TRIP' : (this.currentState.isOnline ? 'ONLINE' : 'OFFLINE');
        await CaptainNative.showSystemOverlay({ earnings: earningsStr, status: statusStr });
      } catch (e) {
        console.warn('Could not launch system overlay:', e);
      }
    }
  }

  public async hideNativeSystemOverlay() {
    if (this.isNative) {
      try {
        await CaptainNative.hideSystemOverlay();
      } catch (e) {
        // ignore
      }
    }
  }

  public async updateNativeSystemOverlay() {
    if (this.isNative) {
      try {
        const earningsStr = `₹${this.currentState.todayEarnings}`;
        const statusStr = this.currentState.isOnRide ? 'ON_TRIP' : (this.currentState.isOnline ? 'ONLINE' : 'OFFLINE');
        await CaptainNative.updateSystemOverlay({ earnings: earningsStr, status: statusStr });
      } catch (e) {
        // ignore
      }
    }
  }

  // --- Audio / Synth Engine for Ride Alerts & Chimes ---
  private initSoundEngine() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    } catch (e) {
      console.warn('Web Audio not supported:', e);
    }
  }

  public playIncomingRideTone() {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      
      // High-energy attention chime
      const playBeep = (freq: number, startTime: number, duration: number) => {
        if (!this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      playBeep(880, now, 0.15);       // A5
      playBeep(1108.73, now + 0.18, 0.15); // C#6
      playBeep(1318.51, now + 0.36, 0.25); // E6
      playBeep(1760, now + 0.65, 0.35);    // A6
    } catch (err) {
      console.warn('Could not play ride alert audio:', err);
    }
  }

  public playDutyStatusChime(isOnline: boolean) {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      if (isOnline) {
        // Upbeat chime
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      } else {
        // Downbeat chime
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.25);
      }

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      // ignore
    }
  }

  // --- Permissions Check & Requests ---
  public async checkPermissions(): Promise<PermissionStatusSummary> {
    let overlay = false;
    let battery = false;
    let location = false;
    let notifications = true;

    if (this.isNative) {
      try {
        const overlayRes = await CaptainNative.canDrawOverlays();
        overlay = overlayRes.hasPermission;
      } catch (e) {
        console.warn('Overlay check error:', e);
      }

      try {
        const battRes = await CaptainNative.isIgnoringBatteryOptimizations();
        battery = battRes.isIgnoring;
      } catch (e) {
        console.warn('Battery check error:', e);
      }
    } else {
      // Web simulation
      overlay = localStorage.getItem('sim_overlay_granted') === 'true';
      battery = localStorage.getItem('sim_battery_granted') === 'true';
    }

    try {
      const locStatus = await Geolocation.checkPermissions();
      location = locStatus.location === 'granted';
    } catch (e) {
      console.warn('Location check error:', e);
    }

    const allGranted = overlay && battery && location;
    return { overlay, battery, location, notifications, allGranted };
  }

  public async requestEssentialPermissions(): Promise<PermissionStatusSummary> {
    try {
      const locStatus = await Geolocation.checkPermissions();
      if (locStatus.location !== 'granted') {
        const res = await Geolocation.requestPermissions();
        console.log('📍 [CaptainNative] Location permission requested:', res);
      }
    } catch (e) {
      console.warn('Location request error:', e);
    }

    return await this.checkPermissions();
  }

  public async requestLocationPermission(): Promise<boolean> {
    try {
      const res = await Geolocation.requestPermissions();
      return res.location === 'granted';
    } catch (e) {
      console.warn('Location permission request failed:', e);
      return false;
    }
  }

  public async requestOverlayPermission(): Promise<boolean> {
    if (this.isNative) {
      try {
        await CaptainNative.requestDrawOverlays();
        return true;
      } catch (e) {
        console.error('Request overlay error:', e);
        return false;
      }
    } else {
      localStorage.setItem('sim_overlay_granted', 'true');
      return true;
    }
  }

  public async requestBatteryOptimizationBypass(): Promise<boolean> {
    if (this.isNative) {
      try {
        await CaptainNative.requestIgnoreBatteryOptimizations();
        return true;
      } catch (e) {
        console.error('Request battery bypass error:', e);
        return false;
      }
    } else {
      localStorage.setItem('sim_battery_granted', 'true');
      return true;
    }
  }

  public async openLocationSettings(): Promise<void> {
    if (this.isNative) {
      try {
        await CaptainNative.openLocationSettings();
      } catch (e) {
        console.error('Open location settings error:', e);
      }
    }
  }

  public async openAppSettings(): Promise<void> {
    if (this.isNative) {
      try {
        await CaptainNative.openAppSettings();
      } catch (e) {
        console.error('Open app settings error:', e);
      }
    }
  }

  // --- External Navigation (Google Maps) ---
  public async launchNavigation(lat: number, lng: number, label: string = 'Customer Location'): Promise<void> {
    if (this.isNative) {
      try {
        await CaptainNative.launchNavigation({ lat, lng, label });
      } catch (e) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_system');
      }
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  }

  // --- Keep Screen Awake & Foreground Management ---
  public async setKeepAwake(enable: boolean): Promise<void> {
    if (this.isNative) {
      try {
        await CaptainNative.setKeepScreenOn({ enable });
      } catch (e) {
        // ignore
      }
    }
  }

  public async bringToForeground(): Promise<void> {
    if (this.isNative) {
      try {
        await CaptainNative.bringAppToForeground();
      } catch (e) {
        // ignore
      }
    }
  }

  // --- Continuous Background Location Tracking ---
  public async startContinuousLocationTracking(riderId?: string) {
    if (this.locationWatchId) return;

    const id = riderId || localStorage.getItem('riderId');
    if (!id) return;

    try {
      this.locationWatchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3000
        },
        (position, err) => {
          if (position && position.coords) {
            const { latitude, longitude, heading } = position.coords;
            this.socketService.sendLiveLocation(id, latitude, longitude, heading || 0);
          }
        }
      );
      console.log('📍 [CaptainNative] Continuous location watch active:', this.locationWatchId);
    } catch (e) {
      console.error('Failed to start continuous location watch:', e);
    }
  }

  public stopContinuousLocationTracking() {
    if (this.locationWatchId) {
      Geolocation.clearWatch({ id: this.locationWatchId });
      this.locationWatchId = null;
      console.log('📍 [CaptainNative] Location tracking stopped');
    }
  }

  // --- Floating Shortcut Bubble State Mutations ---
  public setDutyStatus(isOnline: boolean) {
    const current = this.bubbleStateSubject.value;
    this.bubbleStateSubject.next({ ...current, isOnline });
    this.playDutyStatusChime(isOnline);

    if (isOnline) {
      this.setKeepAwake(true);
      this.startContinuousLocationTracking();
    } else {
      this.setKeepAwake(false);
      this.stopContinuousLocationTracking();
    }
  }

  public updateTodayEarnings(earnings: number, rides: number) {
    const current = this.bubbleStateSubject.value;
    this.bubbleStateSubject.next({
      ...current,
      todayEarnings: earnings,
      completedRides: rides
    });
  }

  public setActiveRide(ride: any | null) {
    const current = this.bubbleStateSubject.value;
    this.bubbleStateSubject.next({
      ...current,
      isOnRide: !!ride,
      activeRide: ride
    });
  }

  public setIncomingRequest(request: any | null) {
    const current = this.bubbleStateSubject.value;
    this.bubbleStateSubject.next({
      ...current,
      incomingRequest: request
    });

    if (request) {
      this.playIncomingRideTone();
      this.bringToForeground();
    }
  }

  public toggleBubbleEnabled(enabled?: boolean) {
    const current = this.bubbleStateSubject.value;
    const newState = enabled !== undefined ? enabled : !current.enabled;
    this.bubbleStateSubject.next({ ...current, enabled: newState });
  }

  /**
   * Returns list of UPI apps installed on this Android phone (Google Pay, PhonePe, Paytm, BHIM, etc.)
   */
  async getInstalledUpiApps(): Promise<UpiAppInfo[]> {
    if (!this.isNative) {
      return [
        { packageName: 'com.google.android.apps.nbu.paisa.user', name: 'Google Pay', iconKey: 'gpay' },
        { packageName: 'com.phonepe.app', name: 'PhonePe', iconKey: 'phonepe' },
        { packageName: 'net.one97.paytm', name: 'Paytm', iconKey: 'paytm' },
        { packageName: 'in.org.npci.upiapp', name: 'BHIM UPI', iconKey: 'bhim' },
        { packageName: 'com.dreamplug.androidapp', name: 'CRED', iconKey: 'cred' }
      ];
    }
    try {
      const res = await CaptainNative.getInstalledUpiApps();
      return (res && res.apps) ? res.apps : [];
    } catch (e) {
      console.warn('Could not query native installed UPI apps:', e);
      return [];
    }
  }

  /**
   * Launch a specific UPI app directly using its package name and a valid UPI deep-link URL
   */
  async launchUpiIntent(url: string, packageName?: string): Promise<boolean> {
    if (!this.isNative) {
      window.open(url, '_blank');
      return true;
    }
    try {
      const res = await CaptainNative.launchUpiIntent({ url, packageName });
      return !!res?.success;
    } catch (e) {
      console.error('Error launching UPI intent via CaptainNative:', e);
      return false;
    }
  }

  /**
   * Opens payment checkout or payment link in external browser (preferring Chrome)
   * to guarantee 100% native UPI app intent discovery without WebView restrictions.
   */
  async openInBrowser(url: string): Promise<boolean> {
    if (!this.isNative) {
      window.open(url, '_blank');
      return true;
    }
    try {
      const res = await CaptainNative.openInBrowser({ url });
      return !!res?.success;
    } catch (e) {
      console.error('Error opening URL in browser via CaptainNative:', e);
      window.open(url, '_system');
      return true;
    }
  }

  /**
   * Opens the Razorpay payment checkout inside an In-App Browser modal Dialog.
   * Keeps the user completely inside the app while guaranteeing native UPI apps
   * (Google Pay, PhonePe, Paytm, BHIM) and QR codes are displayed and functional.
   */
  async openInAppBrowser(url: string): Promise<boolean> {
    if (!this.isNative) {
      window.open(url, '_blank');
      return true;
    }
    try {
      const res = await CaptainNative.openInAppBrowser({ url });
      return !!res?.success;
    } catch (e) {
      console.error('Error opening In-App Browser via CaptainNative:', e);
      return false;
    }
  }

  async closeInAppBrowser(): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      const res = await CaptainNative.closeInAppBrowser();
      return !!res?.success;
    } catch (e) {
      return false;
    }
  }

  onInAppBrowserClosed(callback: () => void): Promise<any> {
    if (!this.isNative) return Promise.resolve();
    return CaptainNative.addListener('inAppBrowserClosed', callback);
  }

  onInAppBrowserPaymentCompleted(callback: (data: { url: string }) => void): Promise<any> {
    if (!this.isNative) return Promise.resolve();
    return CaptainNative.addListener('inAppBrowserPaymentCompleted', callback);
  }
}

