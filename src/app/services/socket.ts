import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('https://oneapp-express.onrender.com'); // Your backend URL

    this.socket.on('connect', () => {
      console.log('🟢 Connected to Socket.IO server');
    });

    this.socket.on('disconnect', () => {
      console.log('🔴 Disconnected from Socket.IO server');
    });
  }

  // Example: listen for a message from the server
  onMessage(callback: (msg: string) => void) {
    this.socket.on('welcome', callback);
  }

  riderUpdate(callback: (msg: string) => void) {
    return this.socket.on('riderUpdate', callback);
  }

  rideRequest(callback: (msg: string) => void) {
    return this.socket.on('ride:request', callback);
  }

  // Example: send a message to the server
  syncRider(msg: string) {
    this.socket.emit('syncRider', msg);
  }

  changeRiderStatus(msg: string) {
    this.socket.emit('changeRiderStatus', msg);
  }

  createRide(msg: string) {
    this.socket.emit('createRide', msg);
  }

  cancelRide(msg: string) {
    this.socket.emit('cancelRide', msg);
  }

  acceptRide(rideId: string, riderId: number) {
  this.socket.emit('ride:accept', { rideId, riderId });
}

 rejectRide(rideId: number, riderId: number) {
    this.socket.emit('ride:reject', { rideId, riderId });
  }
}
