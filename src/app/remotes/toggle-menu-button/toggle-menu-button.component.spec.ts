import { TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { firstValueFrom, of, ReplaySubject } from 'rxjs'

import { TestbedHarnessEnvironment } from '@onecx/angular-testing'
import { RemoteComponentConfig, REMOTE_COMPONENT_CONFIG } from '@onecx/angular-remote-components'
import {
  provideShellCapabilityServiceMock,
  provideUserServiceMock,
  ShellCapabilityServiceMock
} from '@onecx/angular-integration-interface/mocks'
import { Capability } from '@onecx/angular-integration-interface'

import { MenuService } from 'src/app/shared/services/menu.service'
import { OneCXToggleMenuButtonComponent } from './toggle-menu-button.component'
import { ToggleMenuButtonHarness } from './toggle-menu-button.component.harness'

describe('OneCXToggleMenuButtonComponent', () => {
  const menuServiceSpy = jasmine.createSpyObj<MenuService>('MenuService', ['isActive', 'isVisible'])
  // the component injects this token - it must be provided (a ReplaySubject, like the real host)
  const rcConfig = new ReplaySubject<RemoteComponentConfig>(1)
  const defaultConfig: RemoteComponentConfig = {
    appId: 'appId',
    productName: 'prodName',
    permissions: ['permission'],
    baseUrl: 'base'
  }

  function setUp() {
    const fixture = TestBed.createComponent(OneCXToggleMenuButtonComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()
    return { fixture, component }
  }

  beforeEach(waitForAsync(async () => {
    // keep the component's real imports (AsyncPipe / TranslateModule / TooltipModule / RippleModule)
    // so the template directives ([pTooltip], pRipple) resolve without NO_ERRORS_SCHEMA
    await TestBed.configureTestingModule({
      imports: [
        OneCXToggleMenuButtonComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideUserServiceMock(),
        provideShellCapabilityServiceMock(),
        { provide: MenuService, useValue: menuServiceSpy },
        { provide: REMOTE_COMPONENT_CONFIG, useValue: rcConfig }
      ]
    }).compileComponents()

    rcConfig.next(defaultConfig)
    menuServiceSpy.isActive.and.returnValue(of(true))
    menuServiceSpy.isVisible.and.returnValue(of(true))
    ShellCapabilityServiceMock.setCapabilities([Capability.ACTIVENESS_AWARE_MENUS])
  }))

  afterEach(() => {
    document.documentElement.dir = 'ltr'
  })

  it('should create', () => {
    const { component } = setUp()
    expect(component).toBeTruthy()
  })

  it('should forward the config to the REMOTE_COMPONENT_CONFIG token', async () => {
    const { component } = setUp()

    component.ocxRemoteComponentConfig = defaultConfig

    const config = await firstValueFrom(component.remoteComponentConfig)
    expect(config).toEqual(defaultConfig)
  })

  it('should be not displayed if not active', async () => {
    menuServiceSpy.isActive.and.returnValue(of(false))
    const { fixture } = setUp()
    await fixture.whenStable()
    fixture.detectChanges()
    const toggleButton = await TestbedHarnessEnvironment.harnessForFixture(fixture, ToggleMenuButtonHarness)
    const button = await toggleButton.getButton()
    expect(button).toBeNull()
  })

  it('should be not displayed if shell has no capability', async () => {
    ShellCapabilityServiceMock.setCapabilities([])
    const { fixture } = setUp()
    await fixture.whenStable()
    fixture.detectChanges()
    const toggleButton = await TestbedHarnessEnvironment.harnessForFixture(fixture, ToggleMenuButtonHarness)
    const button = await toggleButton.getButton()
    expect(button).toBeNull()
  })

  it('should publish static menu state on click', async () => {
    const { fixture, component } = setUp()
    const publishSpy = spyOn(component['staticMenuStatePublisher'], 'publish')

    await fixture.whenStable()
    fixture.detectChanges()
    const toggleButton = await TestbedHarnessEnvironment.harnessForFixture(fixture, ToggleMenuButtonHarness)
    const button = await toggleButton.getButton()
    expect(button).toBeDefined()
    await button?.click()

    expect(publishSpy).toHaveBeenCalledWith({ isVisible: false })
  })

  it('should not publish static menu state on click if its unknown if menu is visible', () => {
    const { component } = setUp()
    const publishSpy = spyOn(component['staticMenuStatePublisher'], 'publish')

    component.onMenuButtonClick(null)
    expect(publishSpy).not.toHaveBeenCalled()
  })

  describe('icon state', () => {
    it('should have no class if menu visibility is unknown', () => {
      const { component } = setUp()
      expect(component.getIcon(null as any)).toBe('')
    })

    describe('rtl', () => {
      beforeEach(() => {
        document.documentElement.dir = 'rtl'
      })

      it('should be directed to right if menu is visible', () => {
        menuServiceSpy.isVisible.and.returnValue(of(true))
        const { component } = setUp()

        expect(component.getIcon(true)).toBe('pi-chevron-right')
      })

      it('should be directed to left if menu is not visible', () => {
        menuServiceSpy.isVisible.and.returnValue(of(false))
        const { component } = setUp()

        expect(component.getIcon(false)).toBe('pi-chevron-left')
      })
    })

    describe('ltr', () => {
      beforeEach(() => {
        document.documentElement.dir = 'ltr'
      })

      it('should be directed to left if menu is visible', () => {
        menuServiceSpy.isVisible.and.returnValue(of(true))
        const { component } = setUp()

        expect(component.getIcon(true)).toBe('pi-chevron-left')
      })

      it('should be directed to right if menu is not visible', () => {
        menuServiceSpy.isVisible.and.returnValue(of(false))
        const { component } = setUp()

        expect(component.getIcon(false)).toBe('pi-chevron-right')
      })
    })
  })
})
