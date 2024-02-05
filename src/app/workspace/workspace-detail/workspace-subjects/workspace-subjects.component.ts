import { Component, Input, Output, SimpleChanges, EventEmitter, OnChanges } from '@angular/core'
import { PortalDTO } from '../../../shared/generated/model/portalDTO'
import { FormArray, FormBuilder, FormControl, FormControlState, FormGroup } from '@angular/forms'

import { PortalInternalAPIService, SubjectLinkDTOv1 } from '../../../shared/generated'
import { clonePortalWithMicrofrontendsArray } from '../../../shared/utils'
import { PortalMessageService } from '@onecx/portal-integration-angular'

export interface PortalSubjectForm {
  label: FormControl<string | null>
  url: FormControl<string | null>
}
@Component({
  selector: 'app-workspace-subjects',
  templateUrl: './workspace-subjects.component.html',
  styleUrls: ['./workspace-subjects.component.scss']
})
export class WorkspaceSubjectComponent implements OnChanges {
  @Input() portalDetail!: PortalDTO
  @Input() editMode = false
  @Output() changeEditMode = new EventEmitter<any>()
  public formArray!: FormArray<FormGroup<PortalSubjectForm>>

  constructor(
    private api: PortalInternalAPIService,
    private fb: FormBuilder,
    private msgService: PortalMessageService
  ) {
    this.formArray = this.fb.array([] as FormGroup<PortalSubjectForm>[])
  }
  public ngOnChanges(changes: SimpleChanges): void {
    if (this.portalDetail && changes['portalDetail']) {
      this.setFormData()
    }
  }

  public setFormData(): void {
    if (this.portalDetail && this.portalDetail.subjectLinks) {
      this.portalDetail.subjectLinks?.forEach(
        (element: {
          label: string | FormControlState<string | null> | null | undefined
          url: string | FormControlState<string | null> | null | undefined
        }) => {
          const group = new FormGroup<PortalSubjectForm>({
            label: new FormControl<string | null>(element.label === undefined ? null : element.label),
            url: new FormControl<string | null>(element.url === undefined ? null : element.url)
          })
          this.formArray.push(group)
        }
      )
    }
  }

  public deleteSubject(formArrayIndex: any): void {
    this.formArray.removeAt(formArrayIndex)
  }

  public saveForm(): void {
    this.editMode = false
    this.changeEditMode.emit()
    let i = this.formArray.controls.length - 1
    for (i; i >= 0; i--) {
      if (this.formArray.controls[i]['value']['label'] === '' && this.formArray.controls[i]['value']['url'] === '') {
        this.deleteSubject(i)
      }
    }
  }

  public addSubjectLink() {
    const group = new FormGroup({
      label: new FormControl(''),
      url: new FormControl('')
    })
    this.formArray.push(group)
  }

  public onSubmit() {
    if (this.formArray.valid) {
      this.portalDetail.subjectLinks = new Set(
        this.formArray.value.map((el) => {
          return {
            url: el.url,
            label: el.label
          } as SubjectLinkDTOv1
        })
      )
      this.api
        .updatePortal({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          portalId: this.portalDetail.id!,
          updatePortalDTO: clonePortalWithMicrofrontendsArray(this.portalDetail)
        })
        .subscribe({
          next: () => {
            this.msgService.success({ summaryKey: 'ACTIONS.EDIT.CHANGE_OK' })
          },
          error: () => {
            this.msgService.error({ summaryKey: 'ACTIONS.EDIT.CHANGE_NOK' })
          }
        })
      this.editMode = false
      this.changeEditMode.emit()
    } else {
      this.msgService.error({ summaryKey: 'GENERAL.FORM_VALIDATION' })
      console.log('INVALID FORM')
    }
  }
}
