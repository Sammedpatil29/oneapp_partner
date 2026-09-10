import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class LoaderComponent {
  @Input() message: string = 'Loading...';
  @Input() isFullscreen: boolean = false;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
}
