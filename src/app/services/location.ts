import { Injectable } from '@angular/core';
import { Geolocation, PermissionStatus } from '@capacitor/geolocation';

@Injectable({ providedIn: 'root' })
export class Location {

  async getCurrentLocation(): Promise<{ lat: number; lng: number }> {

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
      maximumAge: 0
    });

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
  }
}
