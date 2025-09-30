import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Inject, Input } from '@angular/core'
import { UntilDestroy } from '@ngneat/until-destroy'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import { ReplaySubject } from 'rxjs'

import {
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { UserService } from '@onecx/angular-integration-interface'

import { createTranslateLoader, provideTranslationPathFromMeta } from '@onecx/angular-utils'

@Component({
  selector: 'app-slim-user-main-menu',
  templateUrl: './slim-user-menu.component.html',
  styleUrl: './slim-user-menu.component.scss',
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
export class OneCXSlimUserMenuComponent implements ocxRemoteWebcomponent {
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
