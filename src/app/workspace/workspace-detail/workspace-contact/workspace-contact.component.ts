import { Component, Input, OnChanges } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { Workspace } from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'

@Component({
  selector: 'app-workspace-contact',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './workspace-contact.component.html'
})
export class WorkspaceContactComponent implements OnChanges {
  @Input() workspace: Workspace | undefined = undefined
  @Input() editMode = false

  public contactForm: FormGroup

  constructor(private readonly msgService: PortalMessageService) {
    this.contactForm = new FormGroup({
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
    this.fillForm()
    this.editMode ? this.contactForm.enable() : this.contactForm.disable()
  }

  private fillForm(): void {
    if (this.workspace) {
      for (const key of Object.keys(this.contactForm.controls)) {
        if (['street', 'streetNo', 'city', 'postalCode', 'country'].includes(key) && this.workspace?.address) {
          this.contactForm.controls[key].setValue((this.workspace?.address as any)[key])
        } else if ((this.workspace as any)[key]) {
          this.contactForm.controls[key].setValue((this.workspace as any)[key])
        }
      }
    }
  }

  public onSave(): void {
    if (!this.workspace) return
    if (this.contactForm.valid) Object.assign(this.workspace, this.getFormData())
    else this.msgService.error({ summaryKey: 'VALIDATION.FORM_INVALID' })
  }

  // read form values
  private getFormData(): any[] {
    const data: any = {
      address: {}
    }
    Object.keys(this.contactForm.controls).forEach((key) => {
      const val = this.contactForm.value[key] ?? '' // to clear the data: server needs a value
      if (['street', 'streetNo', 'city', 'postalCode', 'country'].includes(key)) data.address[key] = val
      else data[key] = val
    })
    return data
  }
}
