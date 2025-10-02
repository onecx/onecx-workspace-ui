import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, inject, Inject, Input } from '@angular/core'
import { UntilDestroy } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import { combineLatest, map, mergeMap, of, ReplaySubject } from 'rxjs'

import {
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { UserService } from '@onecx/angular-integration-interface'

import { createTranslateLoader, provideTranslationPathFromMeta } from '@onecx/angular-utils'
import { MenuService } from 'src/app/shared/services/menu.service'

enum Mode {
  SLIM = 'slim',
  SLIM_PLUS = 'slimplus',
  INACTIVE = 'inactive'
}

@Component({
  selector: 'app-slim-vertical-main-menu',
  templateUrl: './slim-vertical-main-menu.component.html',
  styleUrl: './slim-vertical-main-menu.component.scss',
  standalone: true,
  imports: [CommonModule, TranslateModule],
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
export class OneCXSlimVerticalMainMenuComponent implements ocxRemoteWebcomponent {
  Mode = Mode

  private readonly menuService = inject(MenuService)

  private isSlimMenuActive$ = this.menuService.isActive('slim')
  private isSlimPlusMenuActive$ = this.menuService.isActive('slimplus')

  // Assumption: only one menu can be active at a time
  public activeMode$ = combineLatest([this.isSlimMenuActive$, this.isSlimPlusMenuActive$]).pipe(
    map(([isSlimActive, isSlimPlusActive]) => {
      if (isSlimActive) {
        return Mode.SLIM
      }
      if (isSlimPlusActive) {
        return Mode.SLIM_PLUS
      }
      return Mode.INACTIVE
    })
  )

  // Hide the menu when inactive or when the active menu is not visible
  public isHidden$ = this.activeMode$.pipe(
    mergeMap((mode) => {
      if (mode === Mode.INACTIVE) {
        return of(true)
      }

      return this.menuService.isVisible(mode)
    }),
    map((isVisible) => !isVisible)
  )

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    private readonly userService: UserService,
    private readonly translateService: TranslateService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }

  @Input() set ocxRemoteComponentConfig(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
  }
}
