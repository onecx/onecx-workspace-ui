import { Component, Input, Inject, OnChanges, Output, EventEmitter } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { SelectItem } from 'primeng/api'
import { map, Observable, of } from 'rxjs'

import {
  AUTH_SERVICE,
  ConfigurationService,
  IAuthService,
  Theme,
  ThemeService,
  PortalMessageService
} from '@onecx/portal-integration-angular'

import { ImageV1APIService, PortalInternalAPIService, ThemeDTO, ThemesAPIService } from '../../../shared/generated'
import { PortalDTO } from '../../../shared/generated/model/portalDTO'
import { environment } from '../../../../environments/environment'
import { LogoState } from '../../workspace-create/logo-state'
import {
  clonePortalWithMicrofrontendsArray,
  setFetchUrls,
  copyToClipboard,
  sortThemeByName
} from '../../../shared/utils'

@Component({
  selector: 'wm-workspace-props',
  templateUrl: './workspace-props.component.html',
  styleUrls: ['./workspace-props.component.scss']
})
export class WorkspacePropsComponent implements OnChanges {
  @Input() portalDetail!: PortalDTO
  @Input() editMode = false
  @Output() portalUpdated = new EventEmitter<PortalDTO>()

  public formGroup: FormGroup

  public mfeRList: { label: string | undefined; value: string }[] = []
  public themes$: Observable<SelectItem<string>[]> = of([])
  public hasTenantViewPermission = false
  public hasTenantEditPermission = false
  public urlPattern = '/base-path-to-portal'
  public copyToClipboard = copyToClipboard // make available from utils

  //Logo
  public preview = false
  public previewSrc: string | undefined
  public selectedFile: File | undefined
  public minimumImageWidth = 150
  public minimumImageHeight = 150
  public LogoState = LogoState
  public logoState = LogoState.INITIAL
  public fetchingLogoUrl?: string
  private apiPrefix = environment.apiPrefix

  constructor(
    private portalApi: PortalInternalAPIService,
    private themeApi: ThemesAPIService,
    private imageApi: ImageV1APIService,
    private themeService: ThemeService,
    private config: ConfigurationService,
    private msgService: PortalMessageService,
    @Inject(AUTH_SERVICE) readonly auth: IAuthService
  ) {
    this.hasTenantViewPermission = this.auth.hasPermission('WORKSPACE_TENANT#VIEW')
    this.hasTenantEditPermission = this.auth.hasPermission('WORKSPACE_TENANT#EDIT')

    this.formGroup = new FormGroup({
      portalName: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      themeName: new FormControl(null, [Validators.required]),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(1), Validators.pattern('^/.*')]),
      homePage: new FormControl(null, [Validators.maxLength(255)]),
      logoUrl: new FormControl('', [Validators.maxLength(255)]),
      rssFeedUrl: new FormControl(null, [Validators.maxLength(255)]),
      footerLabel: new FormControl(null, [Validators.maxLength(255)]),
      description: new FormControl(null, [Validators.maxLength(255)])
    })
    if (this.hasTenantViewPermission) {
      this.formGroup.addControl('tenantId', new FormControl(null))
    }

    this.themes$ = this.themeApi
      .getThemes()
      .pipe(
        map((val) =>
          val.sort(sortThemeByName).map((theme) => ({ label: theme.name, value: theme.name || '', id: theme.id }))
        )
      )
  }

  public ngOnChanges(): void {
    this.setFormData()
    this.editMode ? this.formGroup.enable() : this.formGroup.disable()
  }

  public setFormData(): void {
    // prepare list of registered MFEs to be used as homepage dropdown
    this.mfeRList = Array.from(this.portalDetail.microfrontendRegistrations ?? []).map((mfe) => ({
      label: mfe.baseUrl,
      value: mfe.baseUrl || ''
    }))
    // fill form
    Object.keys(this.formGroup.controls).forEach((element) => {
      this.formGroup.controls[element].setValue((this.portalDetail as any)[element])
      this.formGroup.controls['themeName'].setValue(this.portalDetail.themeName)
    })
    this.fetchingLogoUrl = setFetchUrls(this.apiPrefix, this.formGroup.value.logoUrl)
  }

  public onSubmit() {
    if (this.formGroup.valid) {
      Object.assign(this.portalDetail, this.getPortalChangesFromForm())
      this.portalApi
        .updatePortal({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          portalId: this.portalDetail.id!,
          updatePortalDTO: clonePortalWithMicrofrontendsArray(this.portalDetail)
        })
        .subscribe({
          next: (data) => {
            this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_OK' })
            //If the Portal we update, is the current-global-portal, then we also update the global theme.
            if (this.portalDetail.id === this.config.getPortal().id && this.portalDetail.themeId) {
              // get theme and apply the variables in current portal
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              this.themeApi.getThemeById({ id: this.portalDetail.themeId! }).subscribe({
                next: (theme: ThemeDTO) => {
                  this.themeService.apply(theme as Theme)
                }
              })
            }
            this.portalUpdated.emit(data)
          },
          error: (err) => {
            this.msgService.error({
              summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_NOK' /* , detailKey: err.error.message */
            })
          }
        })
      this.editMode = false
    } else {
      this.msgService.error({ summaryKey: 'GENERAL.FORM_VALIDATION' })
    }
  }

  //return the values that are different in form than in PortalDTO
  private getPortalChangesFromForm(): any {
    if (this.formGroup.value['tenantId'] !== undefined && this.formGroup.value['tenantId'] === '') {
      this.formGroup.controls['tenantId'].setValue(null)
    }
    const changes: any = {}
    Object.keys(this.formGroup.controls).forEach((key) => {
      if (this.formGroup.value[key] !== undefined) {
        if (this.formGroup.value[key] !== (this.portalDetail as any)[key]) {
          changes[key] = this.formGroup.value[key]
        }
      }
    })
    return changes
  }

  onFileUpload(ev: Event, fieldType: 'logo') {
    if (ev.target && (ev.target as HTMLInputElement).files) {
      const files = (ev.target as HTMLInputElement).files
      if (files) {
        Array.from(files).forEach((file) => {
          this.imageApi.uploadImage({ image: file }).subscribe((data) => {
            this.formGroup.controls[fieldType + 'Url'].setValue(data.imageUrl)
            this.fetchingLogoUrl = setFetchUrls(this.apiPrefix, this.formGroup.controls[fieldType + 'Url'].value)
            this.msgService.info({ summaryKey: 'IMAGE.UPLOADED', detailKey: 'IMAGE.LOGO' })
          })
        })
      }
    }
  }
  public onGotoTheme(ev: MouseEvent, uri: string) {
    ev.stopPropagation()
    const url = window.document.location.href + uri
    if (ev.ctrlKey) {
      window.open(url, '_blank')
    } else {
      window.document.location.href = url
    }
  }
}
