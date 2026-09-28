import { ChangeDetectionStrategy, Component, inject, Input, OnInit } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { Location } from '@angular/common'
import { Router } from '@angular/router'
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
import { Utils } from 'src/app/shared/utils'
import { SafeLinkDirective } from 'src/app/shared/safe-link.directive'
import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-ocx-footer-menu',
  standalone: true,
  imports: [AngularAcceleratorModule, AngularRemoteComponentsModule, TranslateModule, SafeLinkDirective],
  providers: [{ provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<string>(1) }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer-menu.component.html',
  styleUrls: ['./footer-menu.component.scss']
})
@UntilDestroy()
export class OneCXFooterMenuComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  private readonly remoteComponentConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly appConfigService = inject(AppConfigService)
  private readonly userService = inject(UserService)
  private readonly translateService = inject(TranslateService)
  private readonly appStateService = inject(AppStateService)
  private readonly menuItemApiService = inject(MenuItemAPIService)
  private readonly menuItemService = inject(MenuItemService)
  public readonly router = inject(Router)

  SafeLinkDirective = SafeLinkDirective
  menuItems$ = this.getMenuItems()
  menuItems = toSignal(this.menuItems$ ?? of([]), { initialValue: [] })
  public Utils = Utils

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

  getMenuItems(): Observable<MenuItem[]> | undefined {
    return this.appStateService.currentWorkspace$.pipe(
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
