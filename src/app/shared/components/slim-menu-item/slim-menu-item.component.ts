import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import { RouterModule } from '@angular/router'
import { UntilDestroy } from '@ngneat/until-destroy'
import { TranslateModule } from '@ngx-translate/core'
import { RippleModule } from 'primeng/ripple'
import { TooltipModule } from 'primeng/tooltip'
import { ItemType, SlimMenuItem } from 'src/app/shared/model/slim-menu-item'
import { SlimMenuMode } from 'src/app/shared/model/slim-menu-mode'

@Component({
  selector: 'app-slim-menu-item',
  templateUrl: './slim-menu-item.component.html',
  styleUrl: './slim-menu-item.component.scss',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule, TooltipModule, RippleModule]
})
@UntilDestroy()
export class SlimMenuItemComponent {
  ItemType = ItemType
  SlimMenuMode = SlimMenuMode

  @Input() id: string = 'ws_slim_menu_item_'
  @Input() item: SlimMenuItem | undefined
  @Input() index: number = 0
  @Input() activeMode: SlimMenuMode = SlimMenuMode.INACTIVE
}
