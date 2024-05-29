import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'

import { PortalCoreModule } from '@onecx/portal-integration-angular'
import { addInitializeModuleGuard, InitializeModuleGuard } from '@onecx/angular-integration-interface'
import { SharedModule } from 'src/app/shared/shared.module'
import { LabelResolver } from 'src/app/shared/label.resolver'

import { WorkspaceSearchComponent } from './workspace-search/workspace-search.component'
import { WorkspaceCreateComponent } from './workspace-create/workspace-create.component'
import { WorkspaceImportComponent } from './workspace-import/workspace-import.component'
import { ChooseFileComponent } from './workspace-import/choose-file/choose-file.component'
import { PreviewComponent } from './workspace-import/preview/preview.component'
import { ConfirmComponent } from './workspace-import/confirm/confirm.component'

const routes: Routes = [
  {
    path: '',
    component: WorkspaceSearchComponent,
    pathMatch: 'full'
  },
  {
    path: 'new',
    component: WorkspaceCreateComponent
  },
  {
    path: ':name',
    loadChildren: () => import('./workspace-detail/workspace-detail.module').then((m) => m.WorkspaceDetailModule),
    data: {
      breadcrumb: 'BREADCRUMBS.DETAIL',
      breadcrumbFn: (data: any) => `${data.labeli18n}`
    },
    resolve: {
      labeli18n: LabelResolver
    }
  }
]
@NgModule({
  declarations: [
    WorkspaceSearchComponent,
    WorkspaceCreateComponent,
    WorkspaceImportComponent,
    ChooseFileComponent,
    PreviewComponent,
    ConfirmComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    PortalCoreModule.forMicroFrontend(),
    [RouterModule.forChild(addInitializeModuleGuard(routes))],
    SharedModule
  ],
  providers: [InitializeModuleGuard]
})
export class WorkspaceModule {
  constructor() {
    console.info('Workspace Module constructor')
  }
}
