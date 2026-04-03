import { Component, EventEmitter, Input, Output } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'

import { Workspace, WorkspaceAPIService } from 'src/app/shared/generated'
import { PortalMessageService } from '@onecx/angular-integration-interface'

@Component({
  selector: 'app-workspace-i18n',
  templateUrl: './workspace-i18n.component.html'
})
export class WorkspaceI18nComponent {
  @Input() workspace!: Workspace
  @Input() workspaceI18nVisible = false
  @Input() propertyName: string | undefined = undefined
  @Output() workspaceI18nVisibleChange = new EventEmitter<boolean>()

  public exportMenu = true

  constructor(
    private readonly translate: TranslateService,
    private readonly workspaceApi: WorkspaceAPIService,
    private readonly msgService: PortalMessageService
  ) {}

  public onClose() {
    this.workspaceI18nVisibleChange.emit(false)
  }
  public onSave() {
    this.workspaceI18nVisibleChange.emit(true)
    this.workspaceApi
      .updateWorkspace({ id: this.workspace.id!, updateWorkspaceRequest: { resource: this.workspace } })
      .subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'MESSAGES.WORKSPACE.I18N.SUCCESS' })
        },
        error: () => {
          this.msgService.error({ summaryKey: 'MESSAGES.WORKSPACE.I18N.ERROR' })
        }
      })
  }
}
