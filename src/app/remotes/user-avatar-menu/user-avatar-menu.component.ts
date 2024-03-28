import { AfterViewInit, Component, Inject, OnDestroy, OnInit, Renderer2 } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { SharedModule } from 'src/app/shared/shared.module'
import { MenuItem, PrimeIcons } from 'primeng/api'
import { MenuModule } from 'primeng/menu'
import { AvatarModule } from 'primeng/avatar'
import { RippleModule } from 'primeng/ripple'
import { RemoteComponentConfig, ocxRemoteComponent } from '@onecx/angular-remote-components'
import {
  AUTH_SERVICE,
  IAuthService,
  PortalCoreModule,
  UserProfile,
  UserService
} from '@onecx/portal-integration-angular'
import { Observable, filter } from 'rxjs'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations'
import { animate, style, transition, trigger } from '@angular/animations'
import { RouterModule } from '@angular/router'

@Component({
  selector: 'app-user-avatar-menu',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    MenuModule,
    AvatarModule,
    RippleModule,
    PortalCoreModule,
    BrowserAnimationsModule,
    RouterModule
  ],
  providers: [provideAnimations()],
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
  items: MenuItem[] = []
  currentUser$: Observable<UserProfile>
  menuOpen = false
  removeDocumentClickListener: (() => void) | undefined

  constructor(
    @Inject(AUTH_SERVICE) private authService: IAuthService,
    private renderer: Renderer2,
    private userService: UserService
  ) {
    this.currentUser$ = this.userService.profile$
      .pipe(untilDestroyed(this))
      .pipe(filter((x) => x !== undefined)) as Observable<UserProfile>
  }

  ngOnInit() {
    this.ocxInitRemoteComponent({
      appId: 'workspace-ui',
      bffUrl: 'http://onecx-workspace-bff',
      permissions: [],
      productName: 'workspace'
    })
  }

  ngAfterViewInit() {
    // hides the horizontal submenus or top menu if outside is clicked
    this.removeDocumentClickListener = this.renderer.listen('body', 'click', () => {
      this.menuOpen = false
    })
  }

  ngOnDestroy() {
    this.removeDocumentClickListener?.()
  }

  ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.items = [
      {
        label: 'My personal info',
        routerLink: '/test',
        icon: PrimeIcons.USER
      }
    ]
  }

  handleAvatarClick(event: MouseEvent) {
    event.stopPropagation()
    event.preventDefault()
    this.menuOpen = !this.menuOpen
  }

  logout(event: Event) {
    event.preventDefault()
    this.authService.logout()
  }
}
