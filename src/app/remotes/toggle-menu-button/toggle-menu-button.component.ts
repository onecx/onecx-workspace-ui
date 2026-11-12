import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { combineLatest, map, Observable, ReplaySubject } from 'rxjs'

import { TooltipModule } from 'primeng/tooltip'
import { RippleModule } from 'primeng/ripple'

import { RemoteComponentConfig, ocxRemoteWebcomponent } from '@onecx/angular-remote-components'
import { Capability, ShellCapabilityService, UserService } from '@onecx/angular-integration-interface'
import { REMOTE_COMPONENT_CONFIG } from '@onecx/angular-utils'

import { MenuService } from 'src/app/shared/services/menu.service'
import { StaticMenuStatePublisher } from 'src/app/shared/topics/static-menu-state.topic'

const MENU_MODE = 'static'

@Component({
  selector: 'app-toggle-menu-button',
  standalone: true,
  imports: [AsyncPipe, TranslateModule, TooltipModule, RippleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toggle-menu-button.component.html',
  styleUrls: ['./toggle-menu-button.component.scss']
})
export class OneCXToggleMenuButtonComponent implements ocxRemoteWebcomponent {
  private readonly destroyRef = inject(DestroyRef)
  public readonly remoteComponentConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly userService = inject(UserService)
  private readonly translateService = inject(TranslateService)

  private readonly menuService = inject(MenuService)
  private readonly shellCapabilityService = inject(ShellCapabilityService)
  private staticMenuStatePublisher = new StaticMenuStatePublisher() // NOSONAR
  public isStaticMenuActive$: Observable<boolean>
  public isStaticMenuVisible$: Observable<boolean>
  public isActive$: Observable<boolean>

  constructor() {
    this.userService.lang$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lang) => this.translateService.use(lang))
    this.isStaticMenuActive$ = this.menuService.isActive(MENU_MODE).pipe(takeUntilDestroyed(this.destroyRef))
    this.isStaticMenuVisible$ = this.menuService.isVisible(MENU_MODE).pipe(takeUntilDestroyed(this.destroyRef))

    // Wait for both infos to determine if the button should be shown
    this.isActive$ = combineLatest([this.isStaticMenuActive$, this.isStaticMenuVisible$]).pipe(
      takeUntilDestroyed(this.destroyRef),
      map(([staticMenuActive, _staticMenuVisible]) => {
        return staticMenuActive && this.shellCapabilityService.hasCapability(Capability.ACTIVENESS_AWARE_MENUS)
      })
    )
  }

  @Input() set ocxRemoteComponentConfig(rcConfig: RemoteComponentConfig) {
    this.remoteComponentConfig.next(rcConfig)
  }

  onMenuButtonClick(isVisible: boolean | null): void {
    if (isVisible === null) return
    this.staticMenuStatePublisher.publish({ isVisible: !isVisible })
  }

  getIcon(isStaticMenuVisible: boolean | null) {
    if (isStaticMenuVisible === null) return ''

    if (document.documentElement.dir === 'rtl') {
      return isStaticMenuVisible ? 'pi-chevron-right' : 'pi-chevron-left'
    }

    return isStaticMenuVisible ? 'pi-chevron-left' : 'pi-chevron-right'
  }
}
