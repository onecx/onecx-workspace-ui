import { Component, Input, SimpleChanges, OnChanges } from '@angular/core'
import { FormArray, FormControl } from '@angular/forms'

import { PortalInternalAPIService } from '../../../shared/generated'
import { PortalDTO } from '../../../shared/generated/model/portalDTO'
import { clonePortalWithMicrofrontendsArray } from '../../../shared/utils'
import { PortalMessageService } from '@onecx/portal-integration-angular'

@Component({
  selector: 'wm-workspace-roles',
  templateUrl: './workspace-roles.component.html',
  styleUrls: ['./workspace-roles.component.scss']
})
export class WorkspaceRolesComponent implements OnChanges {
  @Input() portalDetail!: PortalDTO
  @Input() editMode = false
  addDisplay = false
  formArray = new FormArray([])
  newPortalRole = ''

  constructor(private portalApi: PortalInternalAPIService, private msgService: PortalMessageService) {}

  public ngOnChanges(changes: SimpleChanges): void {
    if (this.portalDetail && changes['portalDetail']) {
      this.setFormData()
    }
  }

  setFormData(): void {
    this.portalDetail.portalRoles?.forEach((element) => {
      const control = new FormControl(element)
      this.formArray.push(control as never)
    })
  }

  toggleAddDialog(): void {
    this.addDisplay = !this.addDisplay
  }

  addPortalRole(): void {
    const newControl = new FormControl(this.newPortalRole)
    this.formArray.push(newControl as never)
    this.newPortalRole = ''
    this.addDisplay = false
    this.onSubmit()
  }

  deleteRole(roleIndex: number): void {
    this.formArray.removeAt(roleIndex)
    this.onSubmit()
  }

  public onSubmit() {
    if (this.formArray.valid) {
      const portal = clonePortalWithMicrofrontendsArray(this.portalDetail)
      // clone form array and use the clone
      const array: string[] = []
      this.formArray.value.forEach((role) => array.push(role))
      portal.portalRoles = array
      this.portalApi
        .updatePortal({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          portalId: this.portalDetail.id!,
          updatePortalDTO: portal
        })
        .subscribe({
          next: () => {
            this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_OK' })
            // add in UI
            this.portalDetail.portalRoles = this.formArray.value
          },
          error: (err) => {
            // console.error('ERR', err)
            // const duplicate = err.error.message.indexOf('contains duplicated roles') > 0
            this.msgService.error({
              summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_NOK'
              // detailKey: duplicate ? 'DETAIL.NEW_ROLE_DUPLICATED' : err.error.message
            })
            // cleanup the form
            this.formArray.removeAt(this.formArray.length - 1)
          }
        })
    } else {
      this.msgService.error({ summaryKey: 'GENERAL.FORM_VALIDATION' })
    }
  }
}
