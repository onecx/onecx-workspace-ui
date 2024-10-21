import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Inject, Input, OnInit } from '@angular/core'
import { RouterModule } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import { getLocation } from '@onecx/accelerator'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { EventsTopic } from '@onecx/integration-interface'
import {
  AppStateService,
  PortalCoreModule,
  UserService,
  createRemoteComponentTranslateLoader
} from '@onecx/portal-integration-angular'
import { MenuItem } from 'primeng/api'
import { PanelMenuModule } from 'primeng/panelmenu'
import { BehaviorSubject, ReplaySubject, map, mergeMap, shareReplay, withLatestFrom } from 'rxjs'
import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'

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
export class OneCXVerticalMainMenuComponent implements ocxRemoteComponent, ocxRemoteWebcomponent, OnInit {
  eventsTopic$ = new EventsTopic()

  menuItems$: BehaviorSubject<MenuItem[]> = new BehaviorSubject<MenuItem[]>([])

  activeItemClass = 'ocx-vertical-menu-active-item'

  constructor(
    @Inject(BASE_URL) private baseUrl: ReplaySubject<string>,
    private userService: UserService,
    private translateService: TranslateService,
    private appStateService: AppStateService,
    private menuItemApiService: MenuItemAPIService,
    private menuItemService: MenuItemService
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
    this.getMenuItems()
  }

  getMenuItems() {
    this.appStateService.currentWorkspace$
      .pipe(
        mergeMap((currentWorkspace) =>
          this.menuItemApiService.getMenuItems({
            getMenuItemsRequest: {
              workspaceName: currentWorkspace.workspaceName,
              menuKeys: ['main-menu']
            }
          })
        ),
        withLatestFrom(this.userService.lang$),
        map(([data, userLang]) => this.menuItemService.constructMenuItems(data?.menu?.[0]?.children, userLang)),
        map((menuItems) => {
          const bestMatch = this.menuItemService.findActiveItemBestMatch(menuItems, getLocation().applicationPath)
          if (bestMatch) {
            bestMatch.item.styleClass = this.activeItemClass
            for (const item of bestMatch.parents) {
              item.expanded = true
            }
          }
          return menuItems
        }),
        map((items) => {
          this.menuItemService.flatMenuItems(items).forEach((item) => {
            if (item.routerLink) {
              item.command = (event) => this.changeActiveItem(event.item)
            }
          })

          return items
        }),
        shareReplay(),
        untilDestroyed(this)
      )
      .subscribe(this.menuItems$)
  }

  private updateItemsByActiveItem(item: MenuItem, activeItem: MenuItem | undefined): MenuItem {
    return {
      styleClass: item.id === activeItem?.id ? this.activeItemClass : '',
      items: item.items?.map((i) => this.updateItemsByActiveItem(i, activeItem)),
      command: item.routerLink ? (event) => this.changeActiveItem(event.item) : undefined,
      label: item.label,
      id: item.id,
      icon: item.icon,
      routerLink: item.routerLink,
      url: item.url,
      expanded: item.expanded
    }
  }

  private changeActiveItem(itemToActivate: MenuItem | undefined) {
    const items = this.menuItems$.getValue().map((i) => this.updateItemsByActiveItem(i, itemToActivate))
    this.menuItems$.next(items)
  }
}
