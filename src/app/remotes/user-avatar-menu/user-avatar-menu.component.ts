import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { AfterViewInit, Component, Inject, OnDestroy, Renderer2 } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { RouterModule } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  ocxRemoteComponent,
  provideTranslateServiceForRoot,
  RemoteComponentConfig
} from '@onecx/angular-remote-components'
import { EventsPublisher } from '@onecx/integration-interface'
import {
  AppStateService,
  createRemoteComponentTranslateLoader,
  PortalCoreModule,
  UserProfile,
  UserService
} from '@onecx/portal-integration-angular'
import { AvatarModule } from 'primeng/avatar'
import { MenuModule } from 'primeng/menu'
import { RippleModule } from 'primeng/ripple'
import { filter, mergeMap, Observable, ReplaySubject } from 'rxjs'
import { Configuration, UserMenuAPIService, UserWorkspaceMenuStructure } from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-user-avatar-menu',
  standalone: true,
  imports: [
    AngularRemoteComponentsModule,
    CommonModule,
    FormsModule,
    MenuModule,
    AvatarModule,
    RippleModule,
    PortalCoreModule,
    BrowserAnimationsModule,
    RouterModule,
    TranslateModule,
    SharedModule
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
  ],
  templateUrl: './user-avatar-menu.component.html',
  styleUrls: ['./user-avatar-menu.component.scss']
})
@UntilDestroy()
export class OneCXUserAvatarMenuComponent implements ocxRemoteComponent, AfterViewInit, OnDestroy {
  currentUser$: Observable<UserProfile>
  userMenu$: Observable<UserWorkspaceMenuStructure>
  eventsPublisher$: EventsPublisher = new EventsPublisher()
  menuOpen = false
  permissions: string[] = []
  removeDocumentClickListener: (() => void) | undefined

  constructor(
    private renderer: Renderer2,
    private userService: UserService,
    private userMenuService: UserMenuAPIService,
    private appStateService: AppStateService,
    @Inject(BASE_URL) private baseUrl: ReplaySubject<string>,
    private translateService: TranslateService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))

    this.currentUser$ = this.userService.profile$.pipe(
      filter((x) => x !== undefined),
      untilDestroyed(this)
    )

    this.userMenu$ = this.appStateService.currentWorkspace$.pipe(
      mergeMap((currentWorkspace) =>
        this.userMenuService.getUserMenu({
          userWorkspaceMenuRequest: {
            workspaceName: currentWorkspace.portalName,
            menuKeys: ['user-profile-menu']
          }
        })
      ),
      untilDestroyed(this)
    )
  }

  ngAfterViewInit() {
    this.removeDocumentClickListener = this.renderer.listen('body', 'click', () => {
      this.menuOpen = false
    })
  }

  ngOnDestroy() {
    if (this.removeDocumentClickListener) {
      this.removeDocumentClickListener()
    }
  }

  ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.baseUrl.next(config.baseUrl)
    this.permissions = config.permissions
    this.userMenuService.configuration = new Configuration({
      basePath: Location.joinWithSlash(config.baseUrl, environment.apiPrefix)
    })
  }

  handleAvatarClick(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.menuOpen = !this.menuOpen
  }

  logout(event: Event) {
    event.preventDefault()
    this.eventsPublisher$.publish({ type: 'authentication#logoutButtonClicked' })
  }
}
