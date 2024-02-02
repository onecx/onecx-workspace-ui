import { Inject, NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { MFE_INFO, MfeInfo, PortalCoreModule } from '@onecx/portal-integration-angular'

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./workspace/workspace.module').then((m) => m.WorkspaceModule)
  }
]
@NgModule({
  imports: [PortalCoreModule.forMicroFrontend(), RouterModule.forChild(routes)],
  exports: [],
  providers: [],
  schemas: []
})
export class WorkspaceMgmtModule {
  constructor(@Inject(MFE_INFO) mfeInfo?: MfeInfo) {
    console.info('Workspace Mgmt Module constructor', mfeInfo)
  }
}
