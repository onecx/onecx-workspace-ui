import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, inject, Inject, Input, OnDestroy, OnInit } from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
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
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { AppStateService, Capability, ShellCapabilityService, UserService } from '@onecx/angular-integration-interface'

import { createTranslateLoader, provideTranslationPathFromMeta } from '@onecx/angular-utils'
import { MenuService } from 'src/app/shared/services/menu.service'
import { EventsTopic, NavigatedEventPayload, Workspace } from '@onecx/integration-interface'
import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { environment } from 'src/environments/environment'
import { ItemType, SlimMenuItems } from 'src/app/shared/model/slim-menu-item'
import { SlimMenuMode } from 'src/app/shared/model/slim-menu-mode'
import { SlimMenuItemComponent } from 'src/app/shared/components/slim-menu-item/slim-menu-item.component'
import { MenuItem } from 'primeng/api'

@Component({
  selector: 'app-slim-vertical-main-menu',
  templateUrl: './slim-vertical-main-menu.component.html',
  styleUrl: './slim-vertical-main-menu.component.scss',
  standalone: true,
  imports: [CommonModule, TranslateModule, SlimMenuItemComponent],
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
export class OneCXSlimVerticalMainMenuComponent implements ocxRemoteWebcomponent, OnInit, OnDestroy {
  Mode = SlimMenuMode

  private readonly menuService = inject(MenuService)

  private isSlimMenuActive$ = this.menuService.isActive('slim')
  private isSlimPlusMenuActive$ = this.menuService.isActive('slimplus')

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

  eventsTopic$ = new EventsTopic()

  menuItems$: BehaviorSubject<SlimMenuItems | undefined> = new BehaviorSubject<SlimMenuItems | undefined>(undefined)

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    private readonly userService: UserService,
    private readonly translateService: TranslateService,
    private readonly appStateService: AppStateService,
    private readonly menuItemApiService: MenuItemAPIService,
    private readonly menuItemService: MenuItemService,
    private readonly capabilityService: ShellCapabilityService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }

  @Input() set ocxRemoteComponentConfig(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
    this.menuItemApiService.configuration = new Configuration({
      basePath: Location.joinWithSlash(remoteComponentConfig.baseUrl, environment.apiPrefix)
    })
  }

  ngOnInit(): void {
    let location$: Observable<string> = this.appStateService.currentLocation$.asObservable().pipe(
      map((e) => e.url),
      filter((url): url is string => !!url),
      distinctUntilChanged()
    )

    if (!this.capabilityService.hasCapability(Capability.CURRENT_LOCATION_TOPIC)) {
      location$ = this.eventsTopic$.pipe(filter((e) => e.type === 'navigated')).pipe(
        map((e) => (e.payload as NavigatedEventPayload).url),
        filter((url): url is string => !!url),
        distinctUntilChanged()
      )
    }

    combineLatest([location$, this.getMenuItems()])
      .pipe(
        map(([url, workspaceItems]) => this.menuItemService.mapMenuItemsToSlimMenuItems(workspaceItems, url)),
        // TODO: Remove
        map((items) =>
          items.concat([
            {
              type: ItemType.ACTION,
              icon: 'pi pi-fw pi-cog',
              command: () => console.log('asd'),
              active: false,
              label: 'Settings'
            }
          ])
        )
      )
      .subscribe(this.menuItems$)
  }

  ngOnDestroy(): void {
    this.eventsTopic$.destroy()
  }

  private getMenuItems(): Observable<MenuItem[]> {
    return this.appStateService.currentWorkspace$.pipe(
      mergeMap((currentWorkspace) =>
        this.getWorkspaceMainMenuItems(currentWorkspace).pipe(
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
      shareReplay(),
      untilDestroyed(this)
    )
  }

  private getWorkspaceMainMenuItems(currentWorkspace: Workspace) {
    return this.menuItemApiService
      .getMenuItems({
        getMenuItemsRequest: {
          workspaceName: currentWorkspace.workspaceName,
          menuKeys: ['main-menu']
        }
      })
      .pipe(
        retry({ delay: 500, count: 3 }),
        catchError(() => {
          console.error('Unable to load menu items for slim vertical main menu.')
          return of(undefined)
        })
      )
  }
}
