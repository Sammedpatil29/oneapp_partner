import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

export interface AuthResponse {
  message?: string;
  tokenData?: {
    token: string;
    riderId: string | number;
    phone?: string;
    name?: string;
    role?: string;
    is_verified?: boolean;
  };
  success?: boolean;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private apiUrl = environment.apiUrl || 'https://pintu-api.democompany.in.net';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private currentRiderSubject = new BehaviorSubject<any>(this.getStoredRiderInfo());
  public currentRider$ = this.currentRiderSubject.asObservable();

  constructor() {}

  public hasToken(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return !!localStorage.getItem('riderJwt');
  }

  public getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('riderJwt');
  }

  public getRiderId(): string {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem('riderId') || '';
  }

  private getStoredRiderInfo(): any {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem('riderInfo');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  login(params: { phone?: string; email?: string; contact?: string; password?: string; otp?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/rider/login`, params).pipe(
      tap((res) => {
        if (res?.tokenData?.token) {
          this.setSession(res.tokenData);
        }
      })
    );
  }

  sendEmailOtp(email: string): Observable<{ success: boolean; message: string; devOtp?: string }> {
    return this.http.post<{ success: boolean; message: string; devOtp?: string }>(
      `${this.apiUrl}/api/rider/send-otp`,
      { email }
    );
  }

  verifyEmailOtp(email: string, otp: string): Observable<{
    success: boolean;
    isNewUser: boolean;
    email?: string;
    message?: string;
    is_verified?: boolean;
    has_submitted_docs?: boolean;
    verification_status?: string;
    tokenData?: {
      token: string;
      riderId: string | number;
      phone?: string;
      email?: string;
      name?: string;
      role?: string;
      is_verified?: boolean;
    };
    rider?: any;
  }> {
    return this.http.post<any>(`${this.apiUrl}/api/rider/verify-otp`, { email, otp }).pipe(
      tap((res) => {
        if (res?.success && res?.tokenData?.token) {
          this.setSession(res.tokenData);
        }
      })
    );
  }

  checkAuthStatus(): Observable<{
    success: boolean;
    isAuthenticated: boolean;
    is_verified: boolean;
    status: string;
    has_submitted_docs: boolean;
    verification_status: 'verified' | 'verifying' | 'pending_details';
    rider?: any;
    message?: string;
  }> {
    const token = this.getToken();
    const headers: { [header: string]: string } = token ? { Authorization: `Bearer ${token}` } : {};
    return this.http.get<any>(`${this.apiUrl}/api/rider/auth/status`, { headers }).pipe(
      tap({
        next: (res) => {
          if (res?.rider) {
            const current = this.getStoredRiderInfo() || {};
            const updated = { ...current, ...res.rider, token };
            localStorage.setItem('riderInfo', JSON.stringify(updated));
            if (res.rider.id) {
              localStorage.setItem('riderId', String(res.rider.id));
            }
            this.currentRiderSubject.next(updated);
          }
        },
        error: (err) => {
          if (err?.status === 401) {
            this.clearSession();
          }
        }
      })
    );
  }

  register(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/rider/create`, data).pipe(
      tap((res) => {
        if (res?.data?.id) {
          localStorage.setItem('riderId', String(res.data.id));
        }
      })
    );
  }

  setSession(tokenData: { token: string; riderId: string | number; [key: string]: any }) {
    localStorage.setItem('riderJwt', tokenData.token);
    localStorage.setItem('riderId', String(tokenData.riderId));
    localStorage.setItem('riderInfo', JSON.stringify(tokenData));
    this.isAuthenticatedSubject.next(true);
    this.currentRiderSubject.next(tokenData);
  }

  clearSession() {
    localStorage.removeItem('riderJwt');
    localStorage.removeItem('riderId');
    localStorage.removeItem('riderInfo');
    this.isAuthenticatedSubject.next(false);
    this.currentRiderSubject.next(null);
  }

  logout() {
    this.clearSession();
    this.router.navigate(['/login']);
  }
}

