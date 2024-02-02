import { Component, Input, OnChanges } from '@angular/core'
import { FormControl, FormGroup } from '@angular/forms'

import { PortalDTO } from '../../../shared/generated/model/portalDTO'
import { PortalInternalAPIService } from '../../../shared/generated'
import { clonePortalWithMicrofrontendsArray } from '../../../shared/utils'
import { PortalMessageService } from '@onecx/portal-integration-angular'

@Component({
  selector: 'wm-workspace-contact',
  templateUrl: './workspace-contact.component.html',
  styleUrls: ['./workspace-contact.component.scss']
})
export class WorkspaceContactComponent implements OnChanges {
  @Input() portalDetail!: PortalDTO
  @Input() editMode = false

  public formGroup: FormGroup

  constructor(private api: PortalInternalAPIService, private msgService: PortalMessageService) {
    this.formGroup = new FormGroup({
      companyName: new FormControl(null),
      phoneNumber: new FormControl(null),
      country: new FormControl(null),
      city: new FormControl(null),
      postalCode: new FormControl(null),
      street: new FormControl(null),
      streetNo: new FormControl(null)
    })
  }

  public ngOnChanges(): void {
    this.setFormData()
    this.editMode ? this.formGroup.enable() : this.formGroup.disable()
  }

  setFormData(): void {
    Object.keys(this.formGroup.controls).forEach((element) => {
      if (['street', 'streetNo', 'city', 'postalCode', 'country'].includes(element) && this.portalDetail.address) {
        this.formGroup.controls[element].setValue((this.portalDetail.address as any)[element])
      } else {
        this.formGroup.controls[element].setValue((this.portalDetail as any)[element])
      }
    })
  }

  onSubmit(): void {
    if (this.formGroup.valid) {
      Object.assign(this.portalDetail, this.getPortalChangesFromForm())
      this.api
        .updatePortal({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          portalId: this.portalDetail.id!,
          updatePortalDTO: clonePortalWithMicrofrontendsArray(this.portalDetail)
        })
        .subscribe({
          next: () => {
            this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_OK' })
          },
          error: (err) => {
            this.msgService.error({
              summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_NOK' /* , detailKey: err.error.message */
            })
          }
        })
      this.editMode = false
    } else {
      this.msgService.error({ summaryKey: 'GENERAL.FORM_VALIDATION' })
      console.log('INVALID FORM => contact-info')
    }
  }

  //return the values that are different in form than in PortalDTO
  private getPortalChangesFromForm(): any[] {
    const changes: any = {
      address: {}
    }

    Object.keys(this.formGroup.controls).forEach((key) => {
      if (['street', 'streetNo', 'city', 'postalCode', 'country'].includes(key)) {
        if (!this.portalDetail.address) {
          this.portalDetail.address = {}
        }
        if (this.formGroup.value[key] !== undefined) {
          changes['address'][key] = this.formGroup.value[key]
        }
      } else {
        if (this.formGroup.value[key] !== undefined) {
          changes[key] = this.formGroup.value[key]
        }
      }
    })
    return changes
  }
}
