import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, inject, Inject, Input, OnDestroy, OnInit } from '@angular/core'
import { RouterModule } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
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

import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { EventsTopic, NavigatedEventPayload } from '@onecx/integration-interface'
import { AppStateService, Capability, ShellCapabilityService, UserService } from '@onecx/angular-integration-interface'
import { createRemoteComponentTranslateLoader } from '@onecx/angular-accelerator'
import { PortalCoreModule } from '@onecx/portal-integration-angular'

import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'
import { MenuService } from 'src/app/shared/services/menu.service'

export interface WorkspaceMenuItems {
  items: MenuItem[]
  workspaceName: string | undefined
  workspaceBaseUrl: string | undefined
}

const MENU_MODE = 'static'

@Component({
  selector: 'app-vertical-main-menu',
  templateUrl: './vertical-main-menu.component.html',
  styleUrl: './vertical-main-menu.component.scss',
  standalone: true,
  imports: [
    AngularRemoteComponentsModule,
    CommonModule,
    PortalCoreModule,
    RouterModule,
    TranslateModule,
    SharedModule,
    PanelMenuModule
  ],
  providers: [
    { provide: BASE_URL, useValue: new ReplaySubject<string>(1) },
    provideTranslateServiceForRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: createRemoteComponentTranslateLoader,
        deps: [HttpClient, BASE_URL]
      }
    })
  ]
})
@UntilDestroy()
export class OneCXVerticalMainMenuComponent implements ocxRemoteComponent, ocxRemoteWebcomponent, OnInit, OnDestroy {
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

  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }

  ocxInitRemoteComponent(remoteComponentConfig: RemoteComponentConfig) {
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
            catchError(() => {
              console.error('Unable to load menu items for vertical main menu.')
              return of(undefined)
            })
          )
      ),
      withLatestFrom(this.userService.lang$),
      map(
        ([menuData, userLang]): WorkspaceMenuItems => ({
          workspaceBaseUrl: menuData?.workspaceBaseUrl,
          workspaceName: menuData?.workspaceName,
          items: this.menuItemService.constructMenuItems(
            menuData?.data?.menu?.[0]?.children,
            userLang,
            menuData?.workspaceBaseUrl
          )
        })
      ),
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
      styleClass: item.id === activeItem?.id ? this.activeItemClass : '',
      items: item.items?.map((i) => this.updateItemsByActiveItem(i, activeItem))
    }
  }
}
