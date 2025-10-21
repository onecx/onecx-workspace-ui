import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, ReplaySubject } from 'rxjs'

import { CommonModule } from '@angular/common'
import { TestbedHarnessEnvironment } from '@onecx/angular-testing'
import { TooltipModule } from 'primeng/tooltip'
import { RippleModule } from 'primeng/ripple'
import { OneCXToggleMenuButtonComponent } from './toggle-menu-button.component'
import { ToggleMenuButtonHarness } from './toggle-menu-button.component.harness'
import { MenuService } from 'src/app/shared/services/menu.service'
import {
  provideShellCapabilityServiceMock,
  ShellCapabilityServiceMock
} from '@onecx/angular-integration-interface/mocks'
import { Capability } from '@onecx/angular-integration-interface'

describe('OneCXToggleMenuButtonComponent', () => {
  const menuServiceSpy = jasmine.createSpyObj<MenuService>('MenuService', ['isVisible', 'isActive'])

  let baseUrlSubject: ReplaySubject<any>
  beforeEach(() => {
    baseUrlSubject = new ReplaySubject<any>(1)
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
        provideShellCapabilityServiceMock(),
        { provide: BASE_URL, useValue: baseUrlSubject }
      ]
    })
      .overrideComponent(OneCXToggleMenuButtonComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule, TooltipModule, RippleModule],
          providers: [{ provide: MenuService, useValue: menuServiceSpy }]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')
    menuServiceSpy.isActive.and.returnValue(of(true))
    menuServiceSpy.isVisible.and.returnValue(of(true))
    ShellCapabilityServiceMock.setCapabilities([Capability.ACTIVENESS_AWARE_MENUS])
  })

  it('should create', () => {
    const fixture = TestBed.createComponent(OneCXToggleMenuButtonComponent)
    const component = fixture.componentInstance
    expect(component).toBeTruthy()
  })

  it('should initialize', () => {
    spyOn(baseUrlSubject, 'next')

    const fixture = TestBed.createComponent(OneCXToggleMenuButtonComponent)
    const component = fixture.componentInstance

    const mockConfig: RemoteComponentConfig = {
      appId: 'appId',
      productName: 'prodName',
      permissions: ['permission'],
      baseUrl: 'base'
    }
    component.ocxRemoteComponentConfig = mockConfig

    expect(baseUrlSubject.next).toHaveBeenCalledWith('base')
  })

  it('should be not displayed if not active', async () => {
    menuServiceSpy.isActive.and.returnValue(of(false))
    const fixture = TestBed.createComponent(OneCXToggleMenuButtonComponent)
    const toggleButton = await TestbedHarnessEnvironment.harnessForFixture(fixture, ToggleMenuButtonHarness)
    const button = await toggleButton.getButton()
    expect(button).toBeNull()
  })

  it('should be not displayed if shell has no capability', async () => {
    ShellCapabilityServiceMock.setCapabilities([])
    const fixture = TestBed.createComponent(OneCXToggleMenuButtonComponent)
    const toggleButton = await TestbedHarnessEnvironment.harnessForFixture(fixture, ToggleMenuButtonHarness)
    const button = await toggleButton.getButton()
    expect(button).toBeNull()
  })

  it('should publish static menu state on click', async () => {
    const fixture = TestBed.createComponent(OneCXToggleMenuButtonComponent)
    const component = fixture.componentInstance
    component['staticMenuStatePublisher'].publish = jasmine.createSpy('publish')

    const toggleButton = await TestbedHarnessEnvironment.harnessForFixture(fixture, ToggleMenuButtonHarness)
    const button = await toggleButton.getButton()
    expect(button).toBeDefined()
    await button?.click()

    expect(component['staticMenuStatePublisher'].publish).toHaveBeenCalledWith({ isVisible: false })
  })

  it('should not publish static menu state on click if its unknown if menu is visible', async () => {
    const fixture = TestBed.createComponent(OneCXToggleMenuButtonComponent)
    const component = fixture.componentInstance
    component['staticMenuStatePublisher'].publish = jasmine.createSpy('publish')

    component.onMenuButtonClick(null)
    expect(component['staticMenuStatePublisher'].publish).not.toHaveBeenCalled()
  })

  describe('icon state', () => {
    it('should have no class if menu visibility is unknown', () => {
      const fixture = TestBed.createComponent(OneCXToggleMenuButtonComponent)
      const component = fixture.componentInstance

      expect(component.getIcon(null as any)).toBe('')
    })

    describe('rtl', () => {
      beforeEach(() => {
        document.documentElement.dir = 'rtl'
      })

      it('should be directed to right if menu is visible', () => {
        menuServiceSpy.isVisible.and.returnValue(of(true))
        const fixture = TestBed.createComponent(OneCXToggleMenuButtonComponent)
        const component = fixture.componentInstance

        expect(component.getIcon(true)).toBe('pi-chevron-right')
      })

      it('should be directed to left if menu is not visible', () => {
        menuServiceSpy.isVisible.and.returnValue(of(false))
        const fixture = TestBed.createComponent(OneCXToggleMenuButtonComponent)
        const component = fixture.componentInstance

        expect(component.getIcon(false)).toBe('pi-chevron-left')
      })
    })

    describe('ltr', () => {
      beforeEach(() => {
        document.documentElement.dir = 'ltr'
      })

      it('should be directed to left if menu is visible', () => {
        menuServiceSpy.isVisible.and.returnValue(of(true))
        const fixture = TestBed.createComponent(OneCXToggleMenuButtonComponent)
        const component = fixture.componentInstance

        expect(component.getIcon(true)).toBe('pi-chevron-left')
      })

      it('should be directed to right if menu is not visible', () => {
        menuServiceSpy.isVisible.and.returnValue(of(false))
        const fixture = TestBed.createComponent(OneCXToggleMenuButtonComponent)
        const component = fixture.componentInstance

        expect(component.getIcon(false)).toBe('pi-chevron-right')
      })
    })
  })
})
