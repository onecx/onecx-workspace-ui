import { Component, Input, Output, SimpleChanges, OnChanges, EventEmitter } from '@angular/core'
import { FormArray, FormControl } from '@angular/forms'

import { WorkspaceAPIService } from '../../../shared/generated'
import { Workspace } from '../../../shared/generated'
import { PortalMessageService } from '@onecx/portal-integration-angular'

@Component({
  selector: 'app-workspace-roles',
  templateUrl: './workspace-roles.component.html',
  styleUrls: ['./workspace-roles.component.scss']
})
export class WorkspaceRolesComponent implements OnChanges {
  @Input() workspaceDetail!: Workspace
  @Input() editMode = false
  @Output() saveRoleEvent = new EventEmitter()
  addDisplay = false
  formArray = new FormArray([])
  newWorkspaceRole = ''

  constructor(private workspaceApi: WorkspaceAPIService, private msgService: PortalMessageService) {}

  public ngOnChanges(changes: SimpleChanges): void {
    if (this.workspaceDetail && changes['workspaceDetail']) {
      this.setFormData()
    }
  }

  setFormData(): void {
    this.workspaceDetail.workspaceRoles?.forEach((element: any) => {
      const control = new FormControl(element)
      this.formArray.push(control as never)
    })
  }

  toggleAddDialog(): void {
    this.addDisplay = !this.addDisplay
  }

  addPortalRole(): void {
    const newControl = new FormControl(this.newWorkspaceRole)
    this.formArray.push(newControl as never)
    this.newWorkspaceRole = ''
    this.addDisplay = false
    this.updateRoles()
  }

  deleteRole(roleIndex: number): void {
    this.formArray.removeAt(roleIndex)
    this.updateRoles()
  }

  public updateRoles() {
    if (this.formArray.valid) {
      const array: string[] = []
      this.formArray.value.forEach((role) => array.push(role))
      this.saveRoleEvent.emit(this.formArray.value)
      // clean up the form
      this.formArray.removeAt(this.formArray.length - 1)
    } else {
      this.msgService.error({ summaryKey: 'GENERAL.FORM_VALIDATION' })
    }
  }
}
