import { Component, Output, EventEmitter } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { /*  map, */ Observable, of } from 'rxjs'
import { SelectItem } from 'primeng/api/selectitem'
import { FileUpload } from 'primeng/fileupload'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'

import { LogoState } from 'src/app/workspace/workspace-create/logo-state'
// import { setFetchUrls , sortThemeByName } from '../../shared/utils'
import {
  /* ImageV1APIService, */
  WorkspaceAPIService /* , ThemesAPIService */,
  Workspace
} from '../../shared/generated'

@Component({
  selector: 'app-workspace-create',
  templateUrl: './workspace-create.component.html'
})
export class WorkspaceCreateComponent {
  @Output() toggleCreationDialogEvent = new EventEmitter()

  themes$: Observable<SelectItem<string>[]> = of([])
  public formGroup: FormGroup
  private workspace!: Workspace
  public hasPermission = false
  public selectedLogoFile: File | undefined
  public preview = false
  public previewSrc: string | undefined
  public minimumImageWidth = 150
  public minimumImageHeight = 150
  public LogoState = LogoState
  public logoState = LogoState.INITIAL
  public workspaceCreationValidationMsg = false
  public fetchingLogoUrl?: string
  public urlPattern = '/base-path-to-workspace'

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private user: UserService,
    private workspaceApi: WorkspaceAPIService,
    // private themeApi: ThemesAPIService,
    // private imageApi: ImageV1APIService,
    private message: PortalMessageService,
    private translate: TranslateService
  ) {
    this.hasPermission = this.user.hasPermission('WORKSPACE#EDIT_TENANT')

    this.formGroup = new FormGroup({
      name: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      // themeName: new FormControl(null, [Validators.required]),
      homePage: new FormControl(null, [Validators.maxLength(255)]),
      logoUrl: new FormControl('', [Validators.maxLength(255)]),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.pattern('^/.*')]),
      footerLabel: new FormControl(null, [Validators.maxLength(255)]),
      description: new FormControl(null, [Validators.maxLength(255)])
    })
    /* this.themes$ = this.themeApi
      .getThemes()
      .pipe(
        map((val) =>
          val.sort(sortThemeByName).map((theme) => ({ label: theme.name, value: theme.name || '', id: theme.id }))
        )
      ) */

    if (this.hasPermission) {
      this.formGroup.addControl('tenantId', new FormControl(null))
    }
  }

  closeDialog() {
    this.formGroup.reset()
    this.fetchingLogoUrl = undefined
    this.selectedLogoFile = undefined
    this.toggleCreationDialogEvent.emit()
  }

  savePortal() {
    this.createPortalDto()
    this.workspaceApi
      .createWorkspace({
        createWorkspaceRequest: { resource: this.workspace }
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

  private createPortalDto(): void {
    this.workspace = { ...this.formGroup.value }
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

  /* onFileUpload(ev: Event, fieldType: 'logo') {
    if (ev.target && (ev.target as HTMLInputElement).files) {
      const files = (ev.target as HTMLInputElement).files
      if (files) {
        Array.from(files).forEach((file) => {
          this.imageApi.uploadImage({ image: file }).subscribe((data) => {
            this.formGroup.controls[fieldType + 'Url'].setValue(data.imageUrl)
            this.fetchingLogoUrl = setFetchUrls(this.apiPrefix, this.formGroup.controls[fieldType + 'Url'].value)
            this.message.add({ severity: 'info', summary: 'File Uploaded', detail: fieldType + ' image' })
          })
        })
      }
    }
  } */
}
