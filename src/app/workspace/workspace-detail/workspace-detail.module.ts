import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { FieldsetModule } from 'primeng/fieldset'

import { PortalCoreModule } from '@onecx/portal-integration-angular'
import { addInitializeModuleGuard, InitializeModuleGuard } from '@onecx/angular-integration-interface'
import { SharedModule } from 'src/app/shared/shared.module'
import { LabelResolver } from 'src/app/shared/label.resolver'

import { WorkspaceDetailComponent } from './workspace-detail.component'
import { WorkspacePropsComponent } from './workspace-props/workspace-props.component'
import { WorkspaceInternComponent } from './workspace-intern/workspace-intern.component'
import { WorkspaceContactComponent } from './workspace-contact/workspace-contact.component'
import { WorkspaceRolesComponent } from './workspace-roles/workspace-roles.component'
import { WorkspaceRoleDetailComponent } from '../workspace-role-detail/workspace-role-detail.component'
import { WorkspaceSlotsComponent } from './workspace-slots/workspace-slots.component'
import { WorkspaceSlotDetailComponent } from './workspace-slot-detail/workspace-slot-detail.component'
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
    WorkspaceSlotsComponent,
    WorkspaceSlotDetailComponent,
    ProductComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    FieldsetModule,
    PortalCoreModule.forMicroFrontend(),
    [RouterModule.forChild(addInitializeModuleGuard(routes))],
    SharedModule
  ],
  providers: [InitializeModuleGuard]
})
export class WorkspaceDetailModule {
  constructor() {
    console.info('Workspace Detail Module constructor')
  }
}
