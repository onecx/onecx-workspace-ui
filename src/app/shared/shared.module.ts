import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'

import { AutoCompleteModule } from 'primeng/autocomplete'
import { ButtonModule } from 'primeng/button'
import { MessageModule } from 'primeng/message'
import { CheckboxModule } from 'primeng/checkbox'
import { ConfirmDialogModule } from 'primeng/confirmdialog'
import { ConfirmPopupModule } from 'primeng/confirmpopup'
import { ConfirmationService } from 'primeng/api'
import { DataViewModule } from 'primeng/dataview'
import { DividerModule } from 'primeng/divider'
import { DialogModule } from 'primeng/dialog'
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog'
import { DropdownModule } from 'primeng/dropdown'
import { FloatLabelModule } from 'primeng/floatlabel'
import { FileUploadModule } from 'primeng/fileupload'
import { InputGroupModule } from 'primeng/inputgroup'
import { InputGroupAddonModule } from 'primeng/inputgroupaddon'
import { InputTextModule } from 'primeng/inputtext'
import { TextareaModule } from 'primeng/textarea'
import { KeyFilterModule } from 'primeng/keyfilter'
import { ListboxModule } from 'primeng/listbox'
import { PanelModule } from 'primeng/panel'
import { PickListModule } from 'primeng/picklist'
import { SelectModule } from 'primeng/select'
import { SelectButtonModule } from 'primeng/selectbutton'
import { TabsModule } from 'primeng/tabs'
import { TableModule } from 'primeng/table'
import { ToastModule } from 'primeng/toast'
import { ToggleButtonModule } from 'primeng/togglebutton'
import { TooltipModule } from 'primeng/tooltip'
import { TreeModule } from 'primeng/tree'
import { TreeTableModule } from 'primeng/treetable'
import { StepsModule } from 'primeng/steps'

import { AngularAcceleratorModule, PortalDialogService } from '@onecx/angular-accelerator'

import { LabelResolver } from './label.resolver'

@NgModule({
  imports: [
    DividerModule,
    AngularAcceleratorModule,
    AutoCompleteModule,
    PickListModule,
    CheckboxModule,
    CommonModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    DataViewModule,
    DialogModule,
    DropdownModule,
    DynamicDialogModule,
    FloatLabelModule,
    FileUploadModule,
    FormsModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    TextareaModule,
    KeyFilterModule,
    ListboxModule,
    PanelModule,
    ReactiveFormsModule,
    RouterModule,
    SelectModule,
    SelectButtonModule,
    TabsModule,
    TableModule,
    ToastModule,
    ToggleButtonModule,
    TooltipModule,
    TreeModule,
    TreeTableModule,
    StepsModule,
    FileUploadModule,
    TranslateModule,
    ButtonModule,
    MessageModule
  ],
  exports: [
    AngularAcceleratorModule,
    AutoCompleteModule,
    PickListModule,
    CheckboxModule,
    CommonModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    DividerModule,
    DataViewModule,
    DialogModule,
    DropdownModule,
    DynamicDialogModule,
    FloatLabelModule,
    FileUploadModule,
    FormsModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    TextareaModule,
    KeyFilterModule,
    ListboxModule,
    PanelModule,
    ReactiveFormsModule,
    SelectModule,
    SelectButtonModule,
    TableModule,
    TabsModule,
    ToastModule,
    ToggleButtonModule,
    TooltipModule,
    TreeModule,
    TreeTableModule,
    TranslateModule,
    RouterModule,
    FileUploadModule,
    StepsModule,
    ButtonModule,
    MessageModule
  ],
  //this is not elegant, for some reason the injection token from primeng does not work across federated module
  providers: [ConfirmationService, LabelResolver, { provide: DialogService, useClass: PortalDialogService }]
})
export class SharedModule {}
