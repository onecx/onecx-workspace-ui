import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'

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
  imports: [AngularAcceleratorModule, [RouterModule.forChild(routes)]],
  providers: [LabelResolver]
})
export class WorkspaceDetailModule {}
