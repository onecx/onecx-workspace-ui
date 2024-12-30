import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core'
import { FormGroup, FormControl, Validators } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import {
  CreateWorkspaceRoleRequest,
  UpdateWorkspaceRoleRequest,
  WorkspaceRolesAPIService,
  Workspace
} from 'src/app/shared/generated'
import { ChangeMode, Role } from '../workspace-detail/workspace-roles/workspace-roles.component'

@Component({
  selector: 'app-workspace-role-detail',
  templateUrl: './workspace-role-detail.component.html'
})
export class WorkspaceRoleDetailComponent implements OnChanges {
  @Input() workspace!: Workspace | undefined
  @Input() role: Role | undefined
  @Input() roles: Role[] = []
  @Input() changeMode: ChangeMode = 'VIEW'
  @Input() displayDetailDialog = false
  @Input() displayDeleteDialog = false
  @Output() dataChanged: EventEmitter<boolean> = new EventEmitter()

  public formGroupRole: FormGroup
  private orgRoleName: string | undefined

  constructor(
    private readonly wRoleApi: WorkspaceRolesAPIService,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService
  ) {
    this.formGroupRole = new FormGroup({
      id: new FormControl(null),
      name: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
      description: new FormControl(null)
    })
  }

  public ngOnChanges(): void {
    this.formGroupRole.reset()
    if (this.role) {
      this.orgRoleName = this.role?.name
      this.formGroupRole.controls['name'].patchValue(this.role.name)
      this.formGroupRole.controls['description'].patchValue(this.role.description)
      this.changeMode === 'VIEW' ? this.formGroupRole.disable() : this.formGroupRole.enable()
    }
  }

  public onClose(): void {
    this.dataChanged.emit(false)
  }

  /**
   * Save a ROLE
   */
  public onSaveRole(): void {
    if (!this.formGroupRole.valid) {
      console.info('form invalid')
      return
    }
    let roleExists = false
    if (this.roles.length > 0) {
      // 1. check name existence
      let roles = this.roles.filter((r) => r.name === this.formGroupRole.controls['name'].value)
      // 2. filter the current role
      if (this.changeMode === 'EDIT') roles = roles.filter((r) => r.id !== this.role?.id)
      roleExists = roles.length > 0
    }
    if (roleExists) {
      this.msgService.error({
        summaryKey: 'ACTIONS.' + this.changeMode + '.ROLE',
        detailKey: 'ACTIONS.' + this.changeMode + '.MESSAGE.ROLE_ALREADY_EXISTS'
      })
      return
    }
    if (this.changeMode === 'CREATE') {
      const role = {
        name: this.formGroupRole.controls['name'].value,
        description: this.formGroupRole.controls['description'].value
      } as CreateWorkspaceRoleRequest
      this.wRoleApi
        .createWorkspaceRole({
          createWorkspaceRoleRequest: {
            workspaceId: this.workspace?.id ?? '',
            name: role.name,
            description: role.description
          } as CreateWorkspaceRoleRequest
        })
        .subscribe({
          next: (data) => {
            this.msgService.success({ summaryKey: 'ACTIONS.CREATE.ROLE_OK' })
            this.dataChanged.emit(true)
          },
          error: (err) => {
            this.msgService.error({ summaryKey: 'ACTIONS.CREATE.ROLE_NOK' })
            console.error('createWorkspaceRole', err)
          }
        })
    } else {
      const roleNameChanged = this.formGroupRole.controls['name'].value !== this.role?.name
      const role = {
        modificationCount: this.role?.modificationCount,
        name: this.formGroupRole.controls['name'].value,
        description: this.formGroupRole.controls['description'].value
      } as UpdateWorkspaceRoleRequest
      this.wRoleApi.updateWorkspaceRole({ id: this.role?.id ?? '', updateWorkspaceRoleRequest: role }).subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.EDIT.ROLE_OK' })
          this.dataChanged.emit(roleNameChanged)
        },
        error: (err) => {
          this.msgService.error({ summaryKey: 'ACTIONS.EDIT.ROLE_NOK' })
          console.error('updateWorkspaceRole', err)
        }
      })
    }
  }

  public onDeleteRoleConfirmation() {
    this.wRoleApi.deleteWorkspaceRole({ id: this.role?.id ?? '' }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.ROLE.MESSAGE_OK' })
        this.dataChanged.emit(true)
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.ROLE.MESSAGE_NOK' })
        console.error('deleteWorkspaceRole', err)
      }
    })
  }
}
