import { Component, input } from '@angular/core'
import { TranslateModule } from '@ngx-translate/core'

import { MenuItem } from 'primeng/api'
import { TooltipModule } from 'primeng/tooltip'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { SafeLinkDirective } from 'src/app/shared/safe-link.directive'

@Component({
  selector: 'app-vertical-menu-item',
  standalone: true,
  imports: [AngularAcceleratorModule, SafeLinkDirective, TooltipModule, TranslateModule],
  templateUrl: './vertical-menu-item.component.html',
  styleUrls: ['./vertical-menu-item.component.scss']
})
export class VerticalMenuItemComponent {
  public readonly item = input<MenuItem | undefined>(undefined)
  public readonly id = input<string | undefined>(undefined)
  public readonly styleClass = input<string | undefined>(undefined)
  public readonly styleClassIcon = input<string | undefined>(undefined)
  public readonly styleClassLabel = input<string | undefined>(undefined)
  public readonly title = input<string | undefined>(undefined)
}
