import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, IonItem } from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';
import { Login } from 'src/app/services/login';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonIcon, IonItem]
})
export class LoginPage implements OnInit {

  phoneNumber:any = ''
  password:any = ''
  isLoading: boolean = false
  constructor(private navCtrl: NavController, private loginService: Login) {  }

  ngOnInit() {
    if(localStorage.getItem('riderJwt')){
      this.navCtrl.navigateRoot('/layout')
    } else {
      this.navCtrl.navigateRoot('/login')
    }
  }

  login(){
    let params = {
      "phone": this.phoneNumber,
      "password": this.password
    }
    console.log('login params', params);
    this.isLoading = true
    this.loginService.login(params).subscribe((res:any)=>{
      if(res.tokenData.token){
        localStorage.setItem('riderJwt', res.tokenData.token)
        localStorage.setItem('riderId', res.tokenData.riderId)
        this.isLoading = false
        this.navCtrl.navigateRoot('/layout')
      } else {
        alert('login failed')
      }
      
    })
  }

   login2(){
    let params = {
      "phone": this.phoneNumber,
      "password": this.password
    }
    console.log('login params', params);
    this.isLoading = true
    this.loginService.login(params).subscribe((res:any)=>{
      if(res.tokenData.token){
        localStorage.setItem('riderJwt', res.tokenData.token)
        localStorage.setItem('riderId', res.tokenData.riderId)
        this.isLoading = false
        this.navCtrl.navigateRoot('/onboarding')
      } else {
        alert('login failed')
      }
      
    })
  }

}
