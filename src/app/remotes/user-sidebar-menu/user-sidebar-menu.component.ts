import { HttpClient } from '@angular/common/http'
import { Component, Inject } from '@angular/core'
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
import { EventsPublisher } from '@onecx/integration-interface'
import {
  AUTH_SERVICE,
  AppConfigService,
  AppStateService,
  IAuthService,
  PortalCoreModule,
  UserProfile,
  UserService,
  createRemoteComponentTranslateLoader
} from '@onecx/portal-integration-angular'
import { AccordionModule } from 'primeng/accordion'
import { Observable, ReplaySubject, filter, map, mergeMap } from 'rxjs'
import { UserMenuAPIService, UserWorkspaceMenuStructure } from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'

@Component({
  selector: 'app-user-sidebar-menu',
  standalone: true,
  imports: [
    AngularRemoteComponentsModule,
    SharedModule,
    PortalCoreModule,
    RouterModule,
    AccordionModule,
    TranslateModule
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
  templateUrl: './user-sidebar-menu.component.html',
  styleUrls: ['./user-sidebar-menu.component.scss']
})
@UntilDestroy()
export class OneCXUserSidebarMenuComponent implements ocxRemoteComponent {
  config: RemoteComponentConfig | undefined
  currentUser$: Observable<UserProfile>
  userMenu$: Observable<UserWorkspaceMenuStructure>
  displayName$: Observable<string>
  eventsPublisher$: EventsPublisher = new EventsPublisher()

  inlineProfileActive = false

  constructor(
    @Inject(BASE_URL) private baseUrl: ReplaySubject<string>,
    private translateService: TranslateService,
    private appConfigService: AppConfigService,
    private appStateService: AppStateService,
    private userMenuService: UserMenuAPIService,
    private userService: UserService,
    @Inject(AUTH_SERVICE) private authService: IAuthService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))

    this.currentUser$ = this.userService.profile$.pipe(
      filter((x) => x !== undefined),
      untilDestroyed(this)
    )
    this.displayName$ = this.currentUser$.pipe(
      filter((x) => x !== undefined),
      map((currentUser) => this.determineDisplayName(currentUser)),
      untilDestroyed(this)
    )

    this.userMenu$ = this.appStateService.currentPortal$.pipe(
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

  ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.baseUrl.next(config.baseUrl)
    this.appConfigService.init(config['baseUrl'])
    this.config = config
  }

  onInlineProfileClick(event: UIEvent) {
    this.inlineProfileActive = !this.inlineProfileActive
    event.preventDefault()
  }

  determineDisplayName(userProfile: UserProfile) {
    if (userProfile) {
      const person = userProfile.person
      if (person.displayName) {
        return person.displayName
      } else if (person.firstName && person.lastName) {
        return person.firstName + ' ' + person.lastName
      } else {
        return userProfile.userId
      }
    } else {
      return 'Guest'
    }
  }

  logout() {
    this.eventsPublisher$.publish({ type: 'authentication#logoutButtonClicked' })
  }
}
