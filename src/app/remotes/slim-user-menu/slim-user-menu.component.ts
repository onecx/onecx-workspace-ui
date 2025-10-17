import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, EventEmitter, inject, Inject, Input } from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  filter,
  map,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  retry,
  shareReplay,
  withLatestFrom
} from 'rxjs'

import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { AppStateService, UserService } from '@onecx/angular-integration-interface'

import { createTranslateLoader, provideTranslationPathFromMeta } from '@onecx/angular-utils'
import { MenuService } from 'src/app/shared/services/menu.service'
import { SlimMenuMode } from 'src/app/shared/model/slim-menu-mode'
import { EventsPublisher, UserProfile, Workspace } from '@onecx/integration-interface'
import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { environment } from 'src/environments/environment'
import { MenuItem, PrimeIcons } from 'primeng/api'
import { SlimMenuItems } from 'src/app/shared/model/slim-menu-item'
import { SlimMenuItemComponent } from 'src/app/shared/components/slim-menu-item/slim-menu-item.component'
import { TooltipModule } from 'primeng/tooltip'
import { RippleModule } from 'primeng/ripple'
import { AccordionModule } from 'primeng/accordion'

@Component({
  selector: 'app-slim-user-main-menu',
  templateUrl: './slim-user-menu.component.html',
  styleUrl: './slim-user-menu.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AngularRemoteComponentsModule,
    SlimMenuItemComponent,
    TooltipModule,
    RippleModule,
    AccordionModule
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
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    }),
    provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/')
  ]
})
@UntilDestroy()
export class OneCXSlimUserMenuComponent implements ocxRemoteWebcomponent {
  Mode = SlimMenuMode

  private readonly menuService = inject(MenuService)

  private isSlimMenuActive$ = this.menuService.isActive('slim')
  private isSlimPlusMenuActive$ = this.menuService.isActive('slimplus')

  public currentUser$: Observable<UserProfile>
  public displayName$: Observable<string>
  public avatarImageLoaded$: BehaviorSubject<boolean | undefined> = new BehaviorSubject<boolean | undefined>(undefined)
  // slot: avatar image
  public avatarImageLoadedEmitter = new EventEmitter<boolean>()

  // Assumption: only one menu can be active at a time
  public activeMode$ = combineLatest([this.isSlimMenuActive$, this.isSlimPlusMenuActive$]).pipe(
    map(([isSlimActive, isSlimPlusActive]) => {
      if (isSlimActive) {
        return SlimMenuMode.SLIM
      }
      if (isSlimPlusActive) {
        return SlimMenuMode.SLIM_PLUS
      }
      return SlimMenuMode.INACTIVE
    })
  )

  // Hide the menu when inactive or when the active menu is not visible
  public isHidden$ = this.activeMode$.pipe(
    mergeMap((mode) => {
      if (mode === SlimMenuMode.INACTIVE) {
        return of(true)
      }

      return this.menuService.isVisible(mode)
    }),
    map((isVisible) => !isVisible)
  )

  menuItems$: BehaviorSubject<SlimMenuItems | undefined> = new BehaviorSubject<SlimMenuItems | undefined>(undefined)

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    private readonly userService: UserService,
    private readonly translateService: TranslateService,
    private readonly appStateService: AppStateService,
    private readonly menuItemApiService: MenuItemAPIService,
    private readonly menuItemService: MenuItemService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
    this.avatarImageLoadedEmitter.subscribe(this.avatarImageLoaded$)

    this.currentUser$ = this.userService.profile$.pipe(
      filter((x) => x !== undefined),
      untilDestroyed(this)
    )

    this.displayName$ = this.currentUser$.pipe(
      filter((x) => x !== undefined),
      mergeMap((currentUser) => this.determineDisplayName(currentUser)),
      untilDestroyed(this)
    )

    this.getMenuItems()
      .pipe(map((items) => this.menuItemService.mapMenuItemsToSlimMenuItems(items)))
      .subscribe(this.menuItems$)
  }

  @Input() set ocxRemoteComponentConfig(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
    this.menuItemApiService.configuration = new Configuration({
      basePath: Location.joinWithSlash(remoteComponentConfig.baseUrl, environment.apiPrefix)
    })
  }

  logout() {
    new EventsPublisher().publish({ type: 'authentication#logoutButtonClicked' })
  }

  private determineDisplayName(userProfile: UserProfile): Observable<string> {
    if (userProfile) {
      const person = userProfile.person
      if (person.displayName) {
        return of(person.displayName)
      } else if (person.firstName && person.lastName) {
        return of(person.firstName + ' ' + person.lastName)
      } else {
        return of(userProfile.userId)
      }
    } else {
      return this.translateService.get('REMOTES.SLIM_USER_MENU.GUEST').pipe(catchError(() => of('Guest')))
    }
  }

  private getMenuItems(): Observable<MenuItem[]> {
    return this.appStateService.currentWorkspace$.pipe(
      mergeMap((currentWorkspace) =>
        this.getUserMenuItems(currentWorkspace).pipe(
          map((menuItemsResponse) => ({
            items: menuItemsResponse?.menu?.[0]?.children,
            workspaceBaseUrl: currentWorkspace.baseUrl
          }))
        )
      ),
      withLatestFrom(this.userService.lang$),
      map(([{ items, workspaceBaseUrl }, userLang]): MenuItem[] =>
        this.menuItemService.constructMenuItems(items, userLang, workspaceBaseUrl)
      ),
      mergeMap((currentMenu) => {
        return this.translateService.get('REMOTES.SLIM_USER_MENU.LOGOUT').pipe(
          catchError(() => {
            return of('Logout')
          }),
          map((translatedLabel) => {
            const newMenuItem: MenuItem = {
              id: 'ws_slim_user_menu_logout',
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

  private getUserMenuItems(currentWorkspace: Workspace) {
    return this.menuItemApiService
      .getMenuItems({
        getMenuItemsRequest: {
          workspaceName: currentWorkspace.workspaceName,
          menuKeys: ['user-profile-menu']
        }
      })
      .pipe(
        retry({ delay: 500, count: 3 }),
        catchError(() => {
          console.error('Unable to load menu items for slim user menu.')
          return of(undefined)
        })
      )
  }
}
