import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Inject, OnInit } from '@angular/core'
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
import {
  AppStateService,
  PortalCoreModule,
  UserService,
  createRemoteComponentTranslateLoader
} from '@onecx/portal-integration-angular'
import { MenuItem } from 'primeng/api'
import { PanelMenuModule } from 'primeng/panelmenu'
import { Observable, ReplaySubject, map, mergeMap, shareReplay, withLatestFrom } from 'rxjs'
import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-vertical-main-menu',
  templateUrl: './vertical-main-menu.component.html',
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
export class OneCXVerticalMainMenuComponent implements ocxRemoteComponent, OnInit {
  menuItems$: Observable<MenuItem[]> | undefined

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
    this.menuItems$ = this.appStateService.currentWorkspace$.pipe(
      mergeMap((currentWorkspace) =>
        this.menuItemApiService.getMenuItems({
          getMenuItemsRequest: {
            workspaceName: currentWorkspace.workspaceName,
            menuKeys: ['main-menu']
          }
        })
      ),
      withLatestFrom(this.userService.lang$),
      map(([data, userLang]) => this.menuItemService.constructMenuItems(data.menu?.[0].children, userLang)),
      shareReplay(),
      untilDestroyed(this)
    )
  }
}
