import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core'
import { FormArray, FormBuilder, FormControl, FormControlState, FormGroup } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import { PortalMessageService } from '@onecx/portal-integration-angular'

import { /* ImageV1APIService,  */ WorkspaceAPIService, Workspace } from '../../../shared/generated'
import { clonePortalWithMicrofrontendsArray } from '../../../shared/utils'
import { LogoState } from '../../workspace-create/logo-state'

export interface PortalImageForm {
  url: FormControl<string | null>
}

@Component({
  selector: 'app-workspace-images',
  templateUrl: './workspace-images.component.html',
  styleUrls: ['./workspace-images.component.scss']
})
export class WorkspaceImagesComponent implements OnChanges {
  @Input() portalDetail!: Workspace
  @Input() editMode = false
  @Output() changeEditMode = new EventEmitter<any>()
  @Output() switchToEditMode = new EventEmitter<any>()

  public formArray!: FormArray<FormGroup<PortalImageForm>>
  public LogoState = LogoState
  public logoState = LogoState.INITIAL

  constructor(
    private messageService: PortalMessageService,
    private translate: TranslateService,
    private api: WorkspaceAPIService,
    private fb: FormBuilder /* // private imageApi: ImageV1APIService */
  ) {
    this.formArray = this.fb.array([] as FormGroup<PortalImageForm>[])
  }
  public ngOnChanges(changes: SimpleChanges): void {
    if (this.portalDetail && changes['portalDetail']) {
      this.setFormData()
    }

    //when we go into edit-mode, then we add one empty input-field.
    if (changes['editMode'] && this.editMode) {
      const group = new FormGroup({
        url: new FormControl('')
      })
      this.formArray.push(group)
    }

    //when we leave edit Mode, remove all empty rows
    if (changes['editMode'] && !this.editMode) {
      this.removeEmptyRows()
    }
  }

  public setFormData(): void {
    if (this.portalDetail && this.portalDetail.subjectLinks) {
      this.portalDetail.imageUrls?.forEach((url: string | FormControlState<string | null> | null | undefined) => {
        const group = new FormGroup<PortalImageForm>({
          url: new FormControl<string | null>(url === undefined ? null : url)
        })
        this.formArray.push(group)
      })
    }
  }

  public deleteSubject(formArrayIndex: any): void {
    this.formArray.removeAt(formArrayIndex)
  }

  public addImageEntry() {
    const group = new FormGroup({
      url: new FormControl('')
    })
    this.formArray.push(group)
  }

  public onSubmit() {
    if (this.formArray.valid) {
      //clear formArray of all empty entries
      this.removeEmptyRows()
      this.portalDetail.imageUrls = this.formArray.value.map((el) => el.url) as unknown as Array<string>
      this.api
        .updateWorkspace({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          id: this.portalDetail.id!,
          updateWorkspaceRequest: { resource: clonePortalWithMicrofrontendsArray(this.portalDetail) }
        })
        .subscribe({
          next: () => {
            this.messageService.success({ summaryKey: 'ACTIONS.EDIT.WORKSPACE.OK' })
          },
          error: (err: { error: any }) => {
            this.messageService.error({ summaryKey: 'ACTIONS.EDIT.WORKSPACE.NOK' })
          }
        })
    } else {
      this.messageService.error({ summaryKey: 'GENERAL.FORM_VALIDATION' })
    }
  }

  // REMEMBER TO CHANGE BACK IN HTML TOO!
  onFileUpload() {
    // onFileUpload(event: { files: File[] }) {
    /* for (const file of event.files) {
      this.imageApi.uploadImage({ image: file }).subscribe((data: { imageUrl: any }) => {
        this.logoState = LogoState.INITIAL

        this.formArray.at(this.lengthFormGroup() - 1).patchValue({ url: data.imageUrl })

        this.portalDetail.imageUrls
          ? this.portalDetail.imageUrls.add(data.imageUrl || '')
          : (this.portalDetail.imageUrls = new Set(data.imageUrl || ''))

        if (this.portalDetail.id) {
          this.api
            .updatePortal({
              portalId: this.portalDetail.id,
              updatePortalDTO: clonePortalWithMicrofrontendsArray(this.portalDetail)
            })
            .subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: this.translate.instant('LOGO.UPLOAD_SUCCESS')
                })
                this.addImageEntry()
              },
              error: (err: { error: any }) => {
                this.messageService.add({
                  severity: 'danger',
                  summary: this.translate.instant('LOGO.UPLOAD_FAIL'),
                  detail: err.error
                })
              }
            })
        }
      })
    } */
  }

  public selectPhoto(): void {
    this.logoState = LogoState.SELECT
  }

  lengthFormGroup(): number {
    return Object.keys(this.formArray.controls).length
  }

  private removeEmptyRows() {
    for (let i = this.lengthFormGroup() - 1; i >= 0; i--) {
      if (this.formArray.controls[i].value['url'] === '') {
        this.formArray.removeAt(i)
      }
    }
  }
}
