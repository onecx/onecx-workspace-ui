import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { providePermissionService } from '@onecx/angular-utils'

import { LabelResolver } from 'src/app/shared/label.resolver'

import { WorkspaceSearchComponent } from './workspace-search/workspace-search.component'
import { WorkspaceDetailComponent } from './workspace-detail/workspace-detail.component'

const routes: Routes = [
  {
    path: '',
    component: WorkspaceSearchComponent,
    pathMatch: 'full'
  },
  {
    path: ':name',
    component: WorkspaceDetailComponent,
    runGuardsAndResolvers: 'paramsChange',
    data: {
      breadcrumb: 'BREADCRUMBS.DETAIL',
      breadcrumbFn: (data: { labeli18n: string }) => `${data.labeli18n}`
    },
    resolve: {
      labeli18n: LabelResolver
    }
  }
]
@NgModule({
  imports: [WorkspaceSearchComponent, WorkspaceDetailComponent, RouterModule.forChild(routes)],
  providers: [...providePermissionService()]
})
export class WorkspaceModule {}
