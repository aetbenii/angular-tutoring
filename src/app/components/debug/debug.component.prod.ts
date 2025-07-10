import { Component } from '@angular/core';

@Component({
  selector: 'app-debug',
  standalone: true,
  template: '<div></div>',
  styleUrls: ['./debug.component.prod.scss']
})
export class DebugComponent {
  // Empty component for production builds
}