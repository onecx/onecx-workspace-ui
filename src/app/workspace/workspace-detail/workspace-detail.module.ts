import { CUSTOM_ELEMENTS_SCHEMA, Inject, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
// import { HttpClient } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { ConfirmationService } from 'primeng/api'
// import { TranslateModule, TranslateLoader } from '@ngx-translate/core'

import { MFE_INFO, MfeInfo, PortalCoreModule } from '@onecx/portal-integration-angular'

import { SharedModule /* , HttpLoaderFactory */ } from '../../shared/shared.module'
import { LabelResolver } from '../../shared/label.resolver'
import { WorkspaceDetailComponent } from './workspace-detail.component'
import { WorkspacePropsComponent } from './workspace-props/workspace-props.component'
import { WorkspaceRolesComponent } from './workspace-roles/workspace-roles.component'
import { WorkspaceInternComponent } from './workspace-intern/workspace-intern.component'
import { WorkspaceImagesComponent } from './workspace-images/workspace-images.component'
import { WorkspaceContactComponent } from './workspace-contact/workspace-contact.component'
// import { WorkspaceSubjectComponent } from './workspace-subjects/workspace-subjects.component'
import { LogoComponent } from './workspace-images/logo/logo.component'
// import { MfeRegistrationsComponent } from './mfe-registrations/mfe-registrations.component'

const routes: Routes = [
  {
    path: '',
    component: WorkspaceDetailComponent
  },
  {
    path: 'menu',
    loadChildren: () => import('./menu/menu.module').then((m) => m.MenuModule),
    data: {
      breadcrumb: 'BREADCRUMBS.MENU',
      breadcrumbFn: (data: any) => `${data.labeli18n}`
    },
    resolve: {
      labeli18n: LabelResolver
    }
  }
]

@NgModule({
  declarations: [
    WorkspaceDetailComponent,
    WorkspacePropsComponent,
    WorkspaceContactComponent,
    WorkspaceInternComponent,
    WorkspaceRolesComponent,
    WorkspaceImagesComponent,
    // WorkspaceSubjectComponent,
    // MfeRegistrationsComponent,
    LogoComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    [RouterModule.forChild(routes)],
    PortalCoreModule.forMicroFrontend(),
    FormsModule
    // TranslateModule.forChild({
    //   isolate: true,
    //   loader: {
    //     provide: TranslateLoader,
    //     useFactory: HttpLoaderFactory,
    //     deps: [HttpClient, MFE_INFO]
    //   }
    // })
  ],
  providers: [ConfirmationService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WorkspaceDetailModule {
  constructor(@Inject(MFE_INFO) mfeInfo: MfeInfo) {
    console.log(`Workspace Detail Module constructor ${JSON.stringify(mfeInfo)}`)
  }
}
