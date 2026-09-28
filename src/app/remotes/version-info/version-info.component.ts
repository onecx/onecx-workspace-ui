import { Component, inject, Input } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { UntilDestroy } from '@ngneat/until-destroy'
import { combineLatest, from, map, Observable, ReplaySubject } from 'rxjs'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { AppStateService, CONFIG_KEY, ConfigurationService } from '@onecx/angular-integration-interface'
import {
  AngularRemoteComponentsModule,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig
} from '@onecx/angular-remote-components'

export type Version = {
  workspaceName: string
  shellInfo?: string
  mfeInfo?: string
  separator?: string
}

@Component({
  selector: 'app-ocx-version-info',
  standalone: true,
  imports: [AsyncPipe, AngularAcceleratorModule, AngularRemoteComponentsModule],
  providers: [{ provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<string>(1) }],
  templateUrl: './version-info.component.html'
})
@UntilDestroy()
export class OneCXVersionInfoComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  private readonly rcConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly appState = inject(AppStateService)
  public readonly config = inject(ConfigurationService)

  @Input() set ocxRemoteComponentConfig(rcConfig: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(rcConfig)
  }
  public ocxInitRemoteComponent(rcConfig: RemoteComponentConfig) {
    this.rcConfig.next(rcConfig)
  }

  public versionInfo$: Observable<Version | undefined> = combineLatest([
    this.appState.currentMfe$.asObservable(),
    this.appState.currentWorkspace$.asObservable(),
    this.config.getProperty(CONFIG_KEY.APP_VERSION),
    from(this.config.isInitialized)
  ]).pipe(
    map(([mfe, workspace, hostVersion, _]) => {
      const mfeVersion = mfe.version ?? ''
      const mfeInfo = mfe.displayName + (mfe.version ? ' ' + mfeVersion : '')
      const version: Version = {
        workspaceName: workspace.workspaceName,
        shellInfo: hostVersion,
        mfeInfo: mfe.displayName ? mfeInfo : '',
        separator: mfe.displayName || mfe.version ? ' - ' : ''
      }
      return version
    })
  )
}
