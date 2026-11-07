import { DatePipe } from '@angular/common'
import { Component, Input } from '@angular/core'
import { TranslateModule, TranslateService } from '@ngx-translate/core'

import { FloatLabelModule } from 'primeng/floatlabel'
import { InputTextModule } from 'primeng/inputtext'
import { TooltipModule } from 'primeng/tooltip'

import { WorkspaceMenuItem } from 'src/app/shared/generated'

@Component({
  selector: 'app-menu-intern',
  standalone: true,
  imports: [DatePipe, TranslateModule, FloatLabelModule, InputTextModule, TooltipModule],
  templateUrl: './menu-intern.component.html'
})
export class MenuInternComponent {
  @Input() menuItem: WorkspaceMenuItem | undefined
  @Input() dateFormat = 'M/d/yy, hh:mm:ss a'

  constructor(private readonly translate: TranslateService) {}
}
