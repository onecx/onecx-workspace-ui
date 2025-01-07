import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule, Routes } from '@angular/router'
import { TreeTableModule } from 'primeng/treetable'
import { TreeDragDropService } from 'primeng/api'

import { PortalCoreModule } from '@onecx/portal-integration-angular'
import { addInitializeModuleGuard, InitializeModuleGuard } from '@onecx/angular-integration-interface'

import { SharedModule } from 'src/app/shared/shared.module'

import { MenuTreeService } from './services/menu-tree.service'
import { MenuComponent } from './menu.component'
import { MenuDetailComponent } from './menu-detail/menu-detail.component'
import { MenuInternComponent } from './menu-intern/menu-intern.component'
import { MenuPreviewComponent } from './menu-preview/menu-preview.component'
import { MenuImportComponent } from './menu-import/menu-import.component'

const routes: Routes = [
  {
    path: '',
    component: MenuComponent
  }
]
@NgModule({
  declarations: [MenuComponent, MenuDetailComponent, MenuInternComponent, MenuImportComponent, MenuPreviewComponent],
  imports: [
    CommonModule,
    PortalCoreModule.forMicroFrontend(),
    [RouterModule.forChild(addInitializeModuleGuard(routes))],
    SharedModule,
    TreeTableModule
  ],
  providers: [InitializeModuleGuard, MenuTreeService, TreeDragDropService]
})
export class MenuModule {
  constructor() {
    console.info('Workspace Menu Module constructor')
  }
}
