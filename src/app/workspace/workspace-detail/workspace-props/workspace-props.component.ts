import { Component, Input, OnChanges } from '@angular/core'
import { Location } from '@angular/common'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { map, Observable } from 'rxjs'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { ImagesInternalAPIService, RefType, WorkspaceAPIService, Workspace } from 'src/app/shared/generated'
import { copyToClipboard, sortByLocale } from 'src/app/shared/utils'

@Component({
  selector: 'app-workspace-props',
  templateUrl: './workspace-props.component.html',
  styleUrls: ['./workspace-props.component.scss']
})
export class WorkspacePropsComponent implements OnChanges {
  @Input() workspace!: Workspace
  @Input() editMode = false

  public formGroup: FormGroup

  public mfeRList: { label: string | undefined; value: string }[] = []
  public themes$: Observable<string[]>
  public urlPattern = '/base-path-to-workspace'
  public copyToClipboard = copyToClipboard
  public sortByLocale = sortByLocale

  //Logo
  public preview = false
  public previewSrc: string | undefined
  public selectedFile: File | undefined
  public minimumImageWidth = 150
  public minimumImageHeight = 150
  public fetchingLogoUrl?: string
  private oldWorkspaceName: string = ''
  RefType = RefType

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
    this.themes$ = this.workspaceApi.getAllThemes().pipe(
      map((val: any[]) => {
        if (val.length === 0) {
          return [this.workspace.theme]
        } else if (!val.includes(this.workspace.theme)) {
          val.sort(sortByLocale)
          return val.concat(this.workspace.theme)
        } else {
          val.sort(sortByLocale)
          return val
        }
      })
    )
  }

  public ngOnChanges(): void {
    this.setFormData()
    this.editMode ? this.formGroup.enable() : this.formGroup.disable()
    this.oldWorkspaceName = this.workspace.name
    if (this.workspace.name === 'ADMIN') this.formGroup.controls['name'].disable()
  }

  public setFormData(): void {
    Object.keys(this.formGroup.controls).forEach((element) => {
      this.formGroup.controls[element].setValue((this.workspace as any)[element])
    })
    if (this.workspace.logoUrl && this.workspace.logoUrl !== '') this.fetchingLogoUrl = this.workspace.logoUrl
    else if (this.workspace.name && this.workspace.name !== '')
      this.fetchingLogoUrl = this.bffImageUrl(this.workspace.name, RefType.Logo)
  }

  public onSubmit(): void {
    if (this.formGroup.valid) {
      Object.assign(this.workspace, this.getWorkspaceChangesFromForm())
      //this.editMode = false
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

  public onFileUpload(ev: Event): void {
    ev.stopPropagation
    const workspaceName = this.formGroup.controls['name'].value
    if (!workspaceName || workspaceName === '') {
      this.msgService.error({
        summaryKey: 'IMAGE.CONSTRAINT_FAILED',
        detailKey: 'IMAGE.CONSTRAINT_NAME'
      })
      return
    }
    if (ev.target && (ev.target as HTMLInputElement).files) {
      const files = (ev.target as HTMLInputElement).files
      if (files) {
        if (files[0].size > 30000) {
          this.msgService.error({
            summaryKey: 'IMAGE.CONSTRAINT_FAILED',
            detailKey: 'IMAGE.CONSTRAINT_SIZE'
          })
        } else if (!/^.*.(jpg|jpeg|png)$/.exec(files[0].name)) {
          this.msgService.error({
            summaryKey: 'IMAGE.CONSTRAINT_FAILED',
            detailKey: 'IMAGE.CONSTRAINT_FILE_TYPE'
          })
        } else {
          this.saveImage(workspaceName, files) // store image
        }
      } else {
        this.msgService.error({
          summaryKey: 'IMAGE.CONSTRAINT_FAILED',
          detailKey: 'IMAGE.CONSTRAINT_FILE_MISSING'
        })
      }
    }
  }

  private saveImage(name: string, files: FileList) {
    const blob = new Blob([files[0]], { type: files[0].type })
    this.fetchingLogoUrl = undefined
    const saveRequestParameter = {
      contentLength: files.length,
      refId: name,
      refType: RefType.Logo,
      body: blob
    }
    this.imageApi.getImage({ refId: name, refType: RefType.Logo }).subscribe(
      () => {
        this.imageApi.updateImage(saveRequestParameter).subscribe(() => {
          this.prepareImageResponse(name)
        })
      },
      (err) => {
        this.imageApi.uploadImage(saveRequestParameter).subscribe(() => {
          this.prepareImageResponse(name)
        })
      }
    )
  }
  private prepareImageResponse(name: string): void {
    console.info('image uploaded')
    this.fetchingLogoUrl = this.bffImageUrl(name, RefType.Logo)
    this.msgService.info({ summaryKey: 'IMAGE.UPLOAD_SUCCESS' })
    this.formGroup.controls['logoUrl'].setValue('')
  }

  public bffImageUrl(themeName: string | undefined, refType: RefType): string {
    return !themeName ? '' : this.imageApi.configuration.basePath + '/images/' + themeName + '/' + refType
  }

  public onInputChange(event: Event): void {
    this.fetchingLogoUrl = (event.target as HTMLInputElement).value
    if ((event.target as HTMLInputElement).value == undefined || (event.target as HTMLInputElement).value == '') {
      this.fetchingLogoUrl = this.bffImageUrl(this.workspace.name, RefType.Logo)
    }
  }
}
