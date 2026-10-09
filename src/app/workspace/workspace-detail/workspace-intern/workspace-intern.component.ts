import { Component, Input, OnChanges } from '@angular/core'
import { FormControl, FormGroup } from '@angular/forms'

import { Workspace } from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'

export type WorkspaceInternFormControls = {
  operator: FormControl<boolean | null>
  mandatory: FormControl<boolean | null>
  disabled: FormControl<boolean | null>
}
@Component({
  selector: 'app-workspace-intern',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './workspace-intern.component.html'
})
export class WorkspaceInternComponent implements OnChanges {
  @Input() workspace: Workspace | undefined
  @Input() editMode = false
  @Input() dateFormat = 'M/d/yy, hh:mm:ss a'

  public formGroup = new FormGroup<WorkspaceInternFormControls>({
    operator: new FormControl<boolean | null>(false),
    mandatory: new FormControl<boolean | null>(false),
    disabled: new FormControl<boolean | null>(false)
  })

  public ngOnChanges(): void {
    this.setFormData()
    this.formGroup.disable()
    if (this.editMode) {
      this.formGroup.controls['mandatory'].enable()
      this.formGroup.controls['disabled'].enable()
    }
  }

  private setFormData(): void {
    if (this.workspace) {
      this.formGroup.get('operator')?.setValue(this.workspace.operator ?? false)
      this.formGroup.get('mandatory')?.setValue(this.workspace.mandatory ?? false)
      this.formGroup.get('disabled')?.setValue(this.workspace.disabled ?? false)
    }
  }

  public onSave(): void {
    if (this.workspace && this.formGroup.valid) {
      this.workspace.mandatory = this.formGroup.get('mandatory')?.value ?? false
      this.workspace.disabled = this.formGroup.get('disabled')?.value ?? false
      this.editMode = false
    }
  }
}
