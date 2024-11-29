import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core'
import { RouterModule } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { EventsTopic, NavigatedEventPayload } from '@onecx/integration-interface'
import {
  AppStateService,
  PortalCoreModule,
  UserService,
  createRemoteComponentTranslateLoader
} from '@onecx/portal-integration-angular'
import { MenuItem } from 'primeng/api'
import { PanelMenuModule } from 'primeng/panelmenu'
import {
  BehaviorSubject,
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
import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'

export interface WorkspaceMenuItems {
  workspaceName: string
  items: MenuItem[]
}

@Component({
  selector: 'app-vertical-main-menu',
  templateUrl: './vertical-main-menu.component.html',
  styleUrl: './vertical-main-manu.component.scss',
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
  ]
})
@UntilDestroy()
export class OneCXVerticalMainMenuComponent implements ocxRemoteComponent, ocxRemoteWebcomponent, OnInit, OnDestroy {
  eventsTopic$ = new EventsTopic()

  menuItems$: BehaviorSubject<WorkspaceMenuItems | undefined> = new BehaviorSubject<WorkspaceMenuItems | undefined>(
    undefined
  )

  activeItemClass = 'ocx-vertical-menu-active-item'

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    private readonly userService: UserService,
    private readonly translateService: TranslateService,
    private readonly appStateService: AppStateService,
    private readonly menuItemApiService: MenuItemAPIService,
    private readonly menuItemService: MenuItemService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }
  ngOnDestroy(): void {
    this.eventsTopic$.destroy()
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
    combineLatest([
      this.eventsTopic$.asObservable().pipe(
        filter((e) => e.type === 'navigated'),
        map((e) => (e.payload as NavigatedEventPayload).url),
        filter((url): url is string => !!url),
        distinctUntilChanged()
      ),
      this.getMenuItems()
    ])
      .pipe(
        map(([url, workspaceItems]) => {
          const currentItems = this.menuItems$.getValue()
          if (!currentItems || currentItems.workspaceName !== workspaceItems.workspaceName) {
            return {
              workspaceName: workspaceItems.workspaceName,
              items: this.changeActiveItem(url, workspaceItems.items)
            }
          } else {
            return {
              workspaceName: currentItems.workspaceName,
              items: this.changeActiveItem(url, currentItems.items)
            }
          }
        })
      )
      .subscribe(this.menuItems$)
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
            map((response) => ({ data: response, workspaceName: currentWorkspace.workspaceName })),
            retry({ delay: 500, count: 3 }),
            catchError(() => {
              console.error('Unable to load menu items for vertical main menu.')
              return of(undefined)
            })
          )
      ),
      withLatestFrom(this.userService.lang$),
      map(
        ([workspaceItems, userLang]): WorkspaceMenuItems => ({
          workspaceName: workspaceItems?.workspaceName ?? '',
          items: this.menuItemService.constructMenuItems(workspaceItems?.data?.menu?.[0]?.children, userLang)
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
      styleClass: item.id === activeItem?.id ? this.activeItemClass : '',
      items: item.items?.map((i) => this.updateItemsByActiveItem(i, activeItem)),
      label: item.label,
      id: item.id,
      icon: item.icon,
      routerLink: item.routerLink,
      url: item.url,
      expanded: item.expanded
    }
  }
}
