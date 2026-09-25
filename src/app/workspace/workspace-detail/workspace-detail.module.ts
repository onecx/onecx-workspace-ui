import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule, Routes } from '@angular/router'
import { DividerModule } from 'primeng/divider'
import { PickListModule } from 'primeng/picklist'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'

import { SharedModule } from 'src/app/shared/shared.module'
import { LabelResolver } from 'src/app/shared/label.resolver'

import { WorkspaceDetailComponent } from './workspace-detail.component'

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
  imports: [
    CommonModule,
    AngularAcceleratorModule,
    [RouterModule.forChild(routes)],
    SharedModule,
    DividerModule,
    PickListModule
  ]
})
export class WorkspaceDetailModule {}
