import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core'
import { AsyncPipe, Location } from '@angular/common'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import {
  BehaviorSubject,
  Observable,
  ReplaySubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  of,
  retry,
  shareReplay,
  withLatestFrom
} from 'rxjs'

import { MenuItem } from 'primeng/api'
import { PanelMenuModule } from 'primeng/panelmenu'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import {
  AppConfigService,
  AppStateService,
  Capability,
  ShellCapabilityService,
  UserService
} from '@onecx/angular-integration-interface'
import {
  AngularRemoteComponentsModule,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig
} from '@onecx/angular-remote-components'
import { EventsTopic, NavigatedEventPayload } from '@onecx/integration-interface'

import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { MenuService } from 'src/app/shared/services/menu.service'
import { environment } from 'src/environments/environment'

export interface WorkspaceMenuItems {
  items: MenuItem[]
  workspaceName: string | undefined
  workspaceBaseUrl: string | undefined
}

const MENU_MODE = 'static'

@Component({
  selector: 'app-vertical-main-menu',
  standalone: true,
  imports: [AsyncPipe, AngularAcceleratorModule, AngularRemoteComponentsModule, TranslateModule, PanelMenuModule],
  providers: [{ provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<string>(1) }],
  templateUrl: './vertical-main-menu.component.html',
  styleUrls: ['./vertical-main-menu.component.scss']
})
@UntilDestroy()
export class OneCXVerticalMainMenuComponent implements ocxRemoteComponent, ocxRemoteWebcomponent, OnInit, OnDestroy {
  private readonly remoteComponentConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly appConfigService = inject(AppConfigService)
  private readonly userService = inject(UserService)
  private readonly translateService = inject(TranslateService)
  private readonly appStateService = inject(AppStateService)
  private readonly menuItemApiService = inject(MenuItemAPIService)
  private readonly menuItemService = inject(MenuItemService)
  private readonly capabilityService = inject(ShellCapabilityService)

  menuItems$: BehaviorSubject<WorkspaceMenuItems | undefined> = new BehaviorSubject<WorkspaceMenuItems | undefined>(
    undefined
  )
  activeItemClass = 'ocx-vertical-menu-active-item'
  eventsTopic$ = new EventsTopic()

  private readonly menuService = inject(MenuService)
  public isActive$ = this.menuService.isActive(MENU_MODE).pipe(untilDestroyed(this))
  public isHidden$ = this.menuService
    .isVisible(MENU_MODE)
    .pipe(map((isVisible) => !isVisible))
    .pipe(untilDestroyed(this))

  constructor() {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }

  @Input() set ocxRemoteComponentConfig(rcConfig: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(rcConfig)
  }

  ocxInitRemoteComponent(rcConfig: RemoteComponentConfig) {
    this.remoteComponentConfig.next(rcConfig)
    this.appConfigService.init(rcConfig.baseUrl)
    this.menuItemApiService.configuration = new Configuration({
      basePath: Location.joinWithSlash(rcConfig.baseUrl, environment.apiPrefix)
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
        map(([url, menuItems]) => {
          const currentItems = this.menuItems$.getValue()
          if (!currentItems || currentItems.workspaceName !== menuItems.workspaceName) {
            return {
              workspaceName: menuItems.workspaceName,
              workspaceBaseUrl: menuItems.workspaceBaseUrl,
              items: this.changeActiveItem(url, menuItems.items)
            }
          } else {
            return {
              workspaceName: currentItems.workspaceName,
              workspaceBaseUrl: currentItems.workspaceBaseUrl,
              items: this.changeActiveItem(url, currentItems.items)
            }
          }
        })
      )
      .subscribe(this.menuItems$)
  }

  ngOnDestroy(): void {
    this.eventsTopic$.destroy()
  }

  private getMenuItems() {
    return this.appStateService.currentWorkspace$.pipe(
      mergeMap((currentWorkspace) =>
        this.menuItemApiService
          .getMenuItems({
            getMenuItemsRequest: {
              workspaceName: currentWorkspace.workspaceName,
              menuKeys: ['main-menu']
            }
          })
          .pipe(
            map((response) => ({
              data: response,
              workspaceName: currentWorkspace.workspaceName,
              workspaceBaseUrl: currentWorkspace.baseUrl
            })),
            retry({ delay: 500, count: 3 }),
            catchError((err) => {
              console.error('Unable to load menu items for vertical main menu.', err)
              return of(undefined)
            })
          )
      ),
      withLatestFrom(this.userService.lang$),
      map(([menuData, userLang]): WorkspaceMenuItems => ({
        workspaceBaseUrl: menuData?.workspaceBaseUrl,
        workspaceName: menuData?.workspaceName,
        items: this.menuItemService.constructMenuItems(
          menuData?.data?.menu?.[0]?.children,
          userLang,
          menuData?.workspaceBaseUrl
        )
      })),
      shareReplay(),
      untilDestroyed(this)
    )
  }

  private changeActiveItem(url: string, menuItems: MenuItem[]): MenuItem[] {
    const bestMatch = this.menuItemService.findActiveItemBestMatch(menuItems, url)
    if (bestMatch) {
      for (const item of bestMatch.parents) {
        item.expanded = true
      }
    }
    const items = menuItems.map((i) => this.updateItemsByActiveItem(i, bestMatch?.item))
    return items
  }

  private updateItemsByActiveItem(item: MenuItem, activeItem: MenuItem | undefined): MenuItem {
    return {
      ...item,
      styleClass: item.id === activeItem?.id ? this.activeItemClass : undefined,
      items: item.items?.map((i) => this.updateItemsByActiveItem(i, activeItem))
    }
  }
}
