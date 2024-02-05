import { CUSTOM_ELEMENTS_SCHEMA, Inject, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { ConfirmationService } from 'primeng/api'
import { ButtonModule } from 'primeng/button'
import { RippleModule } from 'primeng/ripple'
import { ImageModule } from 'primeng/image'
import { CardModule } from 'primeng/card'
import { ConfirmDialogModule } from 'primeng/confirmdialog'
import { FileUploadModule } from 'primeng/fileupload'
import { TreeTableModule } from 'primeng/treetable'
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'

import { MFE_INFO, MfeInfo, PortalCoreModule } from '@onecx/portal-integration-angular'

import { SharedModule, HttpLoaderFactory } from '../shared/shared.module'
import { LabelResolver } from '../shared/label.resolver'
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
    path: ':id',
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
    SharedModule,
    [RouterModule.forChild(routes)],
    PortalCoreModule.forMicroFrontend(),
    FormsModule,
    CardModule,
    FileUploadModule,
    ButtonModule,
    RippleModule,
    ImageModule,
    ConfirmDialogModule,
    TreeTableModule,
    TranslateModule.forChild({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient, MFE_INFO]
      }
    })
  ],
  providers: [ConfirmationService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WorkspaceModule {
  constructor(@Inject(MFE_INFO) mfeInfo: MfeInfo) {
    console.log(`Workspace Module constructor ${JSON.stringify(mfeInfo)}`)
  }
}
