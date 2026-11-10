import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, inject, signal } from '@angular/core'
import { AsyncPipe, Location, NgClass } from '@angular/common'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { RouterModule } from '@angular/router'
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

import { AccordionModule } from 'primeng/accordion'
import { MenuItem, PrimeIcons } from 'primeng/api'
import { PanelMenuModule } from 'primeng/panelmenu'

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
import { MenuService } from 'src/app/shared/services/menu.service'
import { environment } from 'src/environments/environment'

export function slotInitializer(slotService: SlotService) {
  return () => slotService.init()
}

const MENU_MODE = 'static'

@Component({
  selector: 'app-user-sidebar-menu',
  standalone: true,
  imports: [
    AsyncPipe,
    NgClass,
    AngularRemoteComponentsModule,
    RouterModule,
    AccordionModule,
    TranslateModule,
    PanelMenuModule
  ],
  providers: [{ provide: SLOT_SERVICE, useExisting: SlotService }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-sidebar-menu.component.html',
  styleUrls: ['./user-sidebar-menu.component.scss']
})
export class OneCXUserSidebarMenuComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly remoteComponentConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly translateService = inject(TranslateService)
  private readonly appConfigService = inject(AppConfigService)
  private readonly appStateService = inject(AppStateService)
  private readonly menuItemApiService = inject(MenuItemAPIService)
  private readonly userService = inject(UserService)
  private readonly menuItemService = inject(MenuItemService)

  public currentUser$: Observable<UserProfile>
  public userMenu$: Observable<MenuItem[]>
  public displayName$: Observable<string>
  public organization$: Observable<string | undefined>
  public eventsPublisher$: EventsPublisher = new EventsPublisher()
  public inlineProfileActive = false
  // slot: avatar image
  public avatarImageLoadedEmitter = new EventEmitter<boolean>()
  public readonly avatarImageLoaded = signal<boolean | undefined>(undefined) // getting true/false from response, then component managed

  private readonly menuService = inject(MenuService)
  public isActive$ = this.menuService.isActive(MENU_MODE).pipe(takeUntilDestroyed(this.destroyRef))
  public isHidden$ = this.menuService
    .isVisible(MENU_MODE)
    .pipe(map((isVisible) => !isVisible))
    .pipe(takeUntilDestroyed(this.destroyRef))

  constructor() {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
    this.avatarImageLoadedEmitter.subscribe((data: boolean) => {
      this.avatarImageLoaded.set(data)
    })

    this.currentUser$ = this.userService.profile$.pipe(
      filter((x) => x !== undefined),
      takeUntilDestroyed(this.destroyRef)
    )
    this.displayName$ = this.currentUser$.pipe(
      filter((x) => x !== undefined),
      map((currentUser) => this.determineDisplayName(currentUser)),
      takeUntilDestroyed(this.destroyRef)
    )
    this.organization$ = this.currentUser$.pipe(
      filter((x) => x !== undefined),
      map((currentUser) => {
        return currentUser.organization ?? ''
      }),
      takeUntilDestroyed(this.destroyRef)
    )

    this.userMenu$ = this.appStateService.currentWorkspace$.pipe(
      mergeMap((currentWorkspace) =>
        this.menuItemApiService
          .getMenuItems({
            getMenuItemsRequest: {
              workspaceName: currentWorkspace.workspaceName,
              menuKeys: ['user-profile-menu'] // USER_PROFILE_MENU
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
        return this.translateService.get('REMOTES.USER_SIDEBAR_MENU.LOGOUT').pipe(
          catchError(() => {
            return of('Logout')
          }),
          map((translatedLabel) => {
            const newMenuItem: MenuItem = {
              id: 'ws_user_sidebar_logout',
              label: translatedLabel,
              icon: PrimeIcons.POWER_OFF,
              command: () => this.logout()
            }
            return [...currentMenu, newMenuItem]
          })
        )
      }),
      shareReplay(),
      takeUntilDestroyed(this.destroyRef)
    )
  }

  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }

  ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.remoteComponentConfig.next(config)
    this.appConfigService.init(config.baseUrl)
    this.menuItemApiService.configuration = new Configuration({
      basePath: Location.joinWithSlash(config.baseUrl, environment.apiPrefix)
    })
  }

  onInlineProfileClick(event: UIEvent) {
    this.inlineProfileActive = !this.inlineProfileActive
    event.preventDefault()
  }

  determineDisplayName(userProfile: UserProfile) {
    if (userProfile) {
      const person = userProfile.person
      if (person.displayName) {
        return person.displayName
      } else if (person.firstName && person.lastName) {
        return person.firstName + ' ' + person.lastName
      } else {
        return userProfile.userId
      }
    } else {
      return 'Guest'
    }
  }

  logout() {
    this.eventsPublisher$.publish({ type: 'authentication#logoutButtonClicked' })
  }
}
