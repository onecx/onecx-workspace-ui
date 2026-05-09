import { TestBed, waitForAsync } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject, firstValueFrom } from 'rxjs'

import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'
import { CONFIG_KEY, UserService } from '@onecx/angular-integration-interface'
import {
  AppStateServiceMock,
  ConfigurationServiceMock,
  provideAppStateServiceMock,
  provideConfigurationServiceMock,
  provideUserServiceMock,
  UserServiceMock
} from '@onecx/angular-integration-interface/mocks'

import { OneCXDisplayWorkspacePropertyComponent } from './workspace-property.component'
import { Config, Workspace } from '@onecx/integration-interface'

const workspace1: Partial<Workspace> = {
  id: 'w1',
  workspaceName: 'workspace1',
  displayName: 'Workspace 1'
}

describe('OneCXDisplayWorkspacePropertyComponent', () => {
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
     property$ is declared with combineLatest which fires each time a
     part is changed. Within the tests the property value is captured
     with firstValueFrom. Therefore the config value should be set on
     initialization time.
  */
  async function setUp(config: Config) {
    const fixture = TestBed.createComponent(OneCXDisplayWorkspacePropertyComponent)
    const component = fixture.componentInstance
    await mockConfigurationService.init(config)
    fixture.detectChanges()
    return { fixture, component }
  }

  let mockConfigurationService: ConfigurationServiceMock
  let mockAppStateService: AppStateServiceMock
  let mockUserService: UserServiceMock

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en'),
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAppStateServiceMock(),
        provideConfigurationServiceMock(),
        provideUserServiceMock(),
        { provide: REMOTE_COMPONENT_CONFIG, useValue: rcConfig }
      ]
    })
      .overrideComponent(OneCXDisplayWorkspacePropertyComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule]
        }
      })
      .compileComponents()

    // Initialize Mocks
    mockConfigurationService = TestBed.inject(ConfigurationServiceMock)
    mockAppStateService = TestBed.inject(AppStateServiceMock)
    mockUserService = TestBed.inject(UserService) as unknown as UserServiceMock
    mockUserService.lang$.next('en')
    mockAppStateService.currentWorkspace$.publish(workspace1 as Workspace)
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
      spyOn(component, 'ocxInitRemoteComponent').and.callThrough()

      component.ocxRemoteComponentConfig = mockConfig

      expect(component.ocxInitRemoteComponent).toHaveBeenCalledWith(mockConfig)
    })
  })

  describe('property$', () => {
    it('should return undefined when workspace has no i18n', async () => {
      mockAppStateService.currentWorkspace$.publish(workspace1 as Workspace)
      const { component } = await setUp(cfg)

      const property = await firstValueFrom(component.property$)

      expect(property).toBeUndefined()
    })

    it('should return the i18n translation for the current language', async () => {
      mockUserService.lang$.next('en')
      mockAppStateService.currentWorkspace$.publish({
        ...workspace1,
        i18n: { displayName: { de: 'Arbeitsbereich 1', en: 'Workspace One' } }
      } as Workspace)
      const { component } = await setUp(cfg)

      const property = await firstValueFrom(component.property$)

      expect(property).toEqual('Workspace One')
    })

    it('should return the i18n translation for German language', async () => {
      mockUserService.lang$.next('de')
      mockAppStateService.currentWorkspace$.publish({
        ...workspace1,
        i18n: { displayName: { de: 'Arbeitsbereich 1', en: 'Workspace One' } }
      } as Workspace)
      const { component } = await setUp(cfg)

      const property = await firstValueFrom(component.property$)

      expect(property).toEqual('Arbeitsbereich 1')
    })

    it('should fall back to workspace property when no i18n translation exists for the current language', async () => {
      mockUserService.lang$.next('fr')
      mockAppStateService.currentWorkspace$.publish({
        ...workspace1,
        i18n: { displayName: { de: 'Arbeitsbereich 1', en: 'Workspace One' } }
      } as Workspace)
      const { component } = await setUp(cfg)

      const property = await firstValueFrom(component.property$)

      expect(property).toEqual(workspace1.displayName)
    })

    it('should fall back to workspace property when propertyName is not present in i18n', async () => {
      mockAppStateService.currentWorkspace$.publish({
        ...workspace1,
        i18n: { otherProperty: { en: 'Some Value' } }
      } as Workspace)
      const { component } = await setUp(cfg)

      const property = await firstValueFrom(component.property$)

      expect(property).toEqual(workspace1.displayName)
    })

    it('should fall back to workspace property when i18n entry for propertyName is null', async () => {
      mockAppStateService.currentWorkspace$.publish({
        ...workspace1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        i18n: { displayName: null as any }
      } as Workspace)
      const { component } = await setUp(cfg)

      const property = await firstValueFrom(component.property$)

      expect(property).toEqual(workspace1.displayName)
    })

    it('should use a custom propertyName when set', async () => {
      mockUserService.lang$.next('en')
      mockAppStateService.currentWorkspace$.publish({
        ...workspace1,
        workspaceName: 'my-workspace',
        i18n: { workspaceName: { en: 'My Workspace' } }
      } as Workspace)
      const { component } = await setUp(cfg)
      component.propertyName = 'workspaceName'

      const property = await firstValueFrom(component.property$)

      expect(property).toEqual('My Workspace')
    })

    it('should return undefined when workspace i18n is explicitly undefined', async () => {
      mockUserService.lang$.next('en')
      mockAppStateService.currentWorkspace$.publish({
        ...workspace1,
        i18n: undefined
      } as Workspace)
      const { component } = await setUp(cfg)
      component.propertyName = 'workspaceName'

      const property = await firstValueFrom(component.property$)

      expect(property).toBeUndefined()
    })
  })
})
