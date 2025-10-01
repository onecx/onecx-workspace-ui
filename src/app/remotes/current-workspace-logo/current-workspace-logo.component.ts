import { Component, EventEmitter, inject, Inject, Input, NO_ERRORS_SCHEMA } from '@angular/core'
import { CommonModule, Location } from '@angular/common'
import { UntilDestroy } from '@ngneat/until-destroy'
import { BehaviorSubject, ReplaySubject } from 'rxjs'

import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
  ocxRemoteWebcomponent
} from '@onecx/angular-remote-components'
import { AppStateService } from '@onecx/angular-integration-interface'
import { PortalCoreModule } from '@onecx/portal-integration-angular'

import { Configuration, RefType, WorkspaceAPIService } from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'
import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-current-workspace-logo',
  templateUrl: './current-workspace-logo.component.html',
  standalone: true,
  imports: [AngularRemoteComponentsModule, CommonModule, PortalCoreModule],
  providers: [
    {
      provide: BASE_URL,
      useValue: new ReplaySubject<string>(1)
    }
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
@UntilDestroy()
export class OneCXCurrentWorkspaceLogoComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  // input
  @Input() imageId: string | undefined = undefined
  @Input() imageUrl: string | undefined = undefined
  @Input() imageStyleClass: string | undefined = undefined
  @Input() imageType: RefType = RefType.Logo
  @Input() useDefaultLogo = false // used if logo loading failed
  @Input() logPrefix: string | undefined = undefined
  @Input() logEnabled = false
  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }
  // output
  @Input() imageLoadingFailed = new EventEmitter<boolean>()

  private readonly appState = inject(AppStateService)

  public workspaceName: string | undefined
  public imageUrl$ = new BehaviorSubject<string | undefined>(undefined)
  public defaultImageUrl: string | undefined = undefined
  public logoUrl: Partial<Record<RefType, string | undefined>> = {}

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    private readonly workspaceApi: WorkspaceAPIService
  ) {
    this.appState.currentWorkspace$.asObservable().subscribe((workspace) => {
      this.workspaceName = workspace?.workspaceName
      this.logoUrl[RefType.Logo] = workspace.logoUrl
      this.logoUrl[RefType.LogoSmall] = workspace.logoSmallImageUrl
      // start testing image loading
      this.imageUrl$.next(this.getImageUrl(this.workspaceName, 'url', this.imageType))
    })
    this.log('getImageUrl => ' + this.imageUrl)
  }

  ocxInitRemoteComponent(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
    this.workspaceApi.configuration = new Configuration({
      basePath: Location.joinWithSlash(remoteComponentConfig.baseUrl, environment.apiPrefix)
    })
    if (environment.DEFAULT_LOGO_PATH)
      this.defaultImageUrl = Utils.prepareUrlPath(remoteComponentConfig.baseUrl, environment.DEFAULT_LOGO_PATH)
  }

  /**
   * Image
   */
  public onImageLoadSuccess() {
    this.log('onImageLoad => ok')
    this.imageLoadingFailed.emit(false)
  }

  // try next prio level depending on previous used URL
  public onImageLoadError(usedUrl: string): void {
    this.log('onImageLoadError using => ' + usedUrl)
    if (usedUrl === this.logoUrl[RefType.Logo]) {
      // external URL
      this.log('onImageLoadError using => ext-url')
      this.imageUrl$.next(this.imageUrl)
    } else if (usedUrl === this.imageUrl) {
      this.log('onImageLoadError using => image')
      this.imageUrl$.next(this.getImageUrl(this.workspaceName, 'image', RefType.Logo))
    } else if (usedUrl === this.getImageUrl(this.workspaceName, 'image', RefType.Logo)) {
      this.log('onImageLoadError using => default')
      this.imageUrl$.next(this.getImageUrl(this.workspaceName, 'default', RefType.Logo))
    }
  }

  public getImageUrl(workspaceName: string | undefined, prioType: string, refType: RefType): string | undefined {
    this.log('getImageUrl on prioType => ' + prioType)

    // URL as parameter
    if (['url'].includes(prioType) && this.imageUrl && this.imageUrl !== '') {
      this.log('getImageUrl => url ' + this.imageUrl)
      return this.imageUrl
    }
    // URL as external URL
    if (['url', 'ext-url'].includes(prioType) && this.logoUrl[RefType.Logo] && this.logoUrl[RefType.Logo] !== '') {
      this.log('getImageUrl => ext-url ' + this.logoUrl[RefType.Logo])
      return this.logoUrl[RefType.Logo]
    }
    // URL for uploaded image
    if (['url', 'ext-url', 'image'].includes(prioType)) {
      this.log(
        'getImageUrl => image ' + Utils.bffImageUrl(this.workspaceApi.configuration.basePath, workspaceName, refType)
      )
      return Utils.bffImageUrl(this.workspaceApi.configuration.basePath, workspaceName, refType)
    }
    // URL for default image (as asset)
    if (
      ['url', 'ext-url', 'image', 'default'].includes(prioType) &&
      this.useDefaultLogo &&
      this.defaultImageUrl !== ''
    ) {
      this.log(
        'getImageUrl => default ' + Utils.bffImageUrl(this.workspaceApi.configuration.basePath, workspaceName, refType)
      )
      return this.defaultImageUrl
    }
    this.log('getImageUrl => stop')
    this.imageLoadingFailed.emit(true) // finally inform caller about impossibility
    return undefined
  }

  private log(text: string) {
    if (this.logEnabled) console.info('onecx-current-workspace-logo: ' + (this.logPrefix ?? '') + ' => ' + text)
  }
}
