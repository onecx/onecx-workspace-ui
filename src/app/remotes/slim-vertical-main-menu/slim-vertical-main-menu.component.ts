import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core'
import { CommonModule, Location } from '@angular/common'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
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

import { MenuItem } from 'primeng/api'

import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig, ocxRemoteWebcomponent } from '@onecx/angular-remote-components'
import { AppStateService, Capability, ShellCapabilityService, UserService } from '@onecx/angular-integration-interface'
import { EventsTopic, NavigatedEventPayload, Workspace } from '@onecx/integration-interface'

import { MenuService } from 'src/app/shared/services/menu.service'
import { Configuration, MenuItemAPIService } from 'src/app/shared/generated'
import { environment } from 'src/environments/environment'

import { SlimMenuItems } from 'src/app/shared/model/slim-menu-item'
import { SlimMenuMode } from 'src/app/shared/model/slim-menu-mode'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { SlimMenuItemComponent } from 'src/app/shared/components/slim-menu-item/slim-menu-item.component'

@Component({
  selector: 'app-slim-vertical-main-menu',
  standalone: true,
  imports: [CommonModule, TranslateModule, SlimMenuItemComponent],
  templateUrl: './slim-vertical-main-menu.component.html',
  styleUrl: './slim-vertical-main-menu.component.scss'
})
@UntilDestroy()
export class OneCXSlimVerticalMainMenuComponent implements ocxRemoteWebcomponent, OnInit, OnDestroy {
  private readonly remoteComponentConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly userService = inject(UserService)
  private readonly translateService = inject(TranslateService)
  private readonly appStateService = inject(AppStateService)
  private readonly menuItemApiService = inject(MenuItemAPIService)
  private readonly menuItemService = inject(MenuItemService)
  private readonly capabilityService = inject(ShellCapabilityService)

  public Mode = SlimMenuMode
  private readonly menuService = inject(MenuService)
  private readonly isSlimMenuActive$ = this.menuService.isActive('slim')
  private readonly isSlimPlusMenuActive$ = this.menuService.isActive('slimplus')

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
        return of(false)
      }

      return this.menuService.isVisible(mode)
    }),
    map((isVisible) => !isVisible)
  )

  eventsTopic$ = new EventsTopic()

  menuItems$: BehaviorSubject<SlimMenuItems | undefined> = new BehaviorSubject<SlimMenuItems | undefined>(undefined)

  constructor() {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }

  @Input() set ocxRemoteComponentConfig(rcConfig: RemoteComponentConfig) {
    this.remoteComponentConfig.next(rcConfig)
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
      .pipe(map(([url, workspaceItems]) => this.menuItemService.mapMenuItemsToSlimMenuItems(workspaceItems, url)))
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
