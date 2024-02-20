import { Component, Input, OnChanges } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { Location } from '@angular/common'
import { Observable, of } from 'rxjs'
import { ActivatedRoute, Router } from '@angular/router'

import {
  ConfigurationService,
  // Theme,
  ThemeService,
  PortalMessageService,
  UserService
} from '@onecx/portal-integration-angular'

import {
  // ImageV1APIService,
  WorkspaceAPIService /* , ThemeDTO, ThemesAPIService */
} from '../../../shared/generated'
import { Workspace } from '../../../shared/generated'
import { environment } from '../../../../environments/environment'
import { LogoState } from '../../workspace-create/logo-state'
import {
  setFetchUrls,
  copyToClipboard
  // sortThemeByName
} from '../../../shared/utils'

@Component({
  selector: 'app-workspace-props',
  templateUrl: './workspace-props.component.html',
  styleUrls: ['./workspace-props.component.scss']
})
export class WorkspacePropsComponent implements OnChanges {
  @Input() workspaceDetail!: Workspace
  @Input() editMode = false

  public formGroup: FormGroup

  public mfeRList: { label: string | undefined; value: string }[] = []
  public themes$: Observable<string[]> = of([])
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
  private oldWorkspaceName: string = ''

  constructor(
    private user: UserService,
    private workspaceApi: WorkspaceAPIService,
    // private themeApi: ThemesAPIService,
    // private imageApi: ImageV1APIService,
    private themeService: ThemeService,
    private config: ConfigurationService,
    private msgService: PortalMessageService,
    public route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {
    this.hasTenantViewPermission = this.user.hasPermission('WORKSPACE_TENANT#VIEW')
    this.hasTenantEditPermission = this.user.hasPermission('WORKSPACE_TENANT#EDIT')

    this.formGroup = new FormGroup({
      name: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      themeName: new FormControl(null /* [Validators.required] */),
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

    this.themes$ = this.workspaceApi.getAllThemes()
  }

  public ngOnChanges(): void {
    this.setFormData()
    this.editMode ? this.formGroup.enable() : this.formGroup.disable()
    this.oldWorkspaceName = this.workspaceDetail.name
  }

  public setFormData(): void {
    // prepare list of registered MFEs to be used as homepage dropdown
    // this.mfeRList = Array.from(this.workspaceDetail.microfrontendRegistrations ?? []).map((mfe: any) => ({
    //   label: mfe.baseUrl,
    //   value: mfe.baseUrl || ''
    // }))
    // fill form
    Object.keys(this.formGroup.controls).forEach((element) => {
      this.formGroup.controls[element].setValue((this.workspaceDetail as any)[element])
      this.formGroup.controls['themeName'].setValue(this.workspaceDetail.theme)
    })
    this.fetchingLogoUrl = setFetchUrls(this.apiPrefix, this.formGroup.value.logoUrl)
  }

  public onSubmit() {
    if (this.formGroup.valid) {
      Object.assign(this.workspaceDetail, this.getWorkspaceChangesFromForm())
      this.editMode = false
      if (this.oldWorkspaceName !== this.workspaceDetail.name) {
        this.location.back()
      }
    } else {
      this.msgService.error({ summaryKey: 'GENERAL.FORM_VALIDATION' })
    }
  }

  //return the values that are different in form than in PortalDTO
  private getWorkspaceChangesFromForm(): any {
    if (this.formGroup.value['tenantId'] !== undefined && this.formGroup.value['tenantId'] === '') {
      this.formGroup.controls['tenantId'].setValue(null)
    }
    const changes: any = {}
    Object.keys(this.formGroup.controls).forEach((key) => {
      if (this.formGroup.value[key] !== undefined) {
        if (this.formGroup.value[key] !== (this.workspaceDetail as any)[key]) {
          changes[key] = this.formGroup.value[key]
        }
      }
    })
    return changes
  }

  // onFileUpload(ev: Event, fieldType: 'logo') {
  //   if (ev.target && (ev.target as HTMLInputElement).files) {
  //     const files = (ev.target as HTMLInputElement).files
  //     if (files) {
  //       Array.from(files).forEach((file) => {
  //         this.imageApi.uploadImage({ image: file }).subscribe((data) => {
  //           this.formGroup.controls[fieldType + 'Url'].setValue(data.imageUrl)
  //           this.fetchingLogoUrl = setFetchUrls(this.apiPrefix, this.formGroup.controls[fieldType + 'Url'].value)
  //           this.msgService.info({ summaryKey: 'IMAGE.UPLOADED', detailKey: 'IMAGE.LOGO' })
  //         })
  //       })
  //     }
  //   }
  // }

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
