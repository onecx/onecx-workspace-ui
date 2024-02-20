import { Component, Input, OnChanges } from '@angular/core'
import { FormControl, FormGroup } from '@angular/forms'

import { Workspace } from 'src/app/shared/generated'
import { PortalMessageService } from '@onecx/portal-integration-angular'

@Component({
  selector: 'app-workspace-contact',
  templateUrl: './workspace-contact.component.html',
  styleUrls: ['./workspace-contact.component.scss']
})
export class WorkspaceContactComponent implements OnChanges {
  @Input() workspaceDetail!: Workspace
  @Input() editMode = false

  public formGroup: FormGroup

  constructor(private msgService: PortalMessageService) {
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
      if (['street', 'streetNo', 'city', 'postalCode', 'country'].includes(element) && this.workspaceDetail.address) {
        this.formGroup.controls[element].setValue((this.workspaceDetail.address as any)[element])
      } else {
        this.formGroup.controls[element].setValue((this.workspaceDetail as any)[element])
      }
    })
  }

  onSubmit(): void {
    if (this.formGroup.valid) {
      Object.assign(this.workspaceDetail, this.getPortalChangesFromForm())
      this.editMode = false
    } else {
      this.msgService.error({ summaryKey: 'GENERAL.FORM_VALIDATION' })
      console.log('INVALID FORM => contact-info')
    }
  }

  //return the values that are different in form than in Workspace
  private getPortalChangesFromForm(): any[] {
    const changes: any = {
      address: {}
    }

    Object.keys(this.formGroup.controls).forEach((key) => {
      if (['street', 'streetNo', 'city', 'postalCode', 'country'].includes(key)) {
        if (!this.workspaceDetail.address) {
          this.workspaceDetail.address = {}
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
