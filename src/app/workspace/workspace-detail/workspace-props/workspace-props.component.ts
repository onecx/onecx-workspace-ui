import { Component, Input, OnChanges, OnInit } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { Location } from '@angular/common'
import { Observable, of } from 'rxjs'

import { PortalMessageService } from '@onecx/portal-integration-angular'

import {
  GetImageRequestParams,
  ImagesInternalAPIService,
  RefType,
  UploadImageRequestParams,
  WorkspaceAPIService
} from 'src/app/shared/generated'
import { Workspace } from 'src/app/shared/generated'
import { copyToClipboard, sortByLocale } from 'src/app/shared/utils'

@Component({
  selector: 'app-workspace-props',
  templateUrl: './workspace-props.component.html',
  styleUrls: ['./workspace-props.component.scss']
})
export class WorkspacePropsComponent implements OnChanges, OnInit {
  @Input() workspace!: Workspace
  @Input() editMode = false

  public formGroup: FormGroup

  public mfeRList: { label: string | undefined; value: string }[] = []
  public themes$: Observable<any[]> = of([])
  public themes: string[] = []
  public theme: string | undefined
  public urlPattern = '/base-path-to-portal'
  public copyToClipboard = copyToClipboard // make available from utils
  public sortByLocale = sortByLocale

  //Logo
  public preview = false
  public previewSrc: string | undefined
  public selectedFile: File | undefined
  public minimumImageWidth = 150
  public minimumImageHeight = 150
  public fetchingLogoUrl?: string
  private oldWorkspaceName: string = ''
  public logoImageWasUploaded: boolean | undefined

  constructor(
    private location: Location,
    private msgService: PortalMessageService,
    private imageApi: ImagesInternalAPIService,
    private workspaceApi: WorkspaceAPIService
  ) {
    this.formGroup = new FormGroup({
      name: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      theme: new FormControl(null),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(1), Validators.pattern('^/.*')]),
      homePage: new FormControl(null, [Validators.maxLength(255)]),
      logoUrl: new FormControl('', [Validators.maxLength(255)]),
      rssFeedUrl: new FormControl(null, [Validators.maxLength(255)]),
      footerLabel: new FormControl(null, [Validators.maxLength(255)]),
      description: new FormControl(null, [Validators.maxLength(255)])
    })
  }

  public ngOnChanges(): void {
    this.setFormData()
    this.editMode ? this.formGroup.enable() : this.formGroup.disable()
    this.oldWorkspaceName = this.workspace.name
    if (this.workspace.name === 'ADMIN') this.formGroup.controls['name'].disable()
  }

  ngOnInit(): void {
    let workspaceName = this.formGroup.controls['name'].value!
    let requestParametersGet: GetImageRequestParams = {
      refId: workspaceName,
      refType: RefType.Logo
    }
    if (workspaceName === undefined || workspaceName === '' || workspaceName === null) {
      this.logoImageWasUploaded = false
    } else {
      this.imageApi.getImage(requestParametersGet).subscribe(() => {
        this.logoImageWasUploaded = true
      })
    }
    this.fetchingLogoUrl = this.getImageUrl()
    if (this.workspace.theme) {
      this.themes[0] = this.workspace.theme
    } else {
      this.workspaceApi.getAllThemes().subscribe((themes) => {
        this.themes = [''].concat(themes)
      })
    }
  }

  public setFormData(): void {
    Object.keys(this.formGroup.controls).forEach((element) => {
      this.formGroup.controls[element].setValue((this.workspace as any)[element])
    })
  }

  public onSubmit(): void {
    if (this.formGroup.valid) {
      Object.assign(this.workspace, this.getWorkspaceChangesFromForm())
      this.editMode = false
      if (this.oldWorkspaceName !== this.workspace.name) {
        this.location.back()
      }
    } else {
      this.msgService.error({ summaryKey: 'GENERAL.FORM_VALIDATION' })
    }
  }

  //return the values that are different in form than in PortalDTO
  private getWorkspaceChangesFromForm(): any {
    const changes: any = {}
    Object.keys(this.formGroup.controls).forEach((key) => {
      if (this.formGroup.value[key] !== undefined) {
        if (this.formGroup.value[key] !== (this.workspace as any)[key]) {
          changes[key] = this.formGroup.value[key]
        }
      }
    })
    return changes
  }

  public onFileUpload(ev: Event, fieldType: 'logo'): void {
    let workspaceName = this.formGroup.controls['name'].value

    if (ev.target && (ev.target as HTMLInputElement).files) {
      const files = (ev.target as HTMLInputElement).files
      if (files) {
        if (workspaceName == undefined || workspaceName == '' || workspaceName == null) {
          this.msgService.error({ summaryKey: 'IMAGE.UPLOAD_FAIL' })
        } else if (files[0].size > 110000) {
          this.msgService.error({ summaryKey: 'IMAGE.UPLOAD_FAIL' })
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
                  this.msgService.info({ summaryKey: 'IMAGE.UPLOAD_SUCCESS' })
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
                  this.msgService.info({ summaryKey: 'IMAGE.UPLOAD_SUCCESS' })
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

  public onGotoTheme(ev: MouseEvent, uri: string): void {
    ev.stopPropagation()
    const url = window.document.location.href + uri
    if (ev.ctrlKey) {
      window.open(url, '_blank')
    } else {
      window.document.location.href = url
    }
  }

  private getImageUrl(): string {
    let imgUrl = this.formGroup.controls['logoUrl'].value
    if (imgUrl == '' || imgUrl == null) {
      return this.imageApi.configuration.basePath + '/images/' + this.formGroup.controls['name'].value + '/logo'
    } else {
      return imgUrl
    }
  }

  public onInputChange(event: Event): void {
    this.fetchingLogoUrl = (event.target as HTMLInputElement).value
    if ((event.target as HTMLInputElement).value == undefined || (event.target as HTMLInputElement).value == '') {
      this.fetchingLogoUrl =
        this.imageApi.configuration.basePath + '/images/' + this.formGroup.controls['name'].value + '/logo'
    }
  }
}
