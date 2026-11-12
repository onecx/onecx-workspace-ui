import { Component, EventEmitter, Input, Output } from '@angular/core'
import { TranslateModule } from '@ngx-translate/core'

import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'
import { MessageModule } from 'primeng/message'
import { TooltipModule } from 'primeng/tooltip'

import { Workspace } from 'src/app/shared/generated'

@Component({
  selector: 'app-workspace-delete',
  standalone: true,
  imports: [TranslateModule, DialogModule, MessageModule, ButtonModule, TooltipModule],
  templateUrl: './workspace-delete.component.html'
})
export class WorkspaceDeleteComponent {
  @Input() workspace: Workspace | undefined
  @Input() workspaceDeleteVisible = false
  @Output() workspaceDeleteVisibleChange = new EventEmitter<boolean>()
  @Output() confirmDelete = new EventEmitter<void>()

  public onClose() {
    this.workspaceDeleteVisibleChange.emit(false)
  }

  public onConfirmDeleteWorkspace() {
    this.confirmDelete.emit()
  }
}
