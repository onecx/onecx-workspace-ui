import { Component, Inject, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { CommonModule } from '@angular/common'
import { UntilDestroy } from '@ngneat/until-destroy'
import { combineLatest, from, map, Observable, ReplaySubject } from 'rxjs'

import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  SlotService
} from '@onecx/angular-remote-components'
import { PortalCoreModule } from '@onecx/portal-integration-angular'
import {
  AppStateService,
  CONFIG_KEY,
  ConfigurationService,
  Theme,
  ThemeService
} from '@onecx/angular-integration-interface'

import { SharedModule } from 'src/app/shared/shared.module'

type Version = {
  workspaceName: string
  hostVersion?: string
  mfeInfo?: string
  separator?: string
}

@Component({
  selector: 'app-workspace-footer',
  templateUrl: './workspace-footer.component.html',
  standalone: true,
  imports: [AngularRemoteComponentsModule, CommonModule, PortalCoreModule, SharedModule],
  providers: [{ provide: BASE_URL, useValue: new ReplaySubject<string>(1) }],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
@UntilDestroy()
export class OneCXWorkspaceFooterComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }

  public versionInfo$!: Observable<Version | undefined>
  public currentTheme$: Observable<Theme | undefined>
  // slot configuration: get theme data
  public slotName = 'onecx-theme-data'
  public isComponentDefined$: Observable<boolean> // check a component was assigned

  constructor(
    @Inject(BASE_URL) private readonly baseUrl: ReplaySubject<string>,
    private readonly configurationService: ConfigurationService,
    private readonly appState: AppStateService,
    private readonly themeService: ThemeService,
    private readonly slotService: SlotService
  ) {
    this.currentTheme$ = this.themeService.currentTheme$.asObservable()
    this.isComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.slotName)

    this.versionInfo$ = combineLatest([
      this.appState.currentMfe$.asObservable(),
      this.appState.currentWorkspace$.asObservable(),
      from(this.configurationService.isInitialized)
    ]).pipe(
      map(([mfe, workspace]) => {
        const version: Version = { workspaceName: workspace.workspaceName }
        const mfeInfoVersion = mfe?.version ? ' ' + mfe?.version : ''
        version.hostVersion = this.configurationService.getProperty(CONFIG_KEY.APP_VERSION) ?? ''
        version.separator = mfe?.displayName || mfeInfoVersion !== '' ? ' - ' : ''
        version.mfeInfo = mfe?.displayName ? mfe?.displayName + mfeInfoVersion : ''
        return version
      })
    )
  }

  public ocxInitRemoteComponent(remoteComponentConfig: RemoteComponentConfig) {
    this.baseUrl.next(remoteComponentConfig.baseUrl)
  }
}
