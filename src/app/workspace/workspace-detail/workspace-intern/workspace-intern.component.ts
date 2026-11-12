import { DatePipe } from '@angular/common'
import { Component, Input, OnChanges } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { TranslateModule } from '@ngx-translate/core'

import { CheckboxModule } from 'primeng/checkbox'
import { FloatLabelModule } from 'primeng/floatlabel'
import { InputTextModule } from 'primeng/inputtext'
import { TooltipModule } from 'primeng/tooltip'

import { Workspace } from 'src/app/shared/generated'

export type WorkspaceInternFormControls = {
  operator: FormControl<boolean | null>
  mandatory: FormControl<boolean | null>
  disabled: FormControl<boolean | null>
}
@Component({
  selector: 'app-workspace-intern',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    TranslateModule,
    CheckboxModule,
    FloatLabelModule,
    InputTextModule,
    TooltipModule
  ],
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

  // returns the form values to be merged into the workspace, the input stays untouched
  public onSave(): Partial<Workspace> | undefined {
    if (!this.workspace || !this.formGroup.valid) return undefined
    this.editMode = false
    return {
      mandatory: this.formGroup.get('mandatory')?.value ?? false,
      disabled: this.formGroup.get('disabled')?.value ?? false
    }
  }
}
