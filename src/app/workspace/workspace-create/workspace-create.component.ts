import { Component, Output, EventEmitter } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { Observable, map } from 'rxjs'
import { SelectItem } from 'primeng/api/selectitem'
import { FileUpload } from 'primeng/fileupload'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import { sortByLocale } from 'src/app/shared/utils'
import {
  WorkspaceAPIService,
  Workspace,
  ImagesInternalAPIService,
  RefType,
  GetImageRequestParams,
  UploadImageRequestParams
} from 'src/app/shared/generated'

@Component({
  selector: 'app-workspace-create',
  templateUrl: './workspace-create.component.html'
})
export class WorkspaceCreateComponent {
  @Output() toggleCreationDialogEvent = new EventEmitter()

  public themes$: Observable<SelectItem<string>[]>
  public formGroup: FormGroup
  private workspace!: Workspace
  public hasPermission = false
  public selectedLogoFile: File | undefined
  public preview = false
  public previewSrc: string | undefined
  public minimumImageWidth = 150
  public minimumImageHeight = 150
  public workspaceCreationValidationMsg = false
  public fetchingLogoUrl?: string
  public urlPattern = '/base-path-to-workspace'
  public logoImageWasUploaded: boolean | undefined

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private user: UserService,
    private workspaceApi: WorkspaceAPIService,
    private imageApi: ImagesInternalAPIService,
    private message: PortalMessageService,
    private translate: TranslateService
  ) {
    this.formGroup = new FormGroup({
      name: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      theme: new FormControl(null),
      homePage: new FormControl(null, [Validators.maxLength(255)]),
      logoUrl: new FormControl('', [Validators.maxLength(255)]),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.pattern('^/.*')]),
      footerLabel: new FormControl(null, [Validators.maxLength(255)]),
      description: new FormControl(null, [Validators.maxLength(255)])
    })
    this.themes$ = this.workspaceApi.getAllThemes().pipe(map((val: any[]) => val.sort(sortByLocale)))
  }

  closeDialog() {
    this.formGroup.reset()
    this.fetchingLogoUrl = undefined
    this.selectedLogoFile = undefined
    this.toggleCreationDialogEvent.emit()
  }

  savePortal() {
    this.workspace = { ...this.formGroup.value }
    this.workspaceApi
      .createWorkspace({
        createWorkspaceRequest: { resource: this.formGroup.value }
      })
      .pipe()
      .subscribe({
        next: (fetchedPortal) => {
          this.message.success({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE_OK' })
          this.workspaceCreationValidationMsg = false
          this.closeDialog()
          this.router.navigate(['./' + fetchedPortal.resource?.name], { relativeTo: this.route })
        },
        error: (err: { error: { message: any } }) => {
          this.message.error({ summaryKey: 'ACTIONS.CREATE.MESSAGE.CREATE_NOK' })
        }
      })
  }

  // former used to check the size of the image
  //   the size should be limited due performance reasons!
  public onSelect(event: Event, uploader: FileUpload): void {
    this.selectedLogoFile = uploader.files[0]
    this.checkDimension(this.selectedLogoFile, uploader)
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */ /* TODO: is uploader needed */
  private checkDimension(file: File, uploader: FileUpload): void {
    const reader = new FileReader()
    const img = new Image()

    reader.onload = (e: any) => {
      img.src = e.target.result.toString()

      img.onload = () => {
        const elem = document.createElement('canvas')
        elem.width = 150
        elem.height = 150
        const ctx = elem.getContext('2d')
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ctx!.drawImage(img, 0, 0, 150, 150)
        elem.toBlob((blob) => {
          if (blob) {
            this.selectedLogoFile = new File([blob], 'untitled', { type: blob.type })
          }
        })
        this.preview = true
        this.previewSrc = elem.toDataURL()
      }
    }
    reader.readAsDataURL(file)
  }

  onFileUpload(ev: Event, fieldType: 'logo') {
    let workspaceName = this.formGroup.controls['name'].value

    if (ev.target && (ev.target as HTMLInputElement).files) {
      const files = (ev.target as HTMLInputElement).files
      if (files) {
        if (workspaceName == undefined || workspaceName == '' || workspaceName == null) {
          this.message.error({ summaryKey: 'IMAGE.UPLOAD_FAIL' })
        } else if (files[0].size > 110000) {
          this.message.error({ summaryKey: 'IMAGE.UPLOAD_FAIL' })
        } else {
          let requestParametersGet: GetImageRequestParams
          requestParametersGet = {
            refId: workspaceName,
            refType: RefType.Logo
          }

          let requestParameters: UploadImageRequestParams
          const blob = new Blob([files[0]], { type: files[0].type })
          let imageType: RefType = RefType.Logo

          requestParameters = {
            contentLength: files.length,
            refId: this.formGroup.controls['name'].value!,
            refType: imageType,
            body: blob
          }

          this.fetchingLogoUrl = undefined

          this.imageApi.getImage(requestParametersGet).subscribe(
            (res) => {
              if (RegExp(/^.*.(jpg|jpeg|png)$/).exec(files[0].name)) {
                this.imageApi.updateImage(requestParameters).subscribe(() => {
                  this.fetchingLogoUrl =
                    this.imageApi.configuration.basePath + '/images/' + workspaceName + '/' + fieldType
                  this.message.info({ summaryKey: 'IMAGE.UPLOAD_SUCCESS' })
                  this.formGroup.controls['imageUrl'].setValue('')
                  this.logoImageWasUploaded = true
                })
              }
            },
            (err) => {
              if (RegExp(/^.*.(jpg|jpeg|png)$/).exec(files[0].name)) {
                this.imageApi.uploadImage(requestParameters).subscribe(() => {
                  this.fetchingLogoUrl =
                    this.imageApi.configuration.basePath + '/images/' + workspaceName + '/' + fieldType
                  this.message.info({ summaryKey: 'IMAGE.UPLOAD_SUCCESS' })
                  this.formGroup.controls['imageUrl'].setValue('')
                  this.logoImageWasUploaded = true
                })
              }
            }
          )
        }
      }
    }
  }

  inputChange(event: Event) {
    this.fetchingLogoUrl = (event.target as HTMLInputElement).value
    if ((event.target as HTMLInputElement).value == undefined || (event.target as HTMLInputElement).value == '') {
      this.fetchingLogoUrl =
        this.imageApi.configuration.basePath + '/images/' + this.formGroup.controls['name'].value + '/logo'
    }
  }
}
