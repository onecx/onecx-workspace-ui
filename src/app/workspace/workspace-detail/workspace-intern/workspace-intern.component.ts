import { Component, Input } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'

import { Workspace } from 'src/app/shared/generated'

@Component({
  selector: 'app-workspace-intern',
  templateUrl: './workspace-intern.component.html'
})
export class WorkspaceInternComponent {
  @Input() workspace!: Workspace
  @Input() dateFormat = 'medium'

  constructor(private translate: TranslateService) {}
}
