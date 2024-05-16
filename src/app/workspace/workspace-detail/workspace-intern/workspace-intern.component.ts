import { Component, Input, OnChanges } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'

import { Workspace } from 'src/app/shared/generated'

@Component({
  selector: 'app-workspace-intern',
  templateUrl: './workspace-intern.component.html'
})
export class WorkspaceInternComponent implements OnChanges {
  @Input() workspace!: Workspace
  @Input() dateFormat = 'medium'

  public mandatory = false

  constructor(private translate: TranslateService) {}

  public ngOnChanges(): void {
    this.mandatory = this.workspace?.mandatory ?? false
  }
}
