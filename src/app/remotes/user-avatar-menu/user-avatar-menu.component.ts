import { Component, ElementRef, EventEmitter, HostListener, inject, Input, signal } from '@angular/core'
import { CommonModule, Location } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import {
  Observable,
  ReplaySubject,
  catchError,
  filter,
  map,
  mergeMap,
  of,
  retry,
  shareReplay,
  withLatestFrom
} from 'rxjs'

import { MenuItem, PrimeIcons } from 'primeng/api'
import { AvatarModule } from 'primeng/avatar'
import { MenuModule } from 'primeng/menu'
import { RippleModule } from 'primeng/ripple'

import { AppConfigService, AppStateService, UserService } from '@onecx/angular-integration-interface'
import {
  AngularRemoteComponentsModule,
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig,
  SLOT_SERVICE,
  SlotService,
  ocxRemoteComponent,
  ocxRemoteWebcomponent
} from '@onecx/angular-remote-components'
import { EventsPublisher, UserProfile } from '@onecx/integration-interface'

import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { SharedModule } from 'src/app/shared/shared.module'
import { VerticalMenuItemComponent } from 'src/app/shared/vertical-menu-item/vertical-menu-item.component'
import { environment } from 'src/environments/environment'

export type MenuAnchorPositionConfig = 'right' | 'left'

@Component({
  selector: 'app-user-avatar-menu',
  standalone: true,
  imports: [
    AngularRemoteComponentsModule,
    FormsModule,
    CommonModule,
    SharedModule,
    MenuModule,
    AvatarModule,
    RippleModule,
    RouterModule,
    TranslateModule,
    VerticalMenuItemComponent
  ],
  providers: [{ provide: SLOT_SERVICE, useExisting: SlotService }, AppConfigService],
  templateUrl: './user-avatar-menu.component.html',
  styleUrls: ['./user-avatar-menu.component.scss']
})
@UntilDestroy()
export class OneCXUserAvatarMenuComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  private readonly remoteComponentConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly userService: UserService = inject(UserService)
  private readonly slotService: SlotService = inject(SlotService)
  private readonly menuItemApiService: MenuItemAPIService = inject(MenuItemAPIService)
  private readonly appStateService: AppStateService = inject(AppStateService)
  private readonly appConfigService: AppConfigService = inject(AppConfigService)
  private readonly translateService: TranslateService = inject(TranslateService)
  private readonly menuItemService: MenuItemService = inject(MenuItemService)
  private elementRef = inject(ElementRef)

  public menuOpen = signal<boolean>(false)

  public userProfile$: Observable<UserProfile>
  public userMenu$: Observable<MenuItem[]>
  public eventsPublisher$: EventsPublisher = new EventsPublisher()
  public permissions: string[] = []
  public menuAnchorPosition: MenuAnchorPositionConfig = 'right'
  // slot configuration: get avatar image
  public slotNameAvatarImage = 'onecx-avatar-image'
  public isAvatarImageComponentDefined$: Observable<boolean> = of(false) // check if a component was assigned
  public avatarImageLoadedEmitter = new EventEmitter<boolean>()
  public avatarImageLoaded: boolean | undefined = undefined // getting true/false from response, then component managed
  // slot configuration: get custom user info
  public slotNameCustomUserInfo = 'onecx-custom-user-info'
  public isCustomUserInfoComponentDefined$: Observable<boolean> = of(false) // check if a component was assigned

  /**
   * Handles global keyboard and click events to close the menu if it is open.
   */
  @HostListener('document:keydown.escape', ['$event']) onEscapePressed(event: Event) {
    if (this.menuOpen()) {
      this.menuOpen.set(false)
    }
  }
  @HostListener('document:click', ['$event']) onDocumentClick(event: Event) {
    if (!this.menuOpen()) return
    this.menuOpen.set(false)
    const clickedInside = this.elementRef.nativeElement.contains(event.target)
    if (!clickedInside) this.menuOpen.set(false)
  }

  constructor() {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
    this.isCustomUserInfoComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.slotNameCustomUserInfo)
    this.isAvatarImageComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.slotNameAvatarImage)
    this.avatarImageLoadedEmitter.subscribe((data) => (this.avatarImageLoaded = data))

    this.userProfile$ = this.userService.profile$.pipe(
      filter((x) => x !== undefined),
      untilDestroyed(this)
    )

    this.userMenu$ = this.appStateService.currentWorkspace$.pipe(
      mergeMap((currentWorkspace) =>
        this.menuItemApiService
          .getMenuItems({
            getMenuItemsRequest: {
              workspaceName: currentWorkspace.workspaceName,
              menuKeys: ['user-profile-menu']
            }
          })
          .pipe(
            map((response) => ({
              data: response,
              workspaceName: currentWorkspace.workspaceName,
              workspaceBaseUrl: currentWorkspace.baseUrl
            })),
            retry({ delay: 500, count: 3 }),
            catchError(() => {
              console.error('Unable to load menu items for user profile menu.')
              return of(undefined)
            })
          )
      ),
      withLatestFrom(this.userService.lang$),
      map(([menuData, userLang]) =>
        this.menuItemService.constructMenuItems(
          menuData?.data?.menu?.[0]?.children,
          userLang,
          menuData?.workspaceBaseUrl
        )
      ),
      mergeMap((currentMenu) => {
        return this.translateService.get('REMOTES.USER_AVATAR_MENU.LOGOUT').pipe(
          catchError(() => {
            return of('Logout')
          }),
          map((translatedLabel) => {
            const newMenuItem: MenuItem = {
              label: translatedLabel,
              icon: PrimeIcons.POWER_OFF,
              command: () => this.onLogout()
            }
            return [...currentMenu, newMenuItem]
          })
        )
      }),
      shareReplay(),
      untilDestroyed(this)
    )
  }

  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }

  ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.remoteComponentConfig.next(config)
    this.appConfigService.init(config.baseUrl).then(() => {
      const menuAnchorPositionConfig = this.appConfigService.getProperty('USER_AVATAR_MENU_ANCHOR_POSITION')
      if (menuAnchorPositionConfig) {
        this.menuAnchorPosition = menuAnchorPositionConfig as MenuAnchorPositionConfig
      }
    })
    this.permissions = config.permissions
    this.menuItemApiService.configuration = new Configuration({
      basePath: Location.joinWithSlash(config.baseUrl, environment.apiPrefix)
    })
  }

  public toggleMenu(event: Event): void {
    event.stopPropagation()
    this.menuOpen.set(!this.menuOpen())
  }

  public onLogout(): void {
    this.eventsPublisher$.publish({ type: 'authentication#logoutButtonClicked' })
  }
}
