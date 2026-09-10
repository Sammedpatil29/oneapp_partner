import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;

  constructor() {
    const url = environment.socketUrl || 'https://pintu-api.democompany.in.net';
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    this.socket.on('connect', () => {
      console.log('🟢 [Partner Socket] Connected:', this.socket.id);
      const riderId = localStorage.getItem('riderId');
      if (riderId) {
        this.syncRider({ riderId });
      }
    });

    this.socket.on('disconnect', () => {
      console.log('🔴 [Partner Socket] Disconnected');
    });
  }

  // --- Listeners ---
  onMessage(callback: (msg: any) => void) {
    this.socket.on('welcome', callback);
  }

  riderUpdate(callback: (msg: any) => void) {
    this.socket.on('riderUpdate', callback);
  }

  rideRequest(callback: (msg: any) => void) {
    this.socket.on('ride:request', callback);
  }

  onRideConfirmed(callback: (msg: any) => void) {
    this.socket.on('ride:confirmed', callback);
  }

  onRideArrivedAck(callback: (msg: any) => void) {
    this.socket.on('ride:arrived:ack', callback);
  }

  onRideStarted(callback: (msg: any) => void) {
    this.socket.on('ride:started', callback);
  }

  onRideOtpError(callback: (msg: any) => void) {
    this.socket.on('ride:otp_error', callback);
  }

  onRideCompletedAck(callback: (msg: any) => void) {
    this.socket.on('ride:completed:ack', callback);
  }

  onRideUpdate(callback: (msg: any) => void) {
    this.socket.on('rideUpdate', callback);
  }

  onRideActiveResume(callback: (ride: any) => void) {
    this.socket.on('ride:active_resume', callback);
  }

  // --- Emitters ---
  syncRider(data: any) {
    this.socket.emit('syncRider', data);
  }

  changeRiderStatus(data: any) {
    this.socket.emit('changeRiderStatus', data);
  }

  acceptRide(rideId: any, riderId: any) {
    this.socket.emit('ride:accept', { rideId, riderId });
  }

  rejectRide(rideId: any, riderId: any) {
    this.socket.emit('ride:reject', { rideId, riderId });
  }

  notifyArrived(rideId: any) {
    this.socket.emit('ride:arrived', { rideId });
  }

  verifyRideOtp(rideId: any, otp: string) {
    this.socket.emit('ride:verify_otp', { rideId, otp });
  }

  completeRide(rideId: any, fare: number) {
    this.socket.emit('ride:complete', { rideId, fare });
  }

  sendLiveLocation(riderId: any, lat: number, lng: number, heading: number = 0) {
    this.socket.emit('rider:location', { riderId, lat, lng, heading });
  }

  sendSos(riderId: any, lat: number, lng: number, rideId?: any) {
    this.socket.emit('captain:sos', { riderId, lat, lng, rideId });
  }

  cancelRide(data: any) {
    this.socket.emit('cancelRide', data);
  }
}

