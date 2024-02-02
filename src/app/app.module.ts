import { APP_INITIALIZER, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateService } from '@ngx-translate/core'
import { DialogService } from 'primeng/dynamicdialog'
import { Observable } from 'rxjs'

import { APP_CONFIG, PortalCoreModule } from '@onecx/portal-integration-angular'
import { KeycloakAuthModule } from '@onecx/keycloak-auth'

import { AppComponent } from './app.component'
import { environment } from '../environments/environment'

// standalone app: ensure translations are loaded during app init
function initializer(translate: TranslateService): () => Observable<any> {
  console.log('App module initializer')
  return () => {
    translate.addLangs(['en', 'de'])
    const browserLang = translate.getBrowserLang()
    return translate.use(browserLang?.match(/en|de/) ? browserLang : 'en')
  }
}

@NgModule({
  bootstrap: [AppComponent],
  declarations: [AppComponent],
  imports: [BrowserModule, KeycloakAuthModule, BrowserAnimationsModule, PortalCoreModule.forRoot('workspace-mgmt-ui')],
  providers: [
    DialogService,
    { provide: APP_CONFIG, useValue: environment },
    { provide: APP_INITIALIZER, useFactory: initializer, multi: true, deps: [TranslateService] }
  ],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}
