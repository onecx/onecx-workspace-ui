import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { ColorSketchModule } from 'ngx-color/sketch'
import { ErrorTailorModule } from '@ngneat/error-tailor'

import { AutoCompleteModule } from 'primeng/autocomplete'
import { BadgeModule } from 'primeng/badge'
import { CheckboxModule } from 'primeng/checkbox'
import { CalendarModule } from 'primeng/calendar'
import { ConfirmDialogModule } from 'primeng/confirmdialog'
import { ConfirmPopupModule } from 'primeng/confirmpopup'
import { ConfirmationService } from 'primeng/api'
import { DataViewModule } from 'primeng/dataview'
import { DialogModule } from 'primeng/dialog'
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog'
import { DividerModule } from 'primeng/divider'
import { DropdownModule } from 'primeng/dropdown'
import { FileUploadModule } from 'primeng/fileupload'
import { InputTextModule } from 'primeng/inputtext'
import { InputTextareaModule } from 'primeng/inputtextarea'
import { KeyFilterModule } from 'primeng/keyfilter'
import { ListboxModule } from 'primeng/listbox'
import { MultiSelectModule } from 'primeng/multiselect'
import { OverlayPanelModule } from 'primeng/overlaypanel'
import { PanelModule } from 'primeng/panel'
import { PickListModule } from 'primeng/picklist'
import { SelectButtonModule } from 'primeng/selectbutton'
import { StepsModule } from 'primeng/steps'
import { TabViewModule } from 'primeng/tabview'
import { TableModule } from 'primeng/table'
import { ToastModule } from 'primeng/toast'
import { TreeModule } from 'primeng/tree'
import { TreeTableModule } from 'primeng/treetable'

import {
  AppStateService,
  ConfigurationService,
  PortalDialogService,
  PortalApiConfiguration
} from '@onecx/portal-integration-angular'

import { Configuration } from 'src/app/shared/generated'
import { environment } from 'src/environments/environment'
import { LabelResolver } from 'src/app/shared/label.resolver'

import { ImageContainerComponent } from './image-container/image-container.component'

export function apiConfigProvider(configService: ConfigurationService, appStateService: AppStateService) {
  return new PortalApiConfiguration(Configuration, environment.apiPrefix, configService, appStateService)
}

@NgModule({
  declarations: [ImageContainerComponent],
  imports: [
    AutoCompleteModule,
    BadgeModule,
    CheckboxModule,
    CalendarModule,
    ColorSketchModule,
    CommonModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    DataViewModule,
    DialogModule,
    DividerModule,
    DropdownModule,
    DynamicDialogModule,
    FileUploadModule,
    FormsModule,
    InputTextModule,
    InputTextareaModule,
    KeyFilterModule,
    ListboxModule,
    MultiSelectModule,
    OverlayPanelModule,
    PanelModule,
    PickListModule,
    ReactiveFormsModule,
    SelectButtonModule,
    StepsModule,
    TabViewModule,
    TableModule,
    ToastModule,
    TreeModule,
    TreeTableModule,
    TranslateModule,
    ErrorTailorModule.forRoot({
      controlErrorsOn: { async: true, blur: true, change: true },
      errors: {
        useFactory: (i18n: TranslateService) => {
          return {
            required: () => i18n.instant('VALIDATION.ERRORS.EMPTY_REQUIRED_FIELD'),
            maxlength: ({ requiredLength }) =>
              i18n.instant('VALIDATION.ERRORS.MAXIMUM_LENGTH').replace('{{chars}}', requiredLength),
            minlength: ({ requiredLength }) =>
              i18n.instant('VALIDATION.ERRORS.MINIMUM_LENGTH').replace('{{chars}}', requiredLength),
            pattern: () => i18n.instant('VALIDATION.ERRORS.PATTERN_ERROR')
          }
        },
        deps: [TranslateService]
      },
      //this is required because primeng calendar wraps things in an ugly way
      blurPredicate: (element: Element) => {
        return ['INPUT', 'TEXTAREA', 'SELECT', 'CUSTOM-DATE', 'P-CALENDAR', 'P-DROPDOWN'].some(
          (selector) => element.tagName === selector
        )
      }
    })
  ],
  exports: [
    AutoCompleteModule,
    BadgeModule,
    CheckboxModule,
    CalendarModule,
    ColorSketchModule,
    CommonModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    DataViewModule,
    DialogModule,
    DividerModule,
    DropdownModule,
    DynamicDialogModule,
    FileUploadModule,
    FormsModule,
    InputTextModule,
    InputTextareaModule,
    KeyFilterModule,
    ListboxModule,
    MultiSelectModule,
    OverlayPanelModule,
    PanelModule,
    PickListModule,
    ReactiveFormsModule,
    SelectButtonModule,
    StepsModule,
    TabViewModule,
    TableModule,
    ToastModule,
    TreeModule,
    TreeTableModule,
    TranslateModule,
    ErrorTailorModule,
    ImageContainerComponent
  ],
  //this is not elegant, for some reason the injection token from primeng does not work across federated module
  providers: [
    ConfirmationService,
    LabelResolver,
    { provide: DialogService, useClass: PortalDialogService },
    { provide: Configuration, useFactory: apiConfigProvider, deps: [ConfigurationService, AppStateService] }
  ],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule {}
