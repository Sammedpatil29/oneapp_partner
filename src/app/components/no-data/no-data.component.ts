import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cubeOutline,
  bicycleOutline,
  walletOutline,
  notificationsOutline,
  receiptOutline,
  searchOutline,
  folderOpenOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-no-data',
  templateUrl: './no-data.component.html',
  styleUrls: ['./no-data.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class NoDataComponent {
  @Input() icon: string = 'cube-outline';
  @Input() title: string = 'No Records Found';
  @Input() description: string = 'There is no data to display right now.';
  @Input() actionText?: string;
  @Output() action = new EventEmitter<void>();

  constructor() {
    addIcons({
      cubeOutline,
      bicycleOutline,
      walletOutline,
      notificationsOutline,
      receiptOutline,
      searchOutline,
      folderOpenOutline
    });
  }

  onAction() {
    this.action.emit();
  }
}

