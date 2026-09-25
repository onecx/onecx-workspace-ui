import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { combineLatest, from, map, Observable, ReplaySubject } from 'rxjs'

import { TooltipModule } from 'primeng/tooltip'

import {
  AngularRemoteComponentsModule,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  SLOT_SERVICE,
  SlotService
} from '@onecx/angular-remote-components'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'
import { AppStateService, ConfigurationService, UserService } from '@onecx/angular-integration-interface'

@Component({
  selector: 'app-ocx-display-workspace-property',
  standalone: true,
  imports: [AngularAcceleratorModule, AngularRemoteComponentsModule, AsyncPipe, TooltipModule, TranslateModule],
  providers: [{ provide: SLOT_SERVICE, useExisting: SlotService }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-property.component.html'
})
export class OneCXDisplayWorkspacePropertyComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  private readonly rcConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly slotService = inject(SlotService)
  private readonly appState = inject(AppStateService)
  public readonly config = inject(ConfigurationService)
  public readonly userService = inject(UserService)
  // input
  @Input() public propertyName = 'displayName'
  @Input() public title: string | undefined
  @Input() public styleClass: string | undefined

  constructor(private readonly translateService: TranslateService) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }

  @Input() set ocxRemoteComponentConfig(rcConfig: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(rcConfig)
  }

  // initialize this component as remote
  public ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.rcConfig.next(config)
    this.slotService.init()
  }

  public property$: Observable<string | undefined> = combineLatest([
    this.appState.currentWorkspace$.asObservable(),
    this.userService.lang$.asObservable(),
    from(this.config.isInitialized)
  ]).pipe(
    map(([workspace, lang]) => {
      // example i18n
      // i18n: {displayName: {de: "Ein Text in Deutsch"}}
      if (workspace?.i18n) {
        const i18n = Reflect.get(workspace.i18n, this.propertyName) ?? {}
        return i18n[lang] ?? Reflect.get(workspace, this.propertyName)
      }
      return undefined
    })
  )
}
