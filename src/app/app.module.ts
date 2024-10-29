import { APP_INITIALIZER, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { RouterModule, Routes } from '@angular/router'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'

import { KeycloakAuthModule } from '@onecx/keycloak-auth'
import { createTranslateLoader } from '@onecx/angular-accelerator'
import { APP_CONFIG, AppStateService, UserService } from '@onecx/angular-integration-interface'
import { translateServiceInitializer, PortalCoreModule } from '@onecx/portal-integration-angular'

import { environment } from 'src/environments/environment'
import { AppComponent } from './app.component'

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./workspace/workspace.module').then((m) => m.WorkspaceModule)
  }
]

@NgModule({
  bootstrap: [AppComponent],
  declarations: [AppComponent],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    KeycloakAuthModule,
    PortalCoreModule.forRoot('onecx-workspace-ui'),
    RouterModule.forRoot(routes, {
      initialNavigation: 'enabledBlocking',
      enableTracing: true
    }),
    TranslateModule.forRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient, AppStateService]
      }
    })
  ],
  providers: [
    { provide: APP_CONFIG, useValue: environment },
    {
      provide: APP_INITIALIZER,
      useFactory: translateServiceInitializer,
      multi: true,
      deps: [UserService, TranslateService]
    },
    provideHttpClient(withInterceptorsFromDi())
  ]
})
export class AppModule {
  constructor() {
    console.info('OneCX Workspace Module constructor')
  }
}
