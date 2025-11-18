import { Component, EventEmitter, Input, OnInit, OnChanges, Output, SimpleChanges } from '@angular/core'
import { Location } from '@angular/common'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { BehaviorSubject, map, Observable, of, ReplaySubject } from 'rxjs'

import { SlotService } from '@onecx/angular-remote-components'
import { PortalMessageService, WorkspaceService } from '@onecx/angular-integration-interface'
import { getLocation } from '@onecx/accelerator'

import {
  ImagesInternalAPIService,
  MimeType,
  RefType,
  UploadImageRequestParams,
  Workspace,
  WorkspaceProductAPIService
} from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'

export type Theme = {
  name: string
  displayName: string
  logoUrl?: string
}

@Component({
  selector: 'app-workspace-props',
  templateUrl: './workspace-props.component.html',
  styleUrls: ['./workspace-props.component.scss']
})
export class WorkspacePropsComponent implements OnInit, OnChanges {
  @Input() workspace: Workspace | undefined
  @Input() editMode = true
  @Input() isLoading = false
  @Output() headerImageUrl = new EventEmitter<string>() // send logo url to detail header

  // make it available in HTML
  public Utils = Utils
  public getLocation = getLocation

  // image
  public RefType = RefType
  public bffUrl: Partial<Record<RefType, string | undefined>> = {}
  public imageBasePath = this.imageApi.configuration.basePath
  public imageMaxSize = 1000000

  // data
  public formGroup: FormGroup
  public productPaths$: Observable<string[]> = of([]) // to fill drop down with product paths
  public deploymentPath: string | undefined = undefined
  public themeEndpointExist = false

  // slot configuration: get theme data
  public themeSlotName = 'onecx-theme-data'
  public isThemeComponentDefined$: Observable<boolean> // check if a component was assigned
  public themes$ = new BehaviorSubject<Theme[] | undefined>(undefined) // theme data
  public themesEmitter = new EventEmitter<Theme[]>()
  // slot configuration: get theme logo
  public themeLogoLoadingEmitter = new EventEmitter<boolean>()
  public themeLogoLoadingFailed$ = new BehaviorSubject<boolean | undefined>(undefined)
  public themeFormValues$ = new ReplaySubject<{ theme: string }>(1) // async storage of formgroup value to manage change detection

  constructor(
    private readonly slotService: SlotService,
    private readonly workspaceService: WorkspaceService,
    private readonly msgService: PortalMessageService,
    private readonly imageApi: ImagesInternalAPIService,
    private readonly wProductApi: WorkspaceProductAPIService
  ) {
    this.isThemeComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.themeSlotName)
    this.formGroup = new FormGroup({
      displayName: new FormControl<string | null>(null, [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]),
      theme: new FormControl(null),
      baseUrl: new FormControl<string | null>(null, [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern('^/.*')
      ]),
      homePage: new FormControl<string | null>(null, [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern('^/.*')
      ]),
      logoUrl: new FormControl<string | null>(null, [
        Validators.minLength(7),
        Validators.maxLength(255),
        Validators.pattern('^(http|https)://.{6,245}')
      ]),
      smallLogoUrl: new FormControl<string | null>(null, [
        Validators.minLength(7),
        Validators.maxLength(255),
        Validators.pattern('^(http|https)://.{6,245}')
      ]),
      rssFeedUrl: new FormControl<string | null>(null, [
        Validators.minLength(7),
        Validators.maxLength(255),
        Validators.pattern('^(http|https)://.{6,245}')
      ]),
      footerLabel: new FormControl<string | null>(null, [Validators.maxLength(255)]),
      description: new FormControl<string | null>(null, [Validators.maxLength(255)])
    })
    this.formGroup.valueChanges.subscribe(this.themeFormValues$)
  }

  public ngOnInit(): void {
    this.themesEmitter.subscribe(this.themes$)
    this.themeLogoLoadingEmitter.subscribe((data) => {
      this.themeLogoLoadingFailed$.next(data)
    })
  }

  public ngOnChanges(changes: SimpleChanges): void {
    this.formGroup.disable()

    if (this.workspace) {
      if (changes['workspace']) this.fillForm(this.workspace)
      if (this.editMode) this.formGroup.enable()
      // if a home page value exists then fill it into drop down list for displaying
      if (this.workspace.homePage) this.productPaths$ = of([this.workspace.homePage])
      // check detail endpoint exists
      this.themeEndpointExist = Utils.doesEndpointExist(
        this.workspaceService,
        'onecx-theme',
        'onecx-theme-ui',
        'theme-detail'
      )
    } else {
      this.formGroup.reset()
    }
  }

  private fillForm(workspace: Workspace): void {
    this.formGroup.patchValue(workspace)
    // initialize image variables: used URLs and if logo URLs exist
    this.setBffImageUrl(this.workspace, RefType.Logo)
    this.setBffImageUrl(this.workspace, RefType.LogoSmall)
  }

  /***************************************************************************
   * IMAGE => LOGO, LOGO SMALL, FAVICON => uploaded images and/or URL
   */

  // LOAD AND DISPLAYING
  // Image component informs about loading result for image
  public onImageLoadResult(loaded: any, refType: RefType, extUrl?: string): void {
    if (loaded && refType === RefType.Logo) {
      this.headerImageUrl.emit(!extUrl || extUrl === '' ? this.bffUrl[refType] : extUrl)
    }
    if (!loaded) {
      if (refType === RefType.Logo) this.headerImageUrl.emit(undefined)
      // if no ext. URL then bff URL was used => reset
      if (!(extUrl && extUrl !== '') && this.bffUrl[refType]) this.bffUrl[refType] = undefined
    }
  }

  // initially prepare image URL based on workspace
  public setBffImageUrl(theme: Theme | undefined, refType: RefType): void {
    if (!theme) return undefined
    this.bffUrl[refType] = Utils.bffImageUrl(this.imageBasePath, theme.name, refType)
  }

  // UPLOAD
  public onFileUpload(ev: Event, refType: RefType): void {
    if (ev.target) {
      const files = (ev.target as HTMLInputElement).files
      if (files?.length === 1) this.proccessFile(files[0], refType)
      else this.msgService.error({ summaryKey: 'IMAGE.CONSTRAINT.FAILED', detailKey: 'IMAGE.CONSTRAINT.FILE_MISSING' })
    }
  }
  private proccessFile(file: File, refType: RefType): void {
    const regex = /^.*.(jpg|jpeg|png|svg)$/
    if (file.size > this.imageMaxSize)
      this.msgService.error({ summaryKey: 'IMAGE.CONSTRAINT.FAILED', detailKey: 'IMAGE.CONSTRAINT.SIZE' })
    else if (!regex.exec(file.name))
      this.msgService.error({ summaryKey: 'IMAGE.CONSTRAINT.FAILED', detailKey: 'IMAGE.CONSTRAINT.FILE_TYPE' })
    else if (this.workspace) this.saveImage(this.workspace.name, file, refType) // store image
  }

  // SAVE image
  private saveImage(name: string, file: File, refType: RefType) {
    this.bffUrl[refType] = undefined // reset - important to trigger the change in UI (props)
    if (refType === RefType.Logo) this.headerImageUrl.emit(undefined) // trigger the change in UI (header)
    function mapMimeType(type: string): MimeType {
      switch (type) {
        case 'image/svg+xml':
          return MimeType.Svgxml
        case 'image/jpg':
          return MimeType.Jpg
        case 'image/jpeg':
          return MimeType.Jpeg
        case 'image/png':
          return MimeType.Png
        default:
          return MimeType.Png
      }
    }
    // prepare request
    const mType = mapMimeType(file.type)
    const data = mType === MimeType.Svgxml ? file : new Blob([file], { type: file.type })
    const requestParameter: UploadImageRequestParams = {
      refId: name,
      refType: refType,
      mimeType: mType,
      body: data
    }
    this.imageApi.uploadImage(requestParameter).subscribe({
      next: () => this.saveImageResponse(name, refType),
      error: (err) => this.saveImageResponse(name, refType, err)
    })
  }
  private saveImageResponse(name: string, refType: RefType, err?: any): void {
    if (err) {
      console.error('uploadImage', err)
      this.msgService.error({ summaryKey: 'IMAGE.UPLOAD.NOK' })
    } else {
      this.msgService.success({ summaryKey: 'IMAGE.UPLOAD.OK' })
      this.bffUrl[refType] = Utils.bffImageUrl(this.imageBasePath, name, refType)
      if (refType === RefType.Logo) this.headerImageUrl.emit(this.bffUrl[refType])
    }
  }

  // REMOVING
  public onRemoveImageUrl(refType: RefType) {
    if (refType === RefType.Logo && this.formGroup.get('logoUrl')?.value) {
      this.formGroup.get('logoUrl')?.setValue(null)
    }
    if (refType === RefType.LogoSmall && this.formGroup.get('smallLogoUrl')?.value) {
      this.formGroup.get('smallLogoUrl')?.setValue(null)
    }
    this.bffUrl[refType] = Utils.bffImageUrl(this.imageBasePath, this.workspace?.name, refType)
  }
  public onRemoveImage(refType: RefType) {
    if (this.workspace?.name && this.bffUrl[refType]) {
      // On VIEW mode: manage image is enabled
      this.imageApi.deleteImage({ refId: this.workspace?.name, refType: refType }).subscribe({
        next: () => {
          // reset - important to trigger the change in UI
          this.bffUrl[refType] = undefined
          if (refType === RefType.Logo) this.headerImageUrl.emit(undefined)
        },
        error: (err) => console.error('deleteImage', err)
      })
    }
  }

  /***************************************************************************
   * WORKSPACE
   */

  // called by workspace detail dialog: returns form values to workspace
  public onSave(): void {
    if (!this.workspace) return
    if (this.formGroup.valid) Object.assign(this.workspace, this.getWorkspaceChangesFromForm())
    else this.msgService.error({ summaryKey: 'VALIDATION.FORM_INVALID' })
  }

  //return the values that are different in form than in PortalDTO
  public getWorkspaceChangesFromForm(): any {
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

  /***************************************************************************
   * VARIOUS
   */

  public prepareProductUrl(val: string): string | undefined {
    if (this.workspace?.baseUrl) {
      return val ? Location.joinWithSlash(this.workspace.baseUrl, val) : undefined
    } else return undefined
  }

  public onOpenProductPaths(paths: string[]) {
    // if paths already filled then prevent doing twice
    if (paths.length > (this.workspace?.homePage ? 1 : 0)) return
    if (this.workspace) {
      this.productPaths$ = this.wProductApi.getProductsByWorkspaceId({ id: this.workspace.id! }).pipe(
        map((val: any[]) => {
          const paths: string[] = []
          if (val.length > 0) {
            for (const p of val) paths.push(p.baseUrl)
            paths.sort(Utils.sortByLocale)
          }
          return paths
        })
      )
    }
  }

  // sometimes the theme is unknown, then add to the list
  public checkAndExtendThemes(themes: Theme[]): Theme[] {
    // if not included (why ever) then add the used value to make it visible
    if (!themes.some((t) => t.name === this.workspace?.theme))
      themes.push({ name: this.workspace?.theme, displayName: this.workspace?.theme } as Theme)
    return themes
  }

  public getThemeImageUrl(themes: Theme[], themeName: string, refType: RefType): string | undefined {
    const theme = themes.find((t) => t.name === themeName)
    return theme?.logoUrl
  }

  public getThemeEndpointUrl$(name?: string): Observable<string | undefined> {
    if (this.themeEndpointExist && name)
      return this.workspaceService.getUrl('onecx-theme', 'onecx-theme-ui', 'theme-detail', { 'theme-name': name })
    return of(undefined)
  }
}
