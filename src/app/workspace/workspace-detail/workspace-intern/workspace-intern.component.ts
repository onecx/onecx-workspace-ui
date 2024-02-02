import { Component, Input } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'

import { PortalDTO } from '../../../shared/generated/model/portalDTO'

@Component({
  selector: 'wm-workspace-intern',
  templateUrl: './workspace-intern.component.html'
})
export class WorkspaceInternComponent {
  @Input() portalDetail!: PortalDTO
  @Input() dateFormat = 'medium'

  constructor(private translate: TranslateService) {}
}
