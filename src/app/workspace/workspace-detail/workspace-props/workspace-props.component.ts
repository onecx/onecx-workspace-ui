import { Component, EventEmitter, Input, OnInit, OnChanges, Output, SimpleChanges } from '@angular/core'
import { Location } from '@angular/common'
import { Router } from '@angular/router'
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
  faviconUrl?: string
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
  @Output() currentLogoUrl = new EventEmitter<string>() // send logo url to detail header

  // make it available in HTML
  public getLocation = getLocation
  public copyToClipboard = Utils.copyToClipboard

  // logo
  public RefType = RefType
  public imageUrl: Partial<Record<RefType, string | undefined>> = {}
  public imageMaxSize = 1000000
  public imageUrlExists: Partial<Record<RefType, boolean>> = {}

  // data
  public formGroup: FormGroup
  public productPaths$: Observable<string[]> = of([]) // to fill drop down with product paths
  public themeProductRegistered$!: Observable<boolean>
  public deploymentPath: string | undefined = undefined
  public urlPatternRelative = '/base-path-to-workspace'
  public urlPatternAbsolute = 'http(s)://path-to-image'

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
    private readonly router: Router,
    private readonly slotService: SlotService,
    private readonly workspaceService: WorkspaceService,
    private readonly msgService: PortalMessageService,
    private readonly imageApi: ImagesInternalAPIService,
    private readonly wProductApi: WorkspaceProductAPIService
  ) {
    this.themeProductRegistered$ = workspaceService.doesUrlExistFor('onecx-theme', 'onecx-theme-ui', 'theme-detail')
    this.isThemeComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.themeSlotName)

    this.formGroup = new FormGroup({
      displayName: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
      theme: new FormControl(null),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(1), Validators.pattern('^/.*')]),
      homePage: new FormControl(null),
      logoUrl: new FormControl(null, [
        Validators.minLength(7),
        Validators.maxLength(255),
        Validators.pattern('^(http|https)://.{6,245}')
      ]),
      smallLogoUrl: new FormControl(null, [
        Validators.minLength(7),
        Validators.maxLength(255),
        Validators.pattern('^(http|https)://.{6,245}')
      ]),
      rssFeedUrl: new FormControl(null, [
        Validators.minLength(7),
        Validators.maxLength(255),
        Validators.pattern('^(http|https)://.{6,245}')
      ]),
      footerLabel: new FormControl(null, [Validators.maxLength(255)]),
      description: new FormControl(null, [Validators.maxLength(255)])
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
      if (changes['workspace']) this.fillForm()
      if (this.editMode) this.formGroup.enable()
      // if a home page value exists then fill it into drop down list for displaying
      if (this.workspace.homePage) this.productPaths$ = of([this.workspace.homePage])
    } else {
      this.formGroup.reset()
    }
  }

  public fillForm(): void {
    Object.keys(this.formGroup.controls).forEach((element) => {
      this.formGroup.controls[element].setValue((this.workspace as any)[element])
    })
    // initialize image variables: used URLs and if logo URLs exist
    this.setImageUrl(this.workspace, RefType.Logo)
    this.setImageUrl(this.workspace, RefType.LogoSmall)
  }

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

  public onRemoveImageUrl(refType: RefType) {
    if (refType === RefType.Logo && this.formGroup.get('logoUrl')?.value) {
      this.formGroup.get('logoUrl')?.setValue(null)
    }
    if (refType === RefType.LogoSmall && this.formGroup.get('smallLogoUrl')?.value) {
      this.formGroup.get('smallLogoUrl')?.setValue(null)
    }
    this.imageUrlExists[refType] = false
    this.imageUrl[refType] = Utils.bffImageUrl(this.imageApi.configuration.basePath, this.workspace?.name, refType)
  }

  public onRemoveImage(refType: RefType) {
    if (this.workspace?.name && this.imageUrl[refType] && !this.imageUrlExists[refType])
      // On VIEW mode: manage image is enabled
      this.imageApi.deleteImage({ refId: this.workspace.name, refType: refType }).subscribe({
        next: () => {
          // reset - important to trigger the change in UI
          if (!this.imageUrlExists[refType]) this.imageUrl[refType] = undefined
          if (refType === RefType.Logo) this.currentLogoUrl.emit(this.imageUrl[refType])
        },
        error: (err) => console.error('deleteImage', err)
      })
  }

  public onFileUpload(ev: Event, refType: RefType): void {
    if (ev.target && (ev.target as HTMLInputElement).files) {
      const files = (ev.target as HTMLInputElement).files
      if (files) {
        if (files[0].size > this.imageMaxSize) {
          this.msgService.error({ summaryKey: 'IMAGE.CONSTRAINT.FAILED', detailKey: 'IMAGE.CONSTRAINT.SIZE' })
        } else if (!/^.*.(jpg|jpeg|png|svg)$/.exec(files[0].name)) {
          this.msgService.error({ summaryKey: 'IMAGE.CONSTRAINT.FAILED', detailKey: 'IMAGE.CONSTRAINT.FILE_TYPE' })
        } else if (this.workspace) {
          this.saveImage(this.workspace.name, files, refType) // store image
        }
      }
    } else {
      this.msgService.error({ summaryKey: 'IMAGE.CONSTRAINT.FAILED', detailKey: 'IMAGE.CONSTRAINT.FILE_MISSING' })
    }
  }

  private mapMimeType(type: string): MimeType {
    switch (type) {
      case 'image/x-icon':
        return MimeType.XIcon
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

  private saveImage(name: string, files: FileList, refType: RefType) {
    this.imageUrl[refType] = undefined // reset - important to trigger the change in UI
    // prepare request
    const mType = this.mapMimeType(files[0].type)
    const data = mType === MimeType.Svgxml ? files[0] : new Blob([files[0]], { type: files[0].type })
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
      this.imageUrl[refType] = Utils.bffImageUrl(this.imageApi.configuration.basePath, name, refType)
      // reset URL field
      if (refType === RefType.Logo) this.currentLogoUrl.emit(this.imageUrl[refType])
      if (refType === RefType.Logo) this.formGroup.controls['logoUrl'].setValue(null)
      if (refType === RefType.LogoSmall) this.formGroup.controls['smallLogoUrl'].setValue(null)
    }
  }

  // Image component informs about loading result for image
  public onImageLoadResult(loaded: any, refType: RefType) {
    const uploadUrl = Utils.bffImageUrl(this.imageApi.configuration.basePath, this.workspace?.name, refType)
    // if not loaded and external URL was used then try the uploaded image
    if (!loaded)
      if (this.imageUrl[refType] !== uploadUrl) this.imageUrl[refType] = uploadUrl
      else this.imageUrl[refType] = undefined
    if (refType === RefType.Logo) this.currentLogoUrl.emit(this.imageUrl[refType])
  }

  // initially prepare image URL based on workspace
  public setImageUrl(workspace: Workspace | undefined, refType: RefType): void {
    if (!workspace) return undefined

    this.imageUrlExists[refType] = false
    if (refType === RefType.Logo && workspace.logoUrl && workspace.logoUrl !== '') {
      this.imageUrl[refType] = workspace.logoUrl
      this.imageUrlExists[refType] = true
    } else if (refType === RefType.LogoSmall && workspace.smallLogoUrl && workspace.smallLogoUrl !== '') {
      this.imageUrl[refType] = workspace.smallLogoUrl
      this.imageUrlExists[refType] = true
    } else this.imageUrl[refType] = Utils.bffImageUrl(this.imageApi.configuration.basePath, workspace.name, refType)
  }

  // changes on external image URL field: user enters text (change) or paste/removed something
  public onInputChange(event: Event, refType: RefType): void {
    const val = (event.target as HTMLInputElement).value
    if (val && val !== '') {
      this.imageUrl[refType] = val
      this.imageUrlExists[refType] = true
    } else {
      this.imageUrlExists[refType] = false
    }
  }

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
    if (!themes.find((t) => t.name === this.workspace?.theme)) {
      themes.push({ name: this.workspace?.theme, displayName: this.workspace?.theme } as Theme)
    }
    return themes
  }

  public getThemeImageUrl(themes: Theme[], themeName: string, refType: RefType): string | undefined {
    const theme = themes.find((t) => t.name === themeName)
    return refType === RefType.Logo ? theme?.logoUrl : theme?.faviconUrl
  }

  public onGoToTheme(name?: string): void {
    Utils.goToEndpoint(
      this.workspaceService,
      this.msgService,
      this.router,
      'onecx-theme',
      'onecx-theme-ui',
      'theme-detail',
      {
        'theme-name': name
      }
    )
  }
}
