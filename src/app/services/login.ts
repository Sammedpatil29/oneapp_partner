import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Login {
  url = `${environment.apiUrl}/api/rider/login`;

  constructor(private http: HttpClient){}

  login(params: any){
    return this.http.post(this.url, params);
  }
}
