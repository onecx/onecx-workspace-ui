import { AfterViewInit, Component, Inject, OnDestroy, OnInit, Renderer2 } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MenuModule } from 'primeng/menu'
import { AvatarModule } from 'primeng/avatar'
import { RippleModule } from 'primeng/ripple'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
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
import { Observable, ReplaySubject, filter, mergeMap } from 'rxjs'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations'
import { animate, style, transition, trigger } from '@angular/animations'
import { RouterModule } from '@angular/router'
import { UserMenuAPIService, UserWorkspaceMenuStructure } from 'src/app/shared/generated'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import { HttpClient } from '@angular/common/http'
import { SharedModule } from 'src/app/shared/shared.module'

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
    provideAnimations(),
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
  styleUrls: ['./user-avatar-menu.component.scss'],
  animations: [
    trigger('topbarActionPanelAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scaleY(0.8)' }),
        animate('.12s cubic-bezier(0, 0, 0.2, 1)', style({ opacity: 1, transform: '*' }))
      ]),
      transition(':leave', [animate('.1s linear', style({ opacity: 0 }))])
    ])
  ]
})
@UntilDestroy()
export class UserAvatarMenuComponent implements ocxRemoteComponent, OnInit, AfterViewInit, OnDestroy {
  config: RemoteComponentConfig | undefined
  currentUser$: Observable<UserProfile>
  userMenu$: Observable<UserWorkspaceMenuStructure>
  menuOpen = false
  removeDocumentClickListener: (() => void) | undefined

  constructor(
    @Inject(AUTH_SERVICE) private authService: IAuthService,
    private renderer: Renderer2,
    private userService: UserService,
    private userMenuService: UserMenuAPIService,
    private appStateService: AppStateService,
    private appConfigService: AppConfigService,
    @Inject(BASE_URL) private baseUrl: ReplaySubject<string>,
    private translateService: TranslateService
  ) {
    this.userService.lang$.subscribe((lang) => translateService.use(lang))

    this.currentUser$ = this.userService.profile$
      .pipe(untilDestroyed(this))
      .pipe(filter((x) => x !== undefined)) as Observable<UserProfile>

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

  ngOnInit() {
    this.ocxInitRemoteComponent({
      appId: 'workspace-ui',
      baseUrl: 'http://localhost:4200/',
      permissions: [],
      productName: 'workspace'
    })
  }

  ngAfterViewInit() {
    this.removeDocumentClickListener = this.renderer.listen('body', 'click', () => {
      this.menuOpen = false
    })
  }

  ngOnDestroy() {
    this.removeDocumentClickListener?.()
  }

  ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    console.log('OCX INIT REMOTE COMPONENT')
    this.baseUrl.next(config.baseUrl)
    this.appConfigService.init(config['baseUrl'])
    this.config = config
    console.log('CONFIG ', config)
  }

  handleAvatarClick(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.menuOpen = !this.menuOpen
  }

  logout(event: Event) {
    event.preventDefault()
    this.authService.logout()
  }
}
