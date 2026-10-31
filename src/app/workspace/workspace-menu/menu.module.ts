import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { TreeTableModule } from 'primeng/treetable'
import { TreeDragDropService } from 'primeng/api'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'

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
  imports: [
    AngularAcceleratorModule,
    MenuComponent,
    MenuDetailComponent,
    MenuInternComponent,
    MenuImportComponent,
    MenuPreviewComponent,
    [RouterModule.forChild(routes)],
    SharedModule,
    TreeTableModule
  ],
  providers: [MenuTreeService, TreeDragDropService]
})
export class MenuModule {}
