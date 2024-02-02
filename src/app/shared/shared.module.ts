import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import {
  MissingTranslationHandler,
  MissingTranslationHandlerParams,
  TranslateLoader,
  TranslateModule,
  TranslateService
} from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { ErrorTailorModule } from '@ngneat/error-tailor'

import { AutoCompleteModule } from 'primeng/autocomplete'
import { BadgeModule } from 'primeng/badge'
import { CheckboxModule } from 'primeng/checkbox'
import { ConfirmPopupModule } from 'primeng/confirmpopup'
import { ConfirmationService, MessageService } from 'primeng/api'
import { DataViewModule } from 'primeng/dataview'
import { DialogModule } from 'primeng/dialog'
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog'
import { DropdownModule } from 'primeng/dropdown'
import { FileUploadModule } from 'primeng/fileupload'
import { InputTextModule } from 'primeng/inputtext'
import { InputTextareaModule } from 'primeng/inputtextarea'
import { KeyFilterModule } from 'primeng/keyfilter'
import { ListboxModule } from 'primeng/listbox'
import { MultiSelectModule } from 'primeng/multiselect'
import { OverlayPanelModule } from 'primeng/overlaypanel'
import { PanelModule } from 'primeng/panel'
import { SelectButtonModule } from 'primeng/selectbutton'
import { StepsModule } from 'primeng/steps'
import { TabViewModule } from 'primeng/tabview'
import { TableModule } from 'primeng/table'
import { ToastModule } from 'primeng/toast'
import { TreeModule } from 'primeng/tree'

import {
  MfeInfo,
  MFE_INFO,
  PortalDialogService,
  PortalMessageService,
  TranslateCombinedLoader
} from '@onecx/portal-integration-angular'

import { environment } from '../../environments/environment'
import { BASE_PATH } from './generated'
import { LabelResolver } from './label.resolver'
import { ImageContainerComponent } from './image-container/image-container.component'
import { ThemeColorBoxComponent } from './theme-color-box/theme-color-box.component'

export const basePathProvider = (mfeInfo: MfeInfo) => {
  /* console.log(
    'Base path provider: ' + (mfeInfo ? mfeInfo.remoteBaseUrl + '' + environment.apiPrefix : '' + environment.apiPrefix)
  ) */
  return (mfeInfo ? mfeInfo.remoteBaseUrl : '') + environment.apiPrefix
}

export function HttpLoaderFactory(http: HttpClient, mfeInfo: MfeInfo) {
  // console.log(`Configuring translation loader ${mfeInfo?.remoteBaseUrl}`)
  // if running standalone then load the app assets directly from remote base URL
  const appAssetPrefix = mfeInfo?.remoteBaseUrl ? mfeInfo.remoteBaseUrl : './'
  return new TranslateCombinedLoader(
    new TranslateHttpLoader(http, appAssetPrefix + 'assets/i18n/', '.json'),
    new TranslateHttpLoader(http, appAssetPrefix + 'onecx-portal-lib/assets/i18n/', '.json')
  )
}

export class MyMissingTranslationHandler implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams) {
    console.log(`Missing translation for ${params.key}`)
    return params.key
  }
}

@NgModule({
  declarations: [ImageContainerComponent, ThemeColorBoxComponent],
  imports: [
    AutoCompleteModule,
    BadgeModule,
    CheckboxModule,
    CommonModule,
    ConfirmPopupModule,
    DataViewModule,
    DialogModule,
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
    ReactiveFormsModule,
    SelectButtonModule,
    StepsModule,
    TabViewModule,
    TableModule,
    ToastModule,
    TreeModule,
    TranslateModule.forRoot({
      isolate: true,
      loader: { provide: TranslateLoader, useFactory: HttpLoaderFactory, deps: [HttpClient, MFE_INFO] },
      missingTranslationHandler: { provide: MissingTranslationHandler, useClass: MyMissingTranslationHandler }
    }),
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
    CommonModule,
    ConfirmPopupModule,
    DataViewModule,
    DialogModule,
    DropdownModule,
    DynamicDialogModule,
    ErrorTailorModule,
    FileUploadModule,
    FormsModule,
    ImageContainerComponent,
    InputTextModule,
    InputTextareaModule,
    KeyFilterModule,
    ListboxModule,
    MultiSelectModule,
    OverlayPanelModule,
    PanelModule,
    ReactiveFormsModule,
    SelectButtonModule,
    StepsModule,
    TabViewModule,
    TableModule,
    ThemeColorBoxComponent,
    ToastModule,
    TranslateModule,
    TreeModule
  ],
  //this is not elegant, for some reason the injection token from primeng does not work across federated module
  providers: [
    ConfirmationService,
    LabelResolver,
    { provide: MessageService, useExisting: PortalMessageService },
    { provide: DialogService, useClass: PortalDialogService },
    {
      provide: BASE_PATH,
      useFactory: basePathProvider,
      deps: [MFE_INFO]
    }
  ]
})
export class SharedModule {}
