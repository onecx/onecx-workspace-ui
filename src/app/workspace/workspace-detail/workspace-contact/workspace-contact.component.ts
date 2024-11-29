import { Component, Input, OnChanges } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'

import { Workspace } from 'src/app/shared/generated'

@Component({
  selector: 'app-workspace-contact',
  templateUrl: './workspace-contact.component.html'
})
export class WorkspaceContactComponent implements OnChanges {
  @Input() workspace!: Workspace
  @Input() editMode = false

  public formGroup: FormGroup

  constructor() {
    this.formGroup = new FormGroup({
      companyName: new FormControl(null, [Validators.maxLength(255)]),
      phoneNumber: new FormControl(null, [Validators.maxLength(255)]),
      country: new FormControl(null, [Validators.maxLength(255)]),
      city: new FormControl(null, [Validators.maxLength(255)]),
      postalCode: new FormControl(null, [Validators.maxLength(255)]),
      street: new FormControl(null, [Validators.maxLength(255)]),
      streetNo: new FormControl(null, [Validators.maxLength(255)])
    })
  }

  public ngOnChanges(): void {
    this.setFormData()
    this.editMode ? this.formGroup.enable() : this.formGroup.disable()
  }

  setFormData(): void {
    Object.keys(this.formGroup.controls).forEach((element) => {
      if (['street', 'streetNo', 'city', 'postalCode', 'country'].includes(element) && this.workspace.address) {
        this.formGroup.controls[element].setValue((this.workspace.address as any)[element])
      } else {
        this.formGroup.controls[element].setValue((this.workspace as any)[element])
      }
    })
  }

  public onSave(): void {
    if (this.formGroup.valid) {
      Object.assign(this.workspace, this.getPortalChangesFromForm())
      this.editMode = false
    }
  }

  //return the values that are different in form than in Workspace
  private getPortalChangesFromForm(): any[] {
    const changes: any = {
      address: {}
    }

    Object.keys(this.formGroup.controls).forEach((key) => {
      if (['street', 'streetNo', 'city', 'postalCode', 'country'].includes(key)) {
        if (!this.workspace.address) {
          this.workspace.address = {}
        }
        if (this.formGroup.value[key] !== undefined) {
          changes['address'][key] = this.formGroup.value[key]
        }
      } else if (this.formGroup.value[key] !== undefined) {
        changes[key] = this.formGroup.value[key]
      }
    })
    return changes
  }
}
