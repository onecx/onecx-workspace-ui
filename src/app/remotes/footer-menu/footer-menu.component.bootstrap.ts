import { importProvidersFrom } from '@angular/core'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { provideRouter } from '@angular/router'
import { MissingTranslationHandler, TranslateLoader } from '@ngx-translate/core'
import { ReplaySubject } from 'rxjs'

import { AngularAuthModule } from '@onecx/angular-auth'
import { AngularAcceleratorModule, AngularAcceleratorMissingTranslationHandler } from '@onecx/angular-accelerator'
import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import { provideTranslateServiceForRoot } from '@onecx/angular-remote-components'
import {
  createTranslateLoader,
  provideTranslationPathFromMeta,
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig
} from '@onecx/angular-utils'

import { environment } from 'src/environments/environment'
import { OneCXFooterMenuComponent } from './footer-menu.component'

bootstrapRemoteComponent(OneCXFooterMenuComponent, 'ocx-footer-menu-component', environment.production, [
  {
    provide: REMOTE_COMPONENT_CONFIG,
    useValue: new ReplaySubject<RemoteComponentConfig>(1)
  },
  importProvidersFrom(AngularAcceleratorModule, AngularAuthModule, BrowserAnimationsModule),
  provideHttpClient(withInterceptorsFromDi()),
  provideRouter([]),
  provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/'),
  provideTranslateServiceForRoot({
    isolate: true,
    loader: {
      provide: TranslateLoader,
      useFactory: createTranslateLoader,
      deps: [HttpClient]
    },
    missingTranslationHandler: {
      provide: MissingTranslationHandler,
      useClass: AngularAcceleratorMissingTranslationHandler
    }
  })
])
