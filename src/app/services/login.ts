import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Login {
  url = 'https://oneapp-express.onrender.com/api/rider/login'

  constructor(private http: HttpClient){}

  login(params:any){
    return this.http.post(this.url, params)
  }
}
