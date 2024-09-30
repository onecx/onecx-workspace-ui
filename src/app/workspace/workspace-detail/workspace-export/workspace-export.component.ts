import { Component, EventEmitter, Input, Output } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import FileSaver from 'file-saver'

import { Workspace, WorkspaceAPIService } from 'src/app/shared/generated'
import { PortalMessageService } from '@onecx/angular-integration-interface'
import { getCurrentDateTime } from 'src/app/shared/utils'

@Component({
  selector: 'app-workspace-export',
  templateUrl: './workspace-export.component.html'
})
export class WorkspaceExportComponent {
  @Input() workspace!: Workspace
  @Input() workspaceExportVisible = false
  @Output() workspaceExportVisibleChange = new EventEmitter<boolean>()

  public exportMenu = true

  constructor(
    private readonly translate: TranslateService,
    private readonly workspaceApi: WorkspaceAPIService,
    private readonly msgService: PortalMessageService
  ) {}

  public onConfirmExportWorkspace() {
    this.workspaceApi
      .exportWorkspaces({
        exportWorkspacesRequest: { includeMenus: this.exportMenu, names: [this.workspace.name] }
      })
      .subscribe({
        next: (snapshot) => {
          const workspaceJson = JSON.stringify(snapshot, null, 2)
          FileSaver.saveAs(
            new Blob([workspaceJson], { type: 'text/json' }),
            `onecx-workspace_${this.workspace?.name}_${getCurrentDateTime()}.json`
          )
        },
        error: () => {
          this.msgService.error({ summaryKey: 'ACTIONS.EXPORT.MESSAGE.NOK' })
        }
      })
    this.workspaceExportVisibleChange.emit(false)
  }

  public onClose() {
    this.workspaceExportVisibleChange.emit(false)
  }
}
