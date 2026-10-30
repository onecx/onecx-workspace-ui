import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { SharedModule } from 'src/app/shared/shared.module'
import { WorkspaceRolesAPIService } from 'src/app/shared/generated'
import { Role } from '../workspace-detail/workspace-roles/workspace-roles.component'

@Component({
  selector: 'app-workspace-role-delete',
  standalone: true,
  imports: [SharedModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-role-delete.component.html'
})
export class WorkspaceRoleDeleteComponent {
  private readonly wRoleApi = inject(WorkspaceRolesAPIService)
  private readonly msgService = inject(PortalMessageService)

  public readonly role = input<Role | undefined>()
  public readonly displayDeleteDialog = input(false)
  public readonly dataChanged = output<boolean>()

  public readonly showDialog = computed(() => this.displayDeleteDialog() && !!this.role())

  public onClose(): void {
    this.dataChanged.emit(false)
  }

  public onDeleteRoleConfirmation(): void {
    this.wRoleApi.deleteWorkspaceRole({ id: this.role()?.id ?? '' }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.ROLE.MESSAGE.OK' })
        this.dataChanged.emit(true)
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.ROLE.MESSAGE.NOK' })
        console.error('deleteWorkspaceRole', err)
      }
    })
  }
}
