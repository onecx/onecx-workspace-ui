import { TestBed, waitForAsync } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject, firstValueFrom } from 'rxjs'

import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'
import { CONFIG_KEY, MfeInfo } from '@onecx/angular-integration-interface'
import {
  AppStateServiceMock,
  ConfigurationServiceMock,
  provideAppStateServiceMock,
  provideConfigurationServiceMock
} from '@onecx/angular-integration-interface/mocks'

import { OneCXVersionInfoComponent, Version } from './version-info.component'
import { Config, Workspace } from '@onecx/integration-interface'

const workspace1: Partial<Workspace> = {
  id: 'w1',
  workspaceName: 'workspace1',
  displayName: 'Workspace 1'
}

describe('OneCXVersionInfoComponent', () => {
  const rcConfig = new ReplaySubject<RemoteComponentConfig>(1)
  const defaultRCConfig = {
    productName: 'prodName',
    appId: 'appId',
    baseUrl: 'base',
    permissions: ['permission']
  }
  rcConfig.next(defaultRCConfig) // load default rc config

  const cfg: Config = { [CONFIG_KEY.APP_VERSION]: 'v1' }

  /* Why async:
     versionInfo$ is declared with combineLatest whcih fires each time a
     part is changed. Within the tests the versionInfo value is captured
     with firstValueFrom. Therefore the config value should be set on
     initialization time.
  */
  async function setUp(config: Config) {
    const fixture = TestBed.createComponent(OneCXVersionInfoComponent)
    const component = fixture.componentInstance
    await mockConfigurationService.init(config)
    fixture.detectChanges()
    return { fixture, component }
  }

  let mockConfigurationService: ConfigurationServiceMock
  let mockAppStateService: AppStateServiceMock

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('./../../../assets/i18n/de.json'),
          en: require('./../../../assets/i18n/en.json')
        }).withDefaultLanguage('en'),
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAppStateServiceMock(),
        provideConfigurationServiceMock(),
        { provide: REMOTE_COMPONENT_CONFIG, useValue: rcConfig }
      ]
    })
      .overrideComponent(OneCXVersionInfoComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule]
        }
      })
      .compileComponents()

    // Initialize Mocks
    mockConfigurationService = TestBed.inject(ConfigurationServiceMock)

    mockAppStateService = TestBed.inject(AppStateServiceMock)
    mockAppStateService.currentMfe$.publish({ displayName: workspace1.displayName, version: '1.0.0' } as MfeInfo)
    mockAppStateService.currentWorkspace$.publish({ workspaceName: workspace1.workspaceName } as Workspace)
  }))

  describe('initialize', () => {
    it('should create', async () => {
      const { component } = await setUp(cfg)

      expect(component).toBeTruthy()
    })

    it('should call ocxInitRemoteComponent with the correct config', async () => {
      const { component } = await setUp(cfg)
      const mockConfig: RemoteComponentConfig = {
        productName: 'prodName',
        appId: 'appId',
        baseUrl: 'base',
        permissions: ['permission']
      }
      component.ocxRemoteComponentConfig = mockConfig

      const rcConfigValue = await firstValueFrom(rcConfig)

      expect(rcConfigValue).toEqual(mockConfig)
    })
  })

  describe('version info', () => {
    it('should getting data - all parts available', async () => {
      mockAppStateService.currentMfe$.publish({ displayName: 'OneCX Workspace UI', version: 'v1.0.0' } as MfeInfo)
      mockAppStateService.currentWorkspace$.publish({ workspaceName: workspace1.workspaceName } as Workspace)
      const { component } = await setUp(cfg)
      const mockVersion: Version = {
        workspaceName: workspace1.workspaceName!,
        shellInfo: 'v1',
        mfeInfo: 'OneCX Workspace UI v1.0.0',
        separator: ' - '
      }
      const versionInfo = await firstValueFrom(component.versionInfo$)

      expect(versionInfo).toEqual(mockVersion)
    })

    it('should getting data - no mfe version', async () => {
      const mfe = { displayName: 'OneCX Workspace UI' } as MfeInfo
      mockAppStateService.currentMfe$.publish(mfe)
      mockAppStateService.currentWorkspace$.publish(workspace1 as Workspace)
      const mockVersion: Version = {
        workspaceName: workspace1.workspaceName!,
        shellInfo: 'v1',
        mfeInfo: mfe.displayName, // no version
        separator: ' - '
      }

      const { component } = await setUp(cfg)
      const versionInfo = await firstValueFrom(component.versionInfo$)

      expect(versionInfo).toEqual(mockVersion)
    })

    it('should getting version info - no mfe', async () => {
      const mfe = {} as MfeInfo
      mockAppStateService.currentMfe$.publish(mfe)
      mockAppStateService.currentWorkspace$.publish(workspace1 as Workspace)
      const mockVersion: Version = {
        workspaceName: workspace1.workspaceName!,
        shellInfo: 'v1',
        mfeInfo: '', // empty
        separator: ''
      }

      const { component } = await setUp(cfg)
      const versionInfo = await firstValueFrom(component.versionInfo$)

      expect(versionInfo).toEqual(mockVersion)
    })

    it('should getting data - no host version', async () => {
      mockAppStateService.currentMfe$.publish({ displayName: 'OneCX Workspace UI', version: 'v1.0.0' } as MfeInfo)
      mockAppStateService.currentWorkspace$.publish(workspace1 as Workspace)
      const mockVersion: Version = {
        workspaceName: workspace1.workspaceName!,
        shellInfo: '',
        mfeInfo: 'OneCX Workspace UI v1.0.0',
        separator: ' - '
      }
      const { component } = await setUp({})
      const versionInfo = await firstValueFrom(component.versionInfo$)

      expect(versionInfo).toEqual(mockVersion)
    })
  })
})
