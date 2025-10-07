import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, inject, Inject, Input } from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, map, ReplaySubject } from 'rxjs'

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
import { StaticMenuVisiblePublisher } from 'src/app/shared/topics/static-menu-visible.topic'

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
  private menuService = inject(MenuService)
  public isStaticMenuActive$ = this.menuService.isActive(MENU_MODE)
  public isStaticMenuVisible$: BehaviorSubject<boolean> = new BehaviorSubject(false)

  public icon$ = this.isStaticMenuVisible$.pipe(
    map((isVisible) => {
      if (document.documentElement.dir === 'rtl') {
        return isVisible ? 'pi-chevron-right' : 'pi-chevron-left'
      }

      return isVisible ? 'pi-chevron-left' : 'pi-chevron-right'
    })
  )

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    private readonly userService: UserService,
    private readonly translateService: TranslateService
  ) {
    this.userService.lang$.pipe(untilDestroyed(this)).subscribe((lang) => this.translateService.use(lang))
    this.menuService.isVisible(MENU_MODE).pipe(untilDestroyed(this)).subscribe(this.isStaticMenuVisible$)
  }

  @Input() set ocxRemoteComponentConfig(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
  }

  onMenuButtonClick(): void {
    const newStaticMenuVisibility = !this.isStaticMenuVisible$.getValue()
    new StaticMenuVisiblePublisher().publish({ isVisible: newStaticMenuVisibility })
  }
}
