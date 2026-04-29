import { Component, inject, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { UntilDestroy } from '@ngneat/until-destroy'
import { combineLatest, from, map, Observable, ReplaySubject } from 'rxjs'

import { AngularAcceleratorModule, createRemoteComponentTranslateLoader } from '@onecx/angular-accelerator'
import { AppStateService, ConfigurationService, UserService } from '@onecx/angular-integration-interface'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'

import { SharedModule } from 'src/app/shared/shared.module'
import { HttpClient } from '@angular/common/http'
import { TranslateLoader, TranslateService } from '@ngx-translate/core'

@Component({
  selector: 'app-ocx-display-workspace-property',
  templateUrl: './workspace-property.component.html',
  standalone: true,
  imports: [AngularRemoteComponentsModule, CommonModule, AngularAcceleratorModule, SharedModule],
  providers: [
    { provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<string>(1) },
    { provide: BASE_URL, useValue: new ReplaySubject<string>(1) },
    provideTranslateServiceForRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: createRemoteComponentTranslateLoader,
        deps: [HttpClient, BASE_URL]
      }
    })
  ]
})
@UntilDestroy()
export class OneCXDisplayWorkspacePropertyComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  @Input() propertyName = 'displayName'

  private readonly rcConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly appState = inject(AppStateService)
  public readonly config = inject(ConfigurationService)
  public readonly userService = inject(UserService)

  constructor(private readonly translateService: TranslateService) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }

  @Input() set ocxRemoteComponentConfig(rcConfig: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(rcConfig)
  }

  public property$: Observable<string | undefined> = combineLatest([
    this.appState.currentWorkspace$.asObservable(),
    this.userService.lang$.asObservable(),
    from(this.config.isInitialized)
  ]).pipe(
    map(([workspace, lang]) => {
      // example i18n
      // i18n: {displayName: {de: "Ein Text in Deutsch"}}
      if (workspace && workspace.i18n) {
        const i18n = Reflect.get(workspace.i18n, this.propertyName) ?? {}
        return i18n[lang] ?? Reflect.get(workspace, this.propertyName)
      }
      return undefined
    })
  )

  public ocxInitRemoteComponent(rcConfig: RemoteComponentConfig) {
    this.rcConfig.next(rcConfig)
  }
}
