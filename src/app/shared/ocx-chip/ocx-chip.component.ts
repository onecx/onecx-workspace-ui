import { Component, Input } from '@angular/core'

import { TooltipModule } from 'primeng/tooltip'

/**
 * This component displays the label text as chip.
 */
@Component({
  selector: 'app-ocx-chip',
  standalone: true,
  imports: [TooltipModule],
  templateUrl: './ocx-chip.component.html'
})
export class OcxChipComponent {
  @Input() public id = 'ocx-chip'
  @Input() public label: string | undefined
  @Input() public title: string | undefined
  @Input() public styleClass: string | undefined
  @Input() public filled = false

  constructor() {}
}
