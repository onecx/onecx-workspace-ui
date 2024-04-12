import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core'
import { RouterModule } from '@angular/router'
import { untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import { createRemoteComponentTranslateLoader } from '@onecx/angular-accelerator'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { AppStateService, PortalCoreModule, UserService } from '@onecx/portal-integration-angular'
import { MenuItem } from 'primeng/api'
import { Menubar } from 'primeng/menubar'
import { Observable, ReplaySubject, map, mergeMap, shareReplay, withLatestFrom } from 'rxjs'
import { Configuration, UserMenuAPIService, UserWorkspaceMenuItem } from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-horizontal-menu',
  standalone: true,
  templateUrl: './horizontal-menu.component.html',
  imports: [AngularRemoteComponentsModule, CommonModule, PortalCoreModule, RouterModule, TranslateModule, SharedModule],
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
export class OneCXHorizontalMenuComponent implements OnInit {
  @ViewChild('menubar') menubar?: Menubar
  menuItems$: Observable<MenuItem[]> | undefined

  constructor(
    @Inject(BASE_URL) private baseUrl: ReplaySubject<string>,
    private userService: UserService,
    private translateService: TranslateService,
    private appStateService: AppStateService,
    private userMenuService: UserMenuAPIService,
    private elementRef: ElementRef
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }

  ocxInitRemoteComponent(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
    this.userMenuService.configuration = new Configuration({
      basePath: Location.joinWithSlash(remoteComponentConfig.baseUrl, environment.apiPrefix)
    })
  }

  ngOnInit(): void {
    this.getMenuItems()
  }

  getMenuItems() {
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
      isLocal = !item.external
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
        icon: item.badge ? 'pi pi-' + item.badge : undefined,
        routerLink: isLocal ? this.stripBaseHref(item.url) : undefined,
        url: isLocal ? undefined : item.url
      }
    } else {
      return {}
    }
  }

  private stripBaseHref(url: string | undefined): string | undefined {
    const basePath = document.getElementsByTagName('base')[0]?.href
    const baseUrl = new URL(basePath, window.location.origin).toString()
    return url?.replace(baseUrl, '')
  }
}
