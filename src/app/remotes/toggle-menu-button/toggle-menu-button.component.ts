import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, inject, Inject, Input } from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import { Observable, ReplaySubject } from 'rxjs'

import {
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { UserService } from '@onecx/angular-integration-interface'

import { MenuService } from 'src/app/shared/services/menu.service'
import { TooltipModule } from 'primeng/tooltip'
import { RippleModule } from 'primeng/ripple'
import { createTranslateLoader, provideTranslationPathFromMeta } from '@onecx/angular-utils'
import { StaticMenuStatePublisher } from 'src/app/shared/topics/static-menu-state.topic'

const MENU_MODE = 'static'

@Component({
  selector: 'app-toggle-menu-button',
  templateUrl: './toggle-menu-button.component.html',
  styleUrl: './toggle-menu-button.component.scss',
  standalone: true,
  imports: [CommonModule, TranslateModule, TooltipModule, RippleModule],
  providers: [
    {
      provide: BASE_URL,
      useValue: new ReplaySubject<string>(1)
    },
    provideTranslateServiceForRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    }),
    provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/')
  ]
})
@UntilDestroy()
export class OneCXToggleMenuButtonComponent implements ocxRemoteWebcomponent {
  private readonly menuService = inject(MenuService)
  public isStaticMenuActive$: Observable<boolean>
  public isStaticMenuVisible$: Observable<boolean>

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    private readonly userService: UserService,
    private readonly translateService: TranslateService
  ) {
    this.userService.lang$.pipe(untilDestroyed(this)).subscribe((lang) => this.translateService.use(lang))

    this.isStaticMenuActive$ = this.menuService.isActive(MENU_MODE).pipe(untilDestroyed(this))

    this.isStaticMenuVisible$ = this.menuService.isVisible(MENU_MODE).pipe(untilDestroyed(this))
  }

  @Input() set ocxRemoteComponentConfig(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
  }

  onMenuButtonClick(isVisible: boolean | null): void {
    if (isVisible === null) return
    new StaticMenuStatePublisher().publish({ isVisible: !isVisible })
  }

  getIcon(isStaticMenuVisible: boolean) {
    if (document.documentElement.dir === 'rtl') {
      return isStaticMenuVisible ? 'pi-chevron-right' : 'pi-chevron-left'
    }

    return isStaticMenuVisible ? 'pi-chevron-left' : 'pi-chevron-right'
  }
}
