import { CUSTOM_ELEMENTS_SCHEMA, Inject, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
// import { HttpClient } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { ConfirmationService, TreeDragDropService } from 'primeng/api'
import { ConfirmDialogModule } from 'primeng/confirmdialog'
import { FileUploadModule } from 'primeng/fileupload'
import { TreeTableModule } from 'primeng/treetable'
// import { TranslateModule, TranslateLoader } from '@ngx-translate/core'

import { MFE_INFO, MfeInfo, PortalCoreModule } from '@onecx/portal-integration-angular'

import { SharedModule /* , HttpLoaderFactory */ } from '../../../shared/shared.module'
import { MenuTreeService } from '../../../services/menu-tree.service'
import { MenuTreeComponent } from './menu-tree/menu-tree.component'
import { MenuComponent } from './menu.component'

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
    SharedModule,
    [RouterModule.forChild(routes)],
    PortalCoreModule.forMicroFrontend(),
    FormsModule,
    FileUploadModule,
    ConfirmDialogModule,
    TreeTableModule
    // TranslateModule.forChild({
    //   isolate: true,
    //   loader: {
    //     provide: TranslateLoader,
    //     useFactory: HttpLoaderFactory,
    //     deps: [HttpClient, MFE_INFO]
    //   }
    // })
  ],
  providers: [ConfirmationService, PortalCoreModule, MenuTreeService, TreeDragDropService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MenuModule {
  constructor(@Inject(MFE_INFO) mfeInfo: MfeInfo) {
    console.log(`Portal Detail Menu Module constructor ${JSON.stringify(mfeInfo)}`)
  }
}
