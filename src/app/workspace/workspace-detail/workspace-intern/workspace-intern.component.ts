import { Component, Input, OnChanges } from '@angular/core'
import { FormControl, FormGroup } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'

import { Workspace } from 'src/app/shared/generated'

@Component({
  selector: 'app-workspace-intern',
  templateUrl: './workspace-intern.component.html'
})
export class WorkspaceInternComponent implements OnChanges {
  @Input() workspace!: Workspace
  @Input() editMode = false
  @Input() dateFormat = 'M/d/yy, hh:mm:ss a'

  public formGroup: FormGroup

  constructor(private readonly translate: TranslateService) {
    this.formGroup = new FormGroup({
      operator: new FormControl<boolean | null>(null),
      mandatory: new FormControl<boolean | null>(null),
      disabled: new FormControl<boolean | null>(null)
    })
  }

  public ngOnChanges(): void {
    this.setFormData()
    this.editMode ? this.formGroup.enable() : this.formGroup.disable()
    this.formGroup.controls['operator'].disable()
  }

  setFormData(): void {
    Object.keys(this.formGroup.controls).forEach((element) => {
      this.formGroup.controls[element].setValue((this.workspace as any)[element])
    })
  }

  public onSave(): void {
    if (this.formGroup.valid) {
      this.workspace.mandatory = this.formGroup.controls['mandatory'].value
      this.workspace.disabled = this.formGroup.controls['disabled'].value
      this.editMode = false
    }
  }
}
