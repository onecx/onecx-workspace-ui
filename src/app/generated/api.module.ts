import { NgModule, ModuleWithProviders, SkipSelf, Optional } from '@angular/core'
import { Configuration } from './configuration'
import { HttpClient } from '@angular/common/http'

import { AdminUserInternalAPIService } from './api/adminUserInternal.service'
import { AvatarV1APIService } from './api/avatarV1.service'
import { FeedbackV1APIService } from './api/feedbackV1.service'
import { ImageV1APIService } from './api/imageV1.service'
import { MenuItemsInternalAPIService } from './api/menuItemsInternal.service'
import { MicrofrontendRegistrationInternalAPIService } from './api/microfrontendRegistrationInternal.service'
import { MicrofrontendV1APIService } from './api/microfrontendV1.service'
import { PortalImportRequestV1APIService } from './api/portalImportRequestV1.service'
import { PortalInternalAPIService } from './api/portalInternal.service'
import { PortalItemsV1APIService } from './api/portalItemsV1.service'
import { PortalLegacyAPIService } from './api/portalLegacy.service'
import { PortalV1APIService } from './api/portalV1.service'
import { SupportTicketV1APIService } from './api/supportTicketV1.service'
import { ThemesAPIService } from './api/themes.service'
import { UserInfoV1APIService } from './api/userInfoV1.service'
import { UserProfileV1APIService } from './api/userProfileV1.service'

@NgModule({
  imports: [],
  declarations: [],
  exports: [],
  providers: [],
})
export class ApiModule {
  public static forRoot(configurationFactory: () => Configuration): ModuleWithProviders<ApiModule> {
    return {
      ngModule: ApiModule,
      providers: [{ provide: Configuration, useFactory: configurationFactory }],
    }
  }

  constructor(@Optional() @SkipSelf() parentModule: ApiModule, @Optional() http: HttpClient) {
    if (parentModule) {
      throw new Error('ApiModule is already loaded. Import in your base AppModule only.')
    }
    if (!http) {
      throw new Error(
        'You need to import the HttpClientModule in your AppModule! \n' +
          'See also https://github.com/angular/angular/issues/20575'
      )
    }
  }
}
