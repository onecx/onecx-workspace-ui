import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Inject, Input, OnChanges } from '@angular/core'
import { RouterModule } from '@angular/router'
import { UntilDestroy } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import {
  AppStateService,
  PortalCoreModule,
  UserService,
  createRemoteComponentTranslateLoader
} from '@onecx/portal-integration-angular'
import { PanelMenuModule } from 'primeng/panelmenu'
import { catchError, map, Observable, of, ReplaySubject } from 'rxjs'
import {
  Configuration,
  MenuItemAPIService,
  SearchWorkspacesResponse,
  WorkspaceAPIService
} from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-list-workspaces-using-theme',
  templateUrl: './list-workspaces-using-theme.component.html',
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
export class OneCXListWorkspacesUsingThemeComponent implements ocxRemoteComponent, ocxRemoteWebcomponent, OnChanges {
  @Input() themeName = ''
  public workspacesUsingTheme: Observable<string[]> | undefined

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    private readonly userService: UserService,
    private readonly translateService: TranslateService,
    private readonly appStateService: AppStateService,
    private readonly menuItemApiService: MenuItemAPIService,
    private readonly workspaceApi: WorkspaceAPIService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }

  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }

  ocxInitRemoteComponent(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
    this.workspaceApi.configuration = new Configuration({
      basePath: Location.joinWithSlash(remoteComponentConfig.baseUrl, environment.apiPrefix)
    })
  }

  ngOnChanges(): void {
    this.findWorkspacesUsingTheme(this.themeName)
  }

  private findWorkspacesUsingTheme(theme: string) {
    this.workspacesUsingTheme = this.workspaceApi.searchWorkspaces({ searchWorkspacesRequest: {} }).pipe(
      catchError((err) => {
        console.error('searchWorkspaces():', err)
        return of({ stream: [] } as SearchWorkspacesResponse)
      }),
      map((data) => {
        const workspaces: string[] = []
        if (data.stream) {
          data.stream.forEach((ws) => {
            if (ws.theme === theme) workspaces.push(ws.displayName)
          })
        }
        return workspaces
      })
    )
  }
}
