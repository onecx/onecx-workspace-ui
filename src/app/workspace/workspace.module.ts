import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'

import { addInitializeModuleGuard, InitializeModuleGuard, PortalCoreModule } from '@onecx/portal-integration-angular'
import { SharedModule } from 'src/app/shared/shared.module'
import { LabelResolver } from 'src/app/shared/label.resolver'

import { WorkspaceSearchComponent } from 'src/app/workspace/workspace-search/workspace-search.component'
import { WorkspaceCreateComponent } from 'src/app/workspace/workspace-create/workspace-create.component'
import { WorkspaceImportComponent } from 'src/app/workspace/workspace-import/workspace-import.component'
import { ChooseFileComponent } from 'src/app/workspace/workspace-import/choose-file/choose-file.component'
import { PreviewComponent } from 'src/app/workspace/workspace-import/preview/preview.component'
import { ConfirmComponent } from 'src/app/workspace/workspace-import/confirm/confirm.component'

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
  providers: [InitializeModuleGuard],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class WorkspaceModule {
  constructor() {
    console.info('Workspace Module constructor')
  }
}
