import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

export interface CaptainProfile {
  id: string;
  name: string;
  contact: string;
  role: string;
  image_url: string;
  vehicle_number: string;
  vehicle_model: string;
  vehicle_type: string;
  fuel_type: string;
  join_date: string;
  status: string;
  earnings: number;
  is_verified: boolean;
  rating?: any;
  performance?: {
    acceptance_rate: string;
    cancellation_rate: string;
    completion_rate: string;
    lifetime_rides: number;
    total_distance_km: number;
  };
  captain_level?: string;
  kyc_docs?: any;
}

export interface EarningsData {
  today: {
    total_earnings: number;
    rides_completed: number;
    hours_online: string;
    fare_earnings: number;
    tips: number;
    incentives: number;
  };
  this_week: {
    total_earnings: number;
    rides_completed: number;
    chart_data: Array<{ day: string; amount: number; rides: number }>;
  };
  this_month: {
    total_earnings: number;
    rides_completed: number;
  };
  active_incentives: Array<{
    id: string;
    title: string;
    description: string;
    target_rides: number;
    completed_rides: number;
    reward_amount: number;
    is_completed: boolean;
    progress_percent: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class CaptainService {
  private apiUrl = environment.apiUrl || 'https://pintu-api.democompany.in.net';

  constructor(private http: HttpClient) {}

  getRiderId(): string {
    return localStorage.getItem('riderId') || '101';
  }

  // 1. Profile & Status
  getProfile(): Observable<any> {
    const id = this.getRiderId();
    return this.http.get(`${this.apiUrl}/api/rider/profile/${id}`);
  }

  updateProfile(data: any): Observable<any> {
    const id = this.getRiderId();
    return this.http.put(`${this.apiUrl}/api/rider/profile/${id}`, data);
  }

  updateStatus(status: boolean | string, lat?: number, lng?: number): Observable<any> {
    const id = this.getRiderId();
    const statusStr = status === 'onride' ? 'onride' : (status === true || status === 'online' ? 'online' : 'offline');
    return this.http.put(`${this.apiUrl}/api/rider/status/${id}`, { status: statusStr, lat, lng });
  }

  // 2. Earnings
  getEarnings(): Observable<{ success: boolean; data: EarningsData }> {
    const id = this.getRiderId();
    return this.http.get<{ success: boolean; data: EarningsData }>(`${this.apiUrl}/api/rider/earnings/${id}`);
  }

  // 3. Wallet & Commission Payment
  getWallet(): Observable<any> {
    const id = this.getRiderId();
    return this.http.get(`${this.apiUrl}/api/rider/wallet/${id}`);
  }

  payCommission(amount: number): Observable<any> {
    const id = this.getRiderId();
    return this.http.post(`${this.apiUrl}/api/rider/wallet/pay-commission`, { id, amount });
  }

  createRazorpayOrder(amount: number): Observable<any> {
    const id = this.getRiderId();
    return this.http.post(`${this.apiUrl}/api/rider/wallet/razorpay/order`, { id, amount });
  }

  verifyRazorpayPayment(payload: {
    amount: number;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature?: string;
  }): Observable<any> {
    const id = this.getRiderId();
    return this.http.post(`${this.apiUrl}/api/rider/wallet/razorpay/verify`, {
      id,
      ...payload
    });
  }

  checkRazorpayOrderStatus(orderId: string): Observable<any> {
    const id = this.getRiderId();
    return this.http.post(`${this.apiUrl}/api/rider/wallet/razorpay/check-status`, {
      id,
      order_id: orderId
    });
  }

  withdrawEarnings(amount: number, upiId?: string): Observable<any> {
    const id = this.getRiderId();
    return this.http.post(`${this.apiUrl}/api/rider/wallet/pay-commission`, { id, amount });
  }

  // 4. Referrals
  getReferrals(): Observable<any> {
    const id = this.getRiderId();
    return this.http.get(`${this.apiUrl}/api/rider/referrals/${id}`);
  }

  // 5. Ride History
  getRideHistory(filter: string = 'all'): Observable<any> {
    const id = this.getRiderId();
    return this.http.get(`${this.apiUrl}/api/rider/rides/${id}?filter=${filter}`);
  }

  // 6. Notifications
  getNotifications(): Observable<any> {
    const id = this.getRiderId();
    return this.http.get(`${this.apiUrl}/api/rider/notifications/${id}`);
  }

  // 7. Safety SOS
  triggerSos(lat: number, lng: number, rideId?: string): Observable<any> {
    const id = this.getRiderId();
    return this.http.post(`${this.apiUrl}/api/rider/sos`, {
      riderId: id,
      current_lat: lat,
      current_lng: lng,
      rideId
    });
  }

  // 8. FCM Token
  sendFcmToken(fcm_token: string): Observable<any> {
    const riderId = this.getRiderId();
    const token = localStorage.getItem('riderToken') || '';
    return this.http.patch(
      `${this.apiUrl}/api/rider/fcm-token`,
      { fcm_token, riderId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  // 9. Single Ride Detail
  getRideDetail(rideId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/rider/rides/detail/${rideId}`);
  }

  // 10. Update Payout Account (UPI / Bank)
  updatePayoutAccount(data: { upi_id: string; bank_name?: string; account_number?: string }): Observable<any> {
    const id = this.getRiderId();
    return this.http.put(`${this.apiUrl}/api/rider/profile/${id}`, { payout_account: data });
  }

  // 11. Current Active Ongoing Ride (for restart / refresh recovery)
  getActiveRide(): Observable<any> {
    const id = this.getRiderId();
    return this.http.get(`${this.apiUrl}/api/rider/active-ride/${id}`);
  }
}

