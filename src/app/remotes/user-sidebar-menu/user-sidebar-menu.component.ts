import { APP_INITIALIZER, Component, EventEmitter, inject, Inject, Input } from '@angular/core'
import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { RouterModule } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import { AccordionModule } from 'primeng/accordion'
import { MenuItem, PrimeIcons } from 'primeng/api'
import { PanelMenuModule } from 'primeng/panelmenu'
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
import { EventsPublisher, UserProfile } from '@onecx/integration-interface'
import { AppConfigService, AppStateService, UserService } from '@onecx/angular-integration-interface'
import { createRemoteComponentTranslateLoader } from '@onecx/angular-accelerator'
import { PortalCoreModule } from '@onecx/portal-integration-angular'

import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'
import { MenuService } from 'src/app/shared/services/menu.service'

export function slotInitializer(slotService: SlotService) {
  return () => slotService.init()
}

@Component({
  selector: 'app-user-sidebar-menu',
  standalone: true,
  imports: [
    AngularRemoteComponentsModule,
    SharedModule,
    PortalCoreModule,
    RouterModule,
    AccordionModule,
    TranslateModule,
    PanelMenuModule
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
  templateUrl: './user-sidebar-menu.component.html',
  styleUrls: ['./user-sidebar-menu.component.scss']
})
@UntilDestroy()
export class OneCXUserSidebarMenuComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  public currentUser$: Observable<UserProfile>
  public userMenu$: Observable<MenuItem[]>
  public displayName$: Observable<string>
  public organization$: Observable<string | undefined>
  public eventsPublisher$: EventsPublisher = new EventsPublisher()
  public inlineProfileActive = false
  // slot: avatar image
  public avatarImageLoadedEmitter = new EventEmitter<boolean>()
  public avatarImageLoaded: boolean | undefined = undefined // getting true/false from response, then component managed

  private readonly menuService = inject(MenuService)
  public isActive$ = this.menuService.isActive('static')
  public isHidden$ = this.menuService.isVisible('static').pipe(map((isVisible) => !isVisible))

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    private readonly translateService: TranslateService,
    private readonly appConfigService: AppConfigService,
    private readonly appStateService: AppStateService,
    private readonly menuItemApiService: MenuItemAPIService,
    private readonly userService: UserService,
    private readonly menuItemService: MenuItemService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
    this.avatarImageLoadedEmitter.subscribe(this.avatarImageLoaded)
    this.avatarImageLoadedEmitter.subscribe((data: boolean) => {
      this.avatarImageLoaded = data
    })

    this.currentUser$ = this.userService.profile$.pipe(
      filter((x) => x !== undefined),
      untilDestroyed(this)
    )
    this.displayName$ = this.currentUser$.pipe(
      filter((x) => x !== undefined),
      map((currentUser) => this.determineDisplayName(currentUser)),
      untilDestroyed(this)
    )
    this.organization$ = this.currentUser$.pipe(
      filter((x) => x !== undefined),
      map((currentUser) => {
        return currentUser.organization ?? ''
      }),
      untilDestroyed(this)
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
      untilDestroyed(this)
    )
  }

  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }

  ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.baseUrl.next(config.baseUrl)
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
