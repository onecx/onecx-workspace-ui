import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Inject } from '@angular/core'
import { RouterModule } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
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
import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'

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
    })
  ],
  templateUrl: './user-sidebar-menu.component.html',
  styleUrls: ['./user-sidebar-menu.component.scss']
})
@UntilDestroy()
export class OneCXUserSidebarMenuComponent implements ocxRemoteComponent {
  currentUser$: Observable<UserProfile>
  userMenu$: Observable<MenuItem[]>
  displayName$: Observable<string>
  organization$: Observable<string | undefined>
  eventsPublisher$: EventsPublisher = new EventsPublisher()

  inlineProfileActive = false

  constructor(
    @Inject(BASE_URL) private baseUrl: ReplaySubject<string>,
    private translateService: TranslateService,
    private appConfigService: AppConfigService,
    private appStateService: AppStateService,
    private menuItemApiService: MenuItemAPIService,
    private userService: UserService,
    private menuItemService: MenuItemService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))

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
      map((currentUser) => currentUser.organization),
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
        return this.translateService.get('REMOTES.USER_SIDEBAR_MENU.LOGOUT').pipe(
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
  /*
  determineOrganization(userProfile: UserProfile): string | undefined {
    if (userProfile) {
    } else
    return undefined
*/

  logout() {
    this.eventsPublisher$.publish({ type: 'authentication#logoutButtonClicked' })
  }
}
