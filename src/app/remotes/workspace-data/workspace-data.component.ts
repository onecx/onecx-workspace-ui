import { Component, EventEmitter, Inject, Input, OnChanges } from '@angular/core'
import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { UntilDestroy } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { BehaviorSubject, catchError, map, Observable, of, ReplaySubject } from 'rxjs'

import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { PortalCoreModule, createRemoteComponentTranslateLoader } from '@onecx/portal-integration-angular'

import {
  Configuration,
  RefType,
  Workspace,
  WorkspaceAPIService,
  SearchWorkspacesRequest
} from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'
import { bffImageUrl, prepareUrlPath, sortByDisplayName } from 'src/app/shared/utils'
import { environment } from 'src/environments/environment'

type DataType = 'logo' | 'workspaces' | 'workspace'

@Component({
  selector: 'app-workspace-data',
  templateUrl: './workspace-data.component.html',
  standalone: true,
  imports: [AngularRemoteComponentsModule, CommonModule, PortalCoreModule, TranslateModule, SharedModule],
  providers: [
    {
      provide: BASE_URL,
      useValue: new ReplaySubject<string>(1)
    },
    provideTranslateServiceForRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: createRemoteComponentTranslateLoader,
        deps: [HttpClient, BASE_URL]
      }
    })
  ]
})
@UntilDestroy()
export class OneCXWorkspaceDataComponent implements ocxRemoteComponent, ocxRemoteWebcomponent, OnChanges {
  // input
  @Input() refresh: boolean | undefined = false // on any change here a reload is triggered
  @Input() dataType: DataType | undefined = undefined // which response data is expected
  // search parameter
  @Input() workspaceName: string | undefined = undefined // search parameter
  @Input() productName: string | undefined = undefined // search parameter
  @Input() themeName: string | undefined = undefined // search parameter
  // logo
  @Input() imageId: string | undefined = undefined
  @Input() imageUrl: string | undefined = undefined
  @Input() imageStyleClass: string | undefined = undefined
  @Input() useDefaultLogo = false // used if logo loading failed
  // log
  @Input() logPrefix: string | undefined = undefined
  @Input() logEnabled = false
  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }
  // output
  @Input() workspaces = new EventEmitter<Workspace[]>()
  @Input() workspace = new EventEmitter<Workspace>()
  @Input() imageLoadingFailed = new EventEmitter<boolean>()

  public workspaces$: Observable<Workspace[]> | undefined
  public workspace$: Observable<Workspace> | undefined
  public imageUrl$ = new BehaviorSubject<string | undefined>(undefined)
  public defaultImageUrl: string | undefined = undefined

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    private readonly workspaceApi: WorkspaceAPIService
  ) {}

  ocxInitRemoteComponent(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
    this.workspaceApi.configuration = new Configuration({
      basePath: Location.joinWithSlash(remoteComponentConfig.baseUrl, environment.apiPrefix)
    })
    if (environment.DEFAULT_LOGO_PATH)
      this.defaultImageUrl = prepareUrlPath(remoteComponentConfig.baseUrl, environment.DEFAULT_LOGO_PATH)
  }

  /**
   * Prepare searches on each change
   */
  public ngOnChanges(): void {
    this.log('ngOnChanges')
    if (this.dataType === 'workspaces') this.getWorkspaces()
    if (this.dataType === 'workspace') this.getWorkspace()
    if (this.dataType === 'logo') {
      // start image existence life cycle here: url => image => default (opt)
      this.imageUrl$.next(this.getImageUrl(this.workspaceName, 'url'))
    }
  }

  /**
   * WORKSPACES
   */
  private getWorkspaces(): void {
    const criteria: SearchWorkspacesRequest = {
      name: this.workspaceName,
      themeName: this.themeName,
      productName: this.productName,
      pageSize: 1000
    }
    this.log(criteria)
    this.workspaces$ = this.workspaceApi.searchWorkspaces({ searchWorkspacesRequest: criteria }).pipe(
      map((response) => {
        return response.stream?.sort(sortByDisplayName) ?? []
      }),
      catchError((err) => {
        console.error('onecx-workspace-data.searchWorkspaces', err)
        return of([])
      })
    )
    this.workspaces$.subscribe(this.workspaces)
  }

  /**
   * WORKSPACE
   */
  private getWorkspace() {
    if (!this.workspaceName) return

    this.workspace$ = this.workspaceApi.getWorkspaceByName({ workspaceName: this.workspaceName }).pipe(
      map((data) => data.resource),
      catchError((err) => {
        console.error('onecx-workspace-data.getWorkspaceByName', err)
        return of({} as Workspace)
      })
    )
    this.workspace$.subscribe(this.workspace)
  }

  /**
   * Image
   */
  public onImageLoad() {
    this.log('onImageLoad => ok')
    this.imageLoadingFailed.emit(false)
  }

  // try next prio level depending on previous used URL
  public onImageLoadError(usedUrl: string): void {
    this.log('onImageLoadError using => ' + usedUrl)
    if (usedUrl === this.imageUrl) {
      this.imageUrl$.next(this.getImageUrl(this.workspaceName, 'image'))
    } else if (usedUrl === this.getImageUrl(this.workspaceName, 'image')) {
      this.imageUrl$.next(this.getImageUrl(this.workspaceName, 'default'))
    }
  }

  public getImageUrl(workspaceName: string | undefined, prioType: string): string | undefined {
    if (!prioType || !['logo', 'favicon'].includes(this.dataType ?? 'unknown')) return undefined
    this.log('getImageUrl on prioType => ' + prioType)

    // if URL exist
    if (['url'].includes(prioType) && this.imageUrl && this.imageUrl !== '') {
      this.log('getImageUrl => ' + this.imageUrl)
      return this.imageUrl
    } else if (['url', 'image'].includes(prioType)) {
      this.log('getImageUrl => ' + bffImageUrl(this.workspaceApi.configuration.basePath, workspaceName, RefType.Logo))
      return bffImageUrl(this.workspaceApi.configuration.basePath, workspaceName, RefType.Logo)
    } else if (['url', 'image', 'default'].includes(prioType) && this.useDefaultLogo && this.defaultImageUrl !== '') {
      // if user wants to have the default (as asset)
      return this.defaultImageUrl
    }
    this.log('getImageUrl => stop')
    this.imageLoadingFailed.emit(true) // finally inform caller about impossibility
    return undefined
  }

  private log(info: any) {
    if (this.logEnabled === true) console.info('onecx-workspace-data: ' + (this.logPrefix ?? '') + ' => ', info)
  }
}
