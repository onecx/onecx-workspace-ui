import { Component, inject, Input, OnInit } from '@angular/core'
import { AsyncPipe, Location } from '@angular/common'
import { RouterModule } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { Observable, ReplaySubject, catchError, map, mergeMap, of, retry, shareReplay, withLatestFrom } from 'rxjs'

import { MenuItem } from 'primeng/api'

import {
  AngularRemoteComponentsModule,
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig,
  ocxRemoteComponent,
  ocxRemoteWebcomponent
} from '@onecx/angular-remote-components'
import { AppConfigService, AppStateService, UserService } from '@onecx/angular-integration-interface'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'

import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-ocx-footer-menu',
  standalone: true,
  imports: [AsyncPipe, AngularAcceleratorModule, AngularRemoteComponentsModule, RouterModule, TranslateModule],
  providers: [{ provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<string>(1) }],
  templateUrl: './footer-menu.component.html',
  styleUrls: ['./footer-menu.component.scss']
})
@UntilDestroy()
export class OneCXFooterMenuComponent implements OnInit, ocxRemoteComponent, ocxRemoteWebcomponent {
  private readonly remoteComponentConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly appConfigService = inject(AppConfigService)
  private readonly userService = inject(UserService)
  private readonly translateService = inject(TranslateService)
  private readonly appStateService = inject(AppStateService)
  private readonly menuItemApiService = inject(MenuItemAPIService)
  private readonly menuItemService = inject(MenuItemService)

  menuItems$: Observable<MenuItem[]> | undefined

  constructor() {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }

  @Input() set ocxRemoteComponentConfig(rcConfig: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(rcConfig)
  }

  ocxInitRemoteComponent(rcConfig: RemoteComponentConfig): void {
    this.appConfigService.init(rcConfig.baseUrl)
    this.remoteComponentConfig.next(rcConfig)
    this.menuItemApiService.configuration = new Configuration({
      basePath: Location.joinWithSlash(rcConfig.baseUrl, environment.apiPrefix)
    })
  }

  ngOnInit(): void {
    this.getMenuItems()
  }

  getMenuItems() {
    this.menuItems$ = this.appStateService.currentWorkspace$.pipe(
      mergeMap((currentWorkspace) =>
        this.menuItemApiService
          .getMenuItems({
            getMenuItemsRequest: {
              workspaceName: currentWorkspace.workspaceName,
              menuKeys: ['footer-menu']
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
              console.error('Unable to load menu items for footer menu.')
              return of(undefined)
            })
          )
      ),
      withLatestFrom(this.userService.lang$),
      map(([menuData, userLang]) =>
        this.menuItemService.constructMenuItems(
          menuData?.data?.menu?.[0]?.children,
          userLang,
          menuData?.workspaceBaseUrl
        )
      ),
      shareReplay(),
      untilDestroyed(this)
    )
  }
}
