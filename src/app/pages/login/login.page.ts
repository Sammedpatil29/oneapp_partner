import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';
import { Login } from 'src/app/services/login';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class LoginPage implements OnInit {

  phoneNumber = ''
  password = ''
  constructor(private navCtrl: NavController, private loginService: Login) {  }

  ngOnInit() {
  }

  login(){
    let params = {
      "phone": this.phoneNumber,
      "password": this.password
    }
    this.loginService.login(params).subscribe((res:any)=>{
      if(res.tokenData.token){
        localStorage.setItem('riderJwt', res.tokenData.token)
        localStorage.setItem('riderId', res.tokenData.riderId)
        this.navCtrl.navigateRoot('/layout')
      } else {
        alert('login failed')
      }
      
    })
  }

}
