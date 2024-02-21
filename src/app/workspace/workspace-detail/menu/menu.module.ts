import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { TreeDragDropService } from 'primeng/api'

import { addInitializeModuleGuard, InitializeModuleGuard, PortalCoreModule } from '@onecx/portal-integration-angular'
import { SharedModule } from 'src/app/shared/shared.module'

import { MenuTreeService } from 'src/app/services/menu-tree.service'
import { MenuTreeComponent } from 'src/app/workspace/workspace-detail/menu/menu-tree/menu-tree.component'
import { MenuComponent } from 'src/app/workspace/workspace-detail/menu/menu.component'

const routes: Routes = [
  {
    path: '',
    component: MenuComponent
  }
]
@NgModule({
  declarations: [MenuComponent, MenuTreeComponent],
  imports: [
    CommonModule,
    FormsModule,
    PortalCoreModule.forMicroFrontend(),
    [RouterModule.forChild(addInitializeModuleGuard(routes))],
    SharedModule
  ],
  providers: [InitializeModuleGuard, MenuTreeService, TreeDragDropService],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class MenuModule {
  constructor() {
    console.info('Menu Module constructor')
  }
}
