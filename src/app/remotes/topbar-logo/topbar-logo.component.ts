import { CommonModule } from '@angular/common'
import { Component, ElementRef, inject, Inject, Input, NO_ERRORS_SCHEMA, OnDestroy, ViewChild } from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { combineLatest, filter, map, merge, Observable, ReplaySubject } from 'rxjs'

import {
  AngularRemoteComponentsModule,
  BASE_URL,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  RemoteComponentConfig
} from '@onecx/angular-remote-components'
import { PortalCoreModule } from '@onecx/portal-integration-angular'

import { RefType } from 'src/app/shared/generated'
import { MenuMode, MenuService } from 'src/app/shared/services/menu.service'
import { ResizedEventType } from '../../shared/resized-events/v1/resized-event-type'
import { ResizedEventsTopic } from '../../shared/resized-events/v1/resized-events.topic'
import { SlotGroupResizedEvent } from '../../shared/resized-events/v1/slot-groups-resized-type'
import { SlotResizedEvent } from '../../shared/resized-events/v1/slots-resized-type'
import { OneCXCurrentWorkspaceLogoComponent } from '../current-workspace-logo/current-workspace-logo.component'

// Name of the slot (deprecated) and name of the slot-group being observed for resize events
// The deprecated slot is required for workspaces which still use the old slot
const RESIZE_OBSERVED_SLOT_NAME_OLD = 'onecx-shell-vertical-menu'
const RESIZE_OBSERVED_SLOT_GROUP_NAME = 'onecx-shell-body-start'

const DEFAULT_WIDTH_REM = 17
const TOGGLE_MENU_BUTTON_WIDTH_REM = 2.5

// This value is the width of the sidebar
// When the resizedEventPayloadWidth is less than this value then switch to the small logo
const SMALL_LOGO_THRESHOLD_PX = 235

@Component({
  selector: 'app-topbar-logo',
  templateUrl: './topbar-logo.component.html',
  styleUrls: ['./topbar-logo.component.scss'],
  standalone: true,
  imports: [AngularRemoteComponentsModule, CommonModule, PortalCoreModule, OneCXCurrentWorkspaceLogoComponent],
  providers: [
    {
      provide: BASE_URL,
      useValue: new ReplaySubject<string>(1)
    }
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
@UntilDestroy()
export class OneCXTopbarLogoComponent implements ocxRemoteComponent, ocxRemoteWebcomponent, OnDestroy {
  // input
  @Input() imageId: string | undefined = undefined
  @Input() imageUrl: string | undefined = undefined
  @Input() imageStyleClass: string | undefined = undefined
  @Input() useDefaultLogo = false // used if logo loading failed
  @Input() logPrefix: string | undefined = undefined
  @Input() logEnabled = false
  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.remoteComponentConfig = config
    this.ocxInitRemoteComponent(config)
  }

  private readonly menuService = inject(MenuService)

  public currentImageType: RefType = RefType.Logo
  public remoteComponentConfig: RemoteComponentConfig | undefined

  @ViewChild('container', { static: true }) container!: ElementRef
  private resizedEventsTopic = new ResizedEventsTopic() // NOSONAR
  public isStaticMenuActive$: Observable<boolean>
  public isStaticMenuVisible$: Observable<boolean>

  private readonly staticMenuMode: MenuMode = 'static'

  constructor(@Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>) {
    this.isStaticMenuActive$ = this.menuService.isActive(this.staticMenuMode).pipe(untilDestroyed(this))
    this.isStaticMenuVisible$ = this.menuService.isVisible(this.staticMenuMode).pipe(untilDestroyed(this))

    ResizedEventsTopic.requestEvent(ResizedEventType.SLOT_RESIZED, RESIZE_OBSERVED_SLOT_NAME_OLD)
    ResizedEventsTopic.requestEvent(ResizedEventType.SLOT_GROUP_RESIZED, RESIZE_OBSERVED_SLOT_GROUP_NAME)
  }
  ngOnDestroy(): void {
    this.resizedEventsTopic.destroy()
  }

  ocxInitRemoteComponent(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
    this.initializeContainerStyles()
  }

  private initializeContainerStyles() {
    this.setDefaultWidth()
    this.initializeVerticalMenuSlotResizeListener()
  }

  private initializeVerticalMenuSlotResizeListener() {
    const slotResized$ = this.resizedEventsTopic.pipe(
      filter((e): e is SlotResizedEvent => {
        const matches = e.type === ResizedEventType.SLOT_RESIZED && e.payload.slotName === RESIZE_OBSERVED_SLOT_NAME_OLD
        return matches
      }),
      map((e) => e.payload),
      untilDestroyed(this)
    )

    const slotGroupResized$ = this.resizedEventsTopic.pipe(
      filter((e): e is SlotGroupResizedEvent => {
        const matches =
          e.type === ResizedEventType.SLOT_GROUP_RESIZED && e.payload.slotGroupName === RESIZE_OBSERVED_SLOT_GROUP_NAME
        return matches
      }),
      map((e) => e.payload),
      untilDestroyed(this)
    )

    combineLatest([merge(slotResized$, slotGroupResized$), this.isStaticMenuActive$, this.isStaticMenuVisible$])
      .pipe(untilDestroyed(this))
      .subscribe(([resizedEventPayload, isStaticMenuActive, _isStaticMenuVisible]) => {
        const resizedEventPayloadWidth =
          'slotDetails' in resizedEventPayload
            ? resizedEventPayload.slotDetails.width
            : resizedEventPayload.slotGroupDetails.width
        if (resizedEventPayloadWidth > 0) {
          if (isStaticMenuActive) {
            const correction = this.remToPx() * TOGGLE_MENU_BUTTON_WIDTH_REM
            const adjustedWidth = resizedEventPayloadWidth - correction
            this.container.nativeElement.style.width = adjustedWidth + 'px'
          } else {
            this.container.nativeElement.style.width = resizedEventPayloadWidth + 'px'
          }

          if (resizedEventPayloadWidth < SMALL_LOGO_THRESHOLD_PX && this.currentImageType !== RefType.LogoSmall) {
            this.currentImageType = RefType.LogoSmall
          } else if (resizedEventPayloadWidth >= SMALL_LOGO_THRESHOLD_PX && this.currentImageType !== RefType.Logo) {
            this.currentImageType = RefType.Logo
          }
        }
      })
  }

  private remToPx(): number {
    return Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  }

  private setDefaultWidth() {
    this.container.nativeElement.style.width = DEFAULT_WIDTH_REM - TOGGLE_MENU_BUTTON_WIDTH_REM + 'rem'
  }
}
