import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { APP_INITIALIZER, AfterViewInit, Component, Inject, Input, OnDestroy, Renderer2 } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  SLOT_SERVICE,
  SlotService,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { EventsPublisher } from '@onecx/integration-interface'
import {
  AppConfigService,
  AppStateService,
  PortalCoreModule,
  UserProfile,
  UserService,
  createRemoteComponentTranslateLoader
} from '@onecx/portal-integration-angular'
import { MenuItem, PrimeIcons } from 'primeng/api'
import { AvatarModule } from 'primeng/avatar'
import { MenuModule } from 'primeng/menu'
import { RippleModule } from 'primeng/ripple'
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
import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'

export type MenuAnchorPositionConfig = 'right' | 'left'

export function slotInitializer(slotService: SlotService) {
  return () => slotService.init()
}

@Component({
  selector: 'app-user-avatar-menu',
  standalone: true,
  imports: [
    AngularRemoteComponentsModule,
    FormsModule,
    SharedModule,
    MenuModule,
    AvatarModule,
    RippleModule,
    PortalCoreModule,
    RouterModule,
    TranslateModule
  ],
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
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: slotInitializer,
      deps: [SLOT_SERVICE],
      multi: true
    },
    {
      provide: SLOT_SERVICE,
      useExisting: SlotService
    }
  ],
  templateUrl: './user-avatar-menu.component.html',
  styleUrls: ['./user-avatar-menu.component.scss']
})
@UntilDestroy()
export class OneCXUserAvatarMenuComponent
  implements ocxRemoteComponent, ocxRemoteWebcomponent, AfterViewInit, OnDestroy
{
  currentUser$: Observable<UserProfile>
  userMenu$: Observable<MenuItem[]>
  eventsPublisher$: EventsPublisher = new EventsPublisher()
  menuOpen = false
  permissions: string[] = []
  removeDocumentClickListener: (() => void) | undefined
  menuAnchorPosition: MenuAnchorPositionConfig = 'right'

  constructor(
    private renderer: Renderer2,
    private userService: UserService,
    private menuItemApiService: MenuItemAPIService,
    private appStateService: AppStateService,
    private appConfigService: AppConfigService,
    @Inject(BASE_URL) private baseUrl: ReplaySubject<string>,
    private translateService: TranslateService,
    private menuItemService: MenuItemService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))

    this.currentUser$ = this.userService.profile$.pipe(
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
            retry({ delay: 500, count: 3 }),
            catchError(() => {
              console.error('Unable to load menu items for user profile menu.')
              return of(undefined)
            })
          )
      ),
      withLatestFrom(this.userService.lang$),
      map(([data, userLang]) => this.menuItemService.constructMenuItems(data?.menu?.[0]?.children, userLang)),
      mergeMap((currentMenu) => {
        return this.translateService.get('REMOTES.USER_AVATAR_MENU.LOGOUT').pipe(
          catchError(() => {
            return of('Logout')
          }),
          map((translatedLabel) => {
            const newMenuItem: MenuItem = {
              label: translatedLabel,
              icon: PrimeIcons.POWER_OFF,
              command: () => this.logout()
            }
            return [...currentMenu, newMenuItem]
          })
        )
      }),
      shareReplay(),
      untilDestroyed(this)
    )
  }

  ngAfterViewInit() {
    this.removeDocumentClickListener = this.renderer.listen('body', 'click', () => {
      this.menuOpen = false
    })
  }

  ngOnDestroy() {
    if (this.removeDocumentClickListener) {
      this.removeDocumentClickListener()
    }
  }

  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }

  ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.baseUrl.next(config.baseUrl)
    this.permissions = config.permissions
    this.menuItemApiService.configuration = new Configuration({
      basePath: Location.joinWithSlash(config.baseUrl, environment.apiPrefix)
    })
    this.appConfigService.init(config.baseUrl).then(() => {
      const menuAnchorPositionConfig = this.appConfigService.getProperty('USER_AVATAR_MENU_ANCHOR_POSITION')
      if (menuAnchorPositionConfig) {
        this.menuAnchorPosition = menuAnchorPositionConfig as MenuAnchorPositionConfig
      }
    })
  }

  onAvatarEnter() {
    this.menuOpen = true
  }

  onAvatarEscape() {
    this.menuOpen = false
  }

  onItemEscape(userAvatarMenuButton: HTMLAnchorElement) {
    this.menuOpen = false
    userAvatarMenuButton.focus()
  }

  handleAvatarClick(event: Event) {
    event.preventDefault()
    event.stopPropagation()
    this.menuOpen = !this.menuOpen
  }

  logout() {
    this.eventsPublisher$.publish({ type: 'authentication#logoutButtonClicked' })
  }
}
