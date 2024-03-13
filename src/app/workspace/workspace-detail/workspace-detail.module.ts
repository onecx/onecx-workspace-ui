import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'

import { addInitializeModuleGuard, InitializeModuleGuard, PortalCoreModule } from '@onecx/portal-integration-angular'
import { SharedModule } from 'src/app/shared/shared.module'
import { LabelResolver } from 'src/app/shared/label.resolver'

import { WorkspaceDetailComponent } from './workspace-detail.component'
import { WorkspacePropsComponent } from './workspace-props/workspace-props.component'
import { WorkspaceRolesComponent } from './workspace-roles/workspace-roles.component'
import { WorkspaceRoleDetailComponent } from '../workspace-role-detail/workspace-role-detail.component'
import { WorkspaceInternComponent } from './workspace-intern/workspace-intern.component'
import { WorkspaceContactComponent } from './workspace-contact/workspace-contact.component'
import { ProductComponent } from '../workspace-product/products.component'

const routes: Routes = [
  {
    path: '',
    component: WorkspaceDetailComponent
  },
  {
    path: 'menu',
    loadChildren: () => import('../workspace-menu/menu.module').then((m) => m.MenuModule),
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
    WorkspaceRoleDetailComponent,
    ProductComponent
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
export class WorkspaceDetailModule {
  constructor() {
    console.info('Workspace Detail Module constructor')
  }
}
