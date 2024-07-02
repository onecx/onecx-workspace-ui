import { NgModule } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { RouterModule, Routes } from '@angular/router'
import { MissingTranslationHandler, TranslateLoader, TranslateModule } from '@ngx-translate/core'

import { createTranslateLoader } from '@onecx/angular-accelerator'
import { PortalCoreModule, PortalMissingTranslationHandler } from '@onecx/portal-integration-angular'
import { addInitializeModuleGuard, AppStateService, ConfigurationService } from '@onecx/angular-integration-interface'

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./workspace/workspace.module').then((m) => m.WorkspaceModule)
  }
]
@NgModule({
  imports: [
    PortalCoreModule.forMicroFrontend(),
    RouterModule.forChild(addInitializeModuleGuard(routes)),
    TranslateModule.forRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient, AppStateService]
      },
      missingTranslationHandler: { provide: MissingTranslationHandler, useClass: PortalMissingTranslationHandler }
    })
  ],
  exports: [],
  providers: [ConfigurationService],
  schemas: []
})
export class OneCXWorkspaceModule {
  constructor() {
    console.info('OneCX Workspace Module constructor')
  }
}
