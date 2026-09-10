import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Common {
  url = `${environment.apiUrl}/api/polygon/6/`;

  constructor(private http: HttpClient) { }

  getPolygon(){
    return this.http.get(this.url);
  }
}
