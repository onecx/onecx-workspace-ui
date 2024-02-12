import { Component, Input } from '@angular/core'

@Component({
  selector: 'app-theme-color-box',
  styleUrls: ['./theme-color-box.component.scss'],
  templateUrl: './theme-color-box.component.html'
})
export class ThemeColorBoxComponent {
  @Input() public styleClass = 'h-1rem'
  @Input() public properties = {
    general: {
      'primary-color': 'lightgray',
      'secondary-color': 'silver',
      'text-color': 'gray'
    },
    topbar: {
      'topbar-text-color': 'gray',
      'topbar-bg-color': 'lightgray',
      'topbar-menu-button-bg-color': 'silver',
      'topbar-left-bg-color': ' lightgray'
    }
  }
}
