import { Component, EventEmitter, Input, OnInit, OnChanges, Output } from '@angular/core'
import { Location } from '@angular/common'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { catchError, map, Observable, of, Subject, takeUntil } from 'rxjs'

import { PortalMessageService, WorkspaceService } from '@onecx/angular-integration-interface'

import {
  ImagesInternalAPIService,
  RefType,
  Workspace,
  WorkspaceAPIService,
  WorkspaceProductAPIService
} from 'src/app/shared/generated'
import { copyToClipboard, bffImageUrl, sortByLocale } from 'src/app/shared/utils'
import { getLocation } from '@onecx/accelerator'

@Component({
  selector: 'app-workspace-props',
  templateUrl: './workspace-props.component.html',
  styleUrls: ['./workspace-props.component.scss']
})
export class WorkspacePropsComponent implements OnInit, OnChanges {
  @Input() workspace: Workspace | undefined
  @Input() editMode = false
  @Output() currentLogoUrl = new EventEmitter<string>()

  private readonly destroy$ = new Subject()
  public formGroup: FormGroup
  public productPathList: string[] = []
  public themes$!: Observable<string[]>
  public urlPattern = '/base-path-to-workspace'
  public externUrlPattern = 'http(s)://path-to-image'
  public copyToClipboard = copyToClipboard
  public sortByLocale = sortByLocale
  public deploymentPath: string = ''

  //Logo
  public preview = false
  public previewSrc: string | undefined
  public selectedFile: File | undefined
  public minimumImageWidth = 150
  public minimumImageHeight = 150
  public fetchingLogoUrl: string | undefined = undefined
  RefType = RefType

  constructor(
    private location: Location,
    public workspaceService: WorkspaceService,
    private msgService: PortalMessageService,
    private imageApi: ImagesInternalAPIService,
    private workspaceApi: WorkspaceAPIService,
    private wProductApi: WorkspaceProductAPIService
  ) {
    this.deploymentPath = getLocation().deploymentPath === '/' ? '' : getLocation().deploymentPath.slice(0, -1)

    this.formGroup = new FormGroup({
      disabled: new FormControl(null),
      displayName: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      theme: new FormControl(null),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(1), Validators.pattern('^/.*')]),
      homePage: new FormControl(null, [Validators.maxLength(255)]),
      logoUrl: new FormControl('', [Validators.maxLength(255)]),
      rssFeedUrl: new FormControl(null, [Validators.maxLength(255)]),
      footerLabel: new FormControl(null, [Validators.maxLength(255)]),
      description: new FormControl(null, [Validators.maxLength(255)])
    })
  }

  public ngOnInit(): void {
    this.themes$ = this.workspaceApi.getAllThemes().pipe(
      map((val: any[]) => {
        if (val.length === 0) {
          return [this.workspace?.theme]
        } else {
          val.sort(sortByLocale)
          if (!val.includes(this.workspace?.theme)) val.push(this.workspace?.theme)
          return val
        }
      })
    )
  }

  public ngOnChanges(): void {
    if (this.workspace) {
      this.setFormData()
      if (this.editMode) {
        this.formGroup.enable()
        this.loadProductPaths()
      } else this.formGroup.disable()
    } else {
      this.formGroup.reset()
      this.formGroup.disable()
    }
  }

  public setFormData(): void {
    Object.keys(this.formGroup.controls).forEach((element) => {
      this.formGroup.controls[element].setValue((this.workspace as any)[element])
    })
    this.fetchingLogoUrl = this.getLogoUrl(this.workspace)
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

  public onPrepareProductLink(productName: string, appId: string, endpoint?: string, param?: string) {
    console.log(
      'onPrepareProductLink: ' + productName + '  appId: ' + appId + '  endpoint: ' + endpoint + '  param: ' + param
    )
    this.workspaceService.getUrl(appId, productName, endpoint ?? '').subscribe((path) => {
      console.log('onPrepareProductLink: ' + path)
    })
  }

  public onFileUpload(ev: Event): void {
    if (ev.target && (ev.target as HTMLInputElement).files) {
      const files = (ev.target as HTMLInputElement).files
      if (files) {
        if (files[0].size > 100000) {
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
          this.saveImage(this.workspace?.name!, files) // store image
        }
      }
    } else {
      this.msgService.error({
        summaryKey: 'IMAGE.CONSTRAINT_FAILED',
        detailKey: 'IMAGE.CONSTRAINT_FILE_MISSING'
      })
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
    return val ? Location.joinWithSlash(this.workspace?.baseUrl!, val) : undefined
  }
  private loadProductPaths(): void {
    this.wProductApi
      .getProductsByWorkspaceId({ id: this.workspace?.id! })
      .pipe(
        map((products) => {
          this.productPathList.push('')
          for (let p of products) this.productPathList.push(p.baseUrl ?? '')
          this.productPathList.sort(sortByLocale)
        }),
        catchError((err) => {
          console.error('getProductsByWorkspaceId():', err)
          return of([] as string[])
        })
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }
}
