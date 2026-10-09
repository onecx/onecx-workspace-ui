import { Component, EventEmitter, Input, Output } from '@angular/core'

import { Workspace } from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'

@Component({
  selector: 'app-workspace-delete',
  standalone: true,
  imports: [SharedModule],
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
