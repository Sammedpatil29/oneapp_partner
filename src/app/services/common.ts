import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Common {
url = "https://oneapp-backend.onrender.com/api/polygon/6/"
  constructor(private http: HttpClient) { }

  getPolygon(){
    return this.http.get(this.url)
  }
  
}
