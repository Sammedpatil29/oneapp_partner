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

  login(params: { phone: string; password?: string; otp?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/rider/login`, params).pipe(
      tap((res) => {
        if (res?.tokenData?.token) {
          this.setSession(res.tokenData);
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

  logout() {
    localStorage.removeItem('riderJwt');
    localStorage.removeItem('riderId');
    localStorage.removeItem('riderInfo');
    this.isAuthenticatedSubject.next(false);
    this.currentRiderSubject.next(null);
    this.router.navigate(['/login']);
  }
}

