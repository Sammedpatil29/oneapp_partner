import { Injectable } from '@angular/core';
import { Geolocation, PermissionStatus } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface LocationCoords {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

@Injectable({ providedIn: 'root' })
export class Location {

  async getCurrentLocation(): Promise<LocationCoords> {
    try {
      // 1️⃣ Check permission
      let permStatus: PermissionStatus = await Geolocation.checkPermissions();

      // 2️⃣ Request permission if not granted
      if (permStatus.location !== 'granted') {
        permStatus = await Geolocation.requestPermissions();
        if (permStatus.location !== 'granted') {
          throw new Error('Location permission denied');
        }
      }

      // 3️⃣ Get location
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: position.coords.heading || 0,
        speed: position.coords.speed || 0,
        accuracy: position.coords.accuracy || 0
      };
    } catch (e) {
      // Web fallback
      return new Promise((resolve, reject) => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                heading: pos.coords.heading || 0,
                speed: pos.coords.speed || 0,
                accuracy: pos.coords.accuracy || 0
              });
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
          );
        } else {
          reject(e);
        }
      });
    }
  }

  /**
   * Continuous Location Watch
   * Automatically dispatches GPS coordinate updates whenever the rider moves.
   * Returns a teardown cleanup function.
   */
  async watchLocation(
    onLocation: (coords: LocationCoords) => void,
    onError?: (err: any) => void
  ): Promise<() => void> {
    let watchId: string | number | null = null;

    if (Capacitor.isNativePlatform()) {
      try {
        const id = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 3000
          },
          (position, err) => {
            if (err) {
              if (onError) onError(err);
              return;
            }
            if (position && position.coords) {
              onLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                heading: position.coords.heading || 0,
                speed: position.coords.speed || 0,
                accuracy: position.coords.accuracy || 0
              });
            }
          }
        );
        watchId = id;
        return () => {
          if (watchId !== null) {
            Geolocation.clearWatch({ id: String(watchId) });
          }
        };
      } catch (nativeErr) {
        console.warn('Capacitor watchPosition failed, falling back to navigator.geolocation:', nativeErr);
      }
    }

    // Web / Fallback Geolocation
    if ('geolocation' in navigator) {
      const navWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          onLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading || 0,
            speed: pos.coords.speed || 0,
            accuracy: pos.coords.accuracy || 0
          });
        },
        (err) => {
          if (onError) onError(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );

      return () => {
        navigator.geolocation.clearWatch(navWatchId);
      };
    }

    return () => {};
  }
}
