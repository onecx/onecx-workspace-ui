import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Inject,
  Input,
  NO_ERRORS_SCHEMA,
  OnDestroy,
  ViewChild
} from '@angular/core'
import { CommonModule, Location } from '@angular/common'
import { UntilDestroy } from '@ngneat/until-destroy'
import { BehaviorSubject, filter, ReplaySubject } from 'rxjs'

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
import { EventsTopic, SlotsResizedEvent } from '@onecx/integration-interface'

const RESIZE_OBSERVED_SLOT_NAME = 'onecx-shell-vertical-menu'
const DEFAULT_WIDTH_REM = 17
@Component({
  selector: 'app-current-workspace-logo',
  templateUrl: './current-workspace-logo.component.html',
  styleUrls: ['./current-workspace-logo.component.scss'],
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
export class OneCXCurrentWorkspaceLogoComponent implements ocxRemoteComponent, ocxRemoteWebcomponent, OnDestroy {
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

  @ViewChild('container', { static: true }) container!: ElementRef
  private eventsTopic = new EventsTopic()

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    private readonly workspaceApi: WorkspaceAPIService
  ) {
    this.appState.currentWorkspace$.asObservable().subscribe((workspace) => {
      this.workspaceName = workspace?.workspaceName
      this.imageUrl$.next(this.getImageUrl(this.workspaceName, 'url', this.imageType))
    })
  }
  ngOnDestroy(): void {
    this.eventsTopic.destroy()
  }

  ocxInitRemoteComponent(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
    this.workspaceApi.configuration = new Configuration({
      basePath: Location.joinWithSlash(remoteComponentConfig.baseUrl, environment.apiPrefix)
    })
    if (environment.DEFAULT_LOGO_PATH)
      this.defaultImageUrl = Utils.prepareUrlPath(remoteComponentConfig.baseUrl, environment.DEFAULT_LOGO_PATH)

    this.initializeContainerStyles()
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
      this.log('onImageLoadError using => image')
      this.imageUrl$.next(this.getImageUrl(this.workspaceName, 'image', RefType.Logo))
    } else if (usedUrl === this.getImageUrl(this.workspaceName, 'image', RefType.Logo)) {
      this.log('onImageLoadError using => default')
      this.imageUrl$.next(this.getImageUrl(this.workspaceName, 'default', RefType.Logo))
    }
  }

  public getImageUrl(workspaceName: string | undefined, prioType: string, refType: RefType): string | undefined {
    this.log('getImageUrl on prioType => ' + prioType)

    // if URL exist
    if (['url'].includes(prioType) && this.imageUrl && this.imageUrl !== '') {
      this.log('getImageUrl => ' + this.imageUrl)
      return this.imageUrl
    } else if (['url', 'image'].includes(prioType)) {
      this.log('getImageUrl => ' + Utils.bffImageUrl(this.workspaceApi.configuration.basePath, workspaceName, refType))
      return Utils.bffImageUrl(this.workspaceApi.configuration.basePath, workspaceName, refType)
    } else if (['url', 'image', 'default'].includes(prioType) && this.useDefaultLogo && this.defaultImageUrl !== '') {
      // if user wants to have the default (as asset)
      return this.defaultImageUrl
    }
    this.log('getImageUrl => stop')
    this.imageLoadingFailed.emit(true) // finally inform caller about impossibility
    return undefined
  }

  private initializeContainerStyles() {
    this.setDefaultWidth()
    this.initializeVerticalMenuSlotResizeListener()
  }

  private initializeVerticalMenuSlotResizeListener() {
    this.eventsTopic
      .pipe(
        filter(
          (e): e is SlotsResizedEvent =>
            e.type === 'slotsResized' && (e as SlotsResizedEvent).payload.slotName === RESIZE_OBSERVED_SLOT_NAME
        )
      )
      .subscribe((e) => {
        const slotWidth = e.payload.slotDetails.width
        if (slotWidth > 0) {
          const widthWithSpaceForToggleButton = e.payload.slotDetails.width - this.remToPx() * 1.25
          this.container.nativeElement.style.width = widthWithSpaceForToggleButton + 'px'
        }
      })
  }

  private remToPx(): number {
    return parseFloat(getComputedStyle(document.documentElement).fontSize)
  }

  private setDefaultWidth() {
    this.container.nativeElement.style.width = DEFAULT_WIDTH_REM - 1.25 + 'rem'
  }

  private log(text: string) {
    if (this.logEnabled) console.info('onecx-current-workspace-logo: ' + (this.logPrefix ?? '') + ' => ' + text)
  }
}
