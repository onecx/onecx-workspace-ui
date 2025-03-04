import { Component, EventEmitter, Input, OnInit, OnChanges, Output } from '@angular/core'
import { Location } from '@angular/common'
import { Router } from '@angular/router'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { map, Observable, of, Subject } from 'rxjs'

import { PortalMessageService, WorkspaceService } from '@onecx/angular-integration-interface'
import { getLocation } from '@onecx/accelerator'

import {
  ImagesInternalAPIService,
  RefType,
  Workspace,
  WorkspaceAPIService,
  WorkspaceProductAPIService
} from 'src/app/shared/generated'
import { bffImageUrl, copyToClipboard, goToEndpoint, sortByLocale } from 'src/app/shared/utils'

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
  public copyToClipboard = copyToClipboard
  // data
  private readonly destroy$ = new Subject()
  public formGroup: FormGroup
  public productPaths$: Observable<string[]> = of([])
  public themeProductRegistered$!: Observable<boolean>
  public themes$!: Observable<string[]>
  public deploymentPath: string | undefined = undefined
  public urlPattern = '/base-path-to-workspace'
  public externUrlPattern = 'http(s)://path-to-image'
  //Logo
  public minimumImageWidth = 150
  public minimumImageHeight = 150
  public fetchingLogoUrl: string | undefined = undefined
  public themeUrl: string | undefined = undefined

  constructor(
    private readonly router: Router,
    public workspaceService: WorkspaceService,
    private readonly msgService: PortalMessageService,
    private readonly imageApi: ImagesInternalAPIService,
    private readonly workspaceApi: WorkspaceAPIService,
    private readonly wProductApi: WorkspaceProductAPIService
  ) {
    this.themeProductRegistered$ = workspaceService.doesUrlExistFor('onecx-theme', 'onecx-theme-ui', 'theme-detail')

    this.formGroup = new FormGroup({
      displayName: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
      theme: new FormControl(null),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(1), Validators.pattern('^/.*')]),
      homePage: new FormControl(null),
      logoUrl: new FormControl('', [Validators.maxLength(255)]),
      rssFeedUrl: new FormControl(null, [Validators.maxLength(255)]),
      footerLabel: new FormControl(null, [Validators.maxLength(255)]),
      description: new FormControl(null, [Validators.maxLength(255)])
    })
  }

  public ngOnInit(): void {
    if (!this.isLoading) {
      this.loadThemes()
    }
  }

  public ngOnChanges(): void {
    if (this.workspace) {
      this.fillForm()
      if (this.editMode) this.formGroup.enable()
      else this.formGroup.disable()
      // if a home page value exists then fill it into drop down list for displaying
      if (this.workspace.homePage) this.productPaths$ = of([this.workspace.homePage])
    } else {
      this.formGroup.reset()
      this.formGroup.disable()
    }
  }

  public fillForm(): void {
    Object.keys(this.formGroup.controls).forEach((element) => {
      this.formGroup.controls[element].setValue((this.workspace as any)[element])
    })
    this.fetchingLogoUrl = this.getLogoUrl(this.workspace)
    this.currentLogoUrl.emit(this.fetchingLogoUrl)
  }

  // Image component informs about non existing stored Workspace logo
  public onImageLoadingError(error: any) {
    this.fetchingLogoUrl = error ? undefined : this.getLogoUrl(this.workspace)
    this.currentLogoUrl.emit(this.fetchingLogoUrl)
  }

  public onSave(): void {
    if (!this.workspace) return
    if (this.formGroup.valid) {
      Object.assign(this.workspace, this.getWorkspaceChangesFromForm())
    } else {
      this.msgService.error({ summaryKey: 'VALIDATION.FORM_INVALID' })
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

  public onRemoveLogo() {
    if (this.workspace?.name)
      this.imageApi.deleteImage({ refId: this.workspace?.name, refType: RefType.Logo }).subscribe({
        next: () => {
          this.fetchingLogoUrl = undefined // reset - important to trigger the change in UI
          this.currentLogoUrl.emit(this.fetchingLogoUrl)
        },
        error: (err) => {
          console.error('deleteImage', err)
        }
      })
  }

  public onFileUpload(ev: Event): void {
    if (ev.target && (ev.target as HTMLInputElement).files) {
      const files = (ev.target as HTMLInputElement).files
      if (files) {
        if (files[0].size > 100000) {
          this.msgService.error({ summaryKey: 'IMAGE.CONSTRAINT_FAILED', detailKey: 'IMAGE.CONSTRAINT_SIZE' })
        } else if (!/^.*.(jpg|jpeg|png)$/.exec(files[0].name)) {
          this.msgService.error({ summaryKey: 'IMAGE.CONSTRAINT_FAILED', detailKey: 'IMAGE.CONSTRAINT_FILE_TYPE' })
        } else if (this.workspace) {
          this.saveImage(this.workspace.name, files) // store image
        }
      }
    } else {
      this.msgService.error({ summaryKey: 'IMAGE.CONSTRAINT_FAILED', detailKey: 'IMAGE.CONSTRAINT_FILE_MISSING' })
    }
  }

  private saveImage(name: string, files: FileList) {
    const blob = new Blob([files[0]], { type: files[0].type })
    this.fetchingLogoUrl = undefined // reset - important to trigger the change in UI
    this.currentLogoUrl.emit(this.fetchingLogoUrl)
    const saveRequestParameter = {
      contentLength: files.length,
      refId: name,
      refType: RefType.Logo,
      body: blob
    }
    this.imageApi.uploadImage(saveRequestParameter).subscribe(() => {
      this.prepareImageResponse(name)
    })
  }
  private prepareImageResponse(name: string): void {
    this.fetchingLogoUrl = bffImageUrl(this.imageApi.configuration.basePath, name, RefType.Logo)
    this.currentLogoUrl.emit(this.fetchingLogoUrl)
    this.msgService.info({ summaryKey: 'IMAGE.UPLOAD_SUCCESS' })
    this.formGroup.controls['logoUrl'].setValue('')
  }

  public getLogoUrl(workspace: Workspace | undefined): string | undefined {
    if (!workspace) {
      return undefined
    }
    if (workspace.logoUrl && workspace.logoUrl != '') {
      return workspace.logoUrl
    }
    return bffImageUrl(this.imageApi.configuration.basePath, workspace.name, RefType.Logo)
  }

  // changes on external log URL field: user enters text (change) or paste something
  public onInputChange(event: Event): void {
    this.fetchingLogoUrl = (event.target as HTMLInputElement).value
    if (!this.fetchingLogoUrl || this.fetchingLogoUrl === '') {
      this.fetchingLogoUrl = bffImageUrl(this.imageApi.configuration.basePath, this.workspace?.name, RefType.Logo)
    }
    this.currentLogoUrl.emit(this.fetchingLogoUrl)
  }

  public prepareProductUrl(val: string): string | undefined {
    if (this.workspace?.baseUrl) {
      return val ? Location.joinWithSlash(this.workspace.baseUrl, val) : undefined
    } else return undefined
  }

  public onOpenProductPathes(paths: string[]) {
    // if paths already filled then prevent doing twice
    if (paths.length > (this.workspace?.homePage ? 1 : 0)) return
    if (this.workspace) {
      this.productPaths$ = this.wProductApi.getProductsByWorkspaceId({ id: this.workspace.id! }).pipe(
        map((val: any[]) => {
          const paths: string[] = []
          if (val.length > 0) {
            for (const p of val) paths.push(p.baseUrl)
            paths.sort(sortByLocale)
          }
          return paths
        })
      )
    }
  }

  private loadThemes(): void {
    this.themes$ = this.workspaceApi.getAllThemes().pipe(
      map((val: any[]) => {
        if (val.length === 0) {
          return [this.workspace?.theme]
        } else {
          val.sort(sortByLocale)
          // if not included (why ever) then add the used value to make it visible
          if (!val.includes(this.workspace?.theme)) val.push(this.workspace?.theme)
          return val
        }
      })
    )
  }

  public onGoToTheme(name?: string): void {
    goToEndpoint(this.workspaceService, this.msgService, this.router, 'onecx-theme', 'onecx-theme-ui', 'theme-detail', {
      'theme-name': name
    })
  }
}
