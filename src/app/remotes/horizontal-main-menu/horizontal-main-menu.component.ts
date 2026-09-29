import { Component, Input, OnInit, OnDestroy, ViewChild, inject, Renderer2 } from '@angular/core'
import { CommonModule, Location } from '@angular/common'
import { RouterModule } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { Observable, ReplaySubject, catchError, map, mergeMap, of, retry, shareReplay, withLatestFrom } from 'rxjs'

import { MenuItem } from 'primeng/api'
import { Menubar, MenubarModule } from 'primeng/menubar'

//import { createRemoteComponentTranslateLoader } from '@onecx/angular-accelerator'
import {
  AngularRemoteComponentsModule,
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig,
  ocxRemoteComponent,
  ocxRemoteWebcomponent
} from '@onecx/angular-remote-components'
import { AppStateService, UserService } from '@onecx/angular-integration-interface'

import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { MenuService } from 'src/app/shared/services/menu.service'
import { environment } from 'src/environments/environment'

const MENU_MODE = 'horizontal'

@Component({
  selector: 'app-horizontal-main-menu',
  standalone: true,
  imports: [AngularRemoteComponentsModule, CommonModule, RouterModule, TranslateModule, MenubarModule],
  templateUrl: './horizontal-main-menu.component.html',
  styleUrls: ['./horizontal-main-menu.component.scss']
})
@UntilDestroy()
export class OneCXHorizontalMainMenuComponent implements OnInit, OnDestroy, ocxRemoteComponent, ocxRemoteWebcomponent {
  public readonly remoteComponentConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly userService = inject(UserService)
  private readonly translateService = inject(TranslateService)
  private readonly appStateService = inject(AppStateService)
  private readonly menuItemApiService = inject(MenuItemAPIService)
  private readonly menuItemService = inject(MenuItemService)

  menuItems$: Observable<MenuItem[]> | undefined

  private readonly menuService = inject(MenuService)
  public isActive$ = this.menuService.isActive(MENU_MODE).pipe(untilDestroyed(this))
  private readonly renderer = inject(Renderer2)

  private removeMouseLeaveListener?: () => void

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
  // Remove this listener when PrimeNG fixes the p-menubar autoHide component
  @ViewChild('menubar')
  set menubarSetter(menubar: Menubar | undefined) {
    if (!menubar) return
    this.removeMouseLeaveListener = this.renderer.listen(menubar.el.nativeElement, 'mouseleave', () => {
      menubar.hide()
    })
  }

  ngOnInit(): void {
    this.getMenuItems()
  }

  ngOnDestroy(): void {
    this.removeMouseLeaveListener?.()
  }

  ocxInitRemoteComponent(rcConfig: RemoteComponentConfig) {
    this.remoteComponentConfig.next(rcConfig)
    this.menuItemApiService.configuration = new Configuration({
      basePath: Location.joinWithSlash(rcConfig.baseUrl, environment.apiPrefix)
    })
  }

  getMenuItems() {
    this.menuItems$ = this.appStateService.currentWorkspace$.pipe(
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
              console.error('Unable to load menu items for horizontal main menu.')
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
