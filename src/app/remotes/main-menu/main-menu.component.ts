import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core'
import { Router, RouterModule } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  ocxRemoteComponent,
  provideTranslateServiceForRoot,
  RemoteComponentConfig
} from '@onecx/angular-remote-components'
import {
  AppStateService,
  createRemoteComponentTranslateLoader,
  PortalCoreModule,
  UserService
} from '@onecx/portal-integration-angular'
import { MenuItem } from 'primeng/api'
import { map, mergeMap, Observable, ReplaySubject, shareReplay, withLatestFrom } from 'rxjs'
import { Configuration, UserMenuAPIService, UserWorkspaceMenuItem } from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'
import { SubMenuComponent } from '../sub-menu/sub-menu.component'

@Component({
  selector: 'app-main-menu',
  templateUrl: './main-menu.component.html',
  standalone: true,
  imports: [
    AngularRemoteComponentsModule,
    CommonModule,
    PortalCoreModule,
    RouterModule,
    TranslateModule,
    SharedModule,
    SubMenuComponent
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
export class OneCXMainMenuComponent implements ocxRemoteComponent, OnInit {
  menuItems$: Observable<MenuItem[]> | undefined
  remoteComponentConfig: RemoteComponentConfig | undefined

  constructor(
    @Inject(BASE_URL) private baseUrl: ReplaySubject<string>,
    private userService: UserService,
    private translateService: TranslateService,
    private appStateService: AppStateService,
    private userMenuService: UserMenuAPIService,
    private router: Router,
    private changDetectorRef: ChangeDetectorRef
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }
  ngOnInit(): void {
    this.menuItems$ = this.getMenuItems()
  }

  ocxInitRemoteComponent(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
    this.remoteComponentConfig = remoteComponentConfig
    this.userMenuService.configuration = new Configuration({
      basePath: Location.joinWithSlash(remoteComponentConfig.baseUrl, environment.apiPrefix)
    })
  }

  getMenuItems(forceReload = false): Observable<MenuItem[]> {
    if (!this.menuItems$ || forceReload) {
      this.menuItems$ = this.appStateService.currentWorkspace$.pipe(
        mergeMap((currentWorkspace) =>
          this.userMenuService.getUserMenu({
            userWorkspaceMenuRequest: {
              workspaceName: currentWorkspace.portalName,
              menuKeys: ['main-menu']
            }
          })
        ),
        withLatestFrom(this.userService.lang$),
        map(([data, userLang]) => this.constructMenuItems(data.menu?.[0].children, userLang)),
        shareReplay(),
        untilDestroyed(this)
      )
    }
    return this.menuItems$
  }

  private constructMenuItems(userWorkspaceMenuItem: UserWorkspaceMenuItem[] | undefined, userLang: string): MenuItem[] {
    const menuItems = userWorkspaceMenuItem?.filter((item) => {
      return item
    })
    if (menuItems) {
      return menuItems
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .filter((i) => i)
        .map((item) => this.mapMenuItem(item, userLang))
    } else {
      return []
    }
  }

  private mapMenuItem(item: UserWorkspaceMenuItem | undefined, userLang: string): MenuItem {
    let isLocal: boolean
    let label: string | undefined

    if (item) {
      isLocal = this.isLocal(item.url)
      label = item.i18n ? item.i18n[userLang] || item.name : ''

      return {
        id: item.key,
        items:
          item.children && item.children.length > 0
            ? item.children
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                .filter((i) => i)
                .map((i) => this.mapMenuItem(i, userLang))
            : undefined,
        label,
        icon: item.badge || undefined,
        routerLink: isLocal ? this.stripBaseHref(item.url) : undefined,
        routerLinkActiveOptions: [{ exact: false }],
        url: isLocal ? undefined : item.url,
        badge: isLocal ? 'mf' : 'ext'
      }
    } else {
      return {}
    }
  }

  private toRouteUrl(url: string | undefined) {
    if (!url) {
      return url
    }
    if (url?.startsWith('/')) {
      url = url.substring(1)
    }
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1)
    }
    return url
  }

  private isLocal(url: string | undefined) {
    if (url && url.startsWith('http')) {
      return false
    }
    const path = url?.trim().split('?')[0]
    if (
      this.router.config.some((r) => {
        return this.toRouteUrl(path) === this.toRouteUrl(this.remoteComponentConfig?.baseUrl.concat(r.path ?? ''))
      })
    ) {
      return true
    }

    return false
  }

  private stripBaseHref(url: string | undefined): string | undefined {
    if (this.remoteComponentConfig?.baseUrl && url) {
      return url.replace(this.remoteComponentConfig?.baseUrl, '')
    } else {
      return url
    }
  }
}
