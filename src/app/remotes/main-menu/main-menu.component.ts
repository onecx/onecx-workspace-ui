import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Inject } from '@angular/core'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { RouterModule } from '@angular/router'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import { AppConfigService } from '@onecx/angular-accelerator'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  ocxRemoteComponent,
  provideTranslateServiceForRoot,
  RemoteComponentConfig
} from '@onecx/angular-remote-components'
import { createRemoteComponentTranslateLoader, PortalCoreModule, UserService } from '@onecx/portal-integration-angular'
import { ReplaySubject } from 'rxjs'
import { SharedModule } from 'src/app/shared/shared.module'

@Component({
  selector: 'app-main-menu',
  standalone: true,
  imports: [
    AngularRemoteComponentsModule,
    CommonModule,
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
    }),
    AppConfigService
  ],
  templateUrl: './main-menu.component.html'
})
export class OneCXMainMenuComponent implements ocxRemoteComponent {
  constructor(
    private appConfigService: AppConfigService,
    @Inject(BASE_URL) private baseUrl: ReplaySubject<string>,
    private userService: UserService,
    private translateService: TranslateService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }

  ocxInitRemoteComponent(config: RemoteComponentConfig) {
    this.baseUrl.next(config.baseUrl)
    this.appConfigService.init(config['baseUrl'])
  }
}
