import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, ReplaySubject, throwError } from 'rxjs'

import { OneCXSlimUserMenuComponent } from './slim-user-menu.component'
import { provideHttpClient } from '@angular/common/http'
import {
  AppStateServiceMock,
  provideAppStateServiceMock,
  provideShellCapabilityServiceMock,
  provideUserServiceMock,
  ShellCapabilityServiceMock,
  UserServiceMock
} from '@onecx/angular-integration-interface/mocks'
import { AppStateService, Capability, UserService } from '@onecx/angular-integration-interface'
import { MenuService } from 'src/app/shared/services/menu.service'
import { MenuItemAPIService } from 'src/app/shared/generated'
import { TestbedHarnessEnvironment } from '@onecx/angular-testing'
import { OneCXSlimUserMenuHarness } from './slim-user-menu.component.harness'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { SlimMenuMode } from 'src/app/shared/model/slim-menu-mode'
import { AccordionModule } from 'primeng/accordion'
import { TooltipModule } from 'primeng/tooltip'

describe('OneCXSlimUserMenuComponent', () => {
  const menuItemApiSpy = jasmine.createSpyObj<MenuItemAPIService>('MenuItemAPIService', ['getMenuItems'])
  const menuServiceSpy = jasmine.createSpyObj<MenuService>('MenuService', ['isVisible', 'isActive'])
  const menuItemServiceSpy = jasmine.createSpyObj<MenuItemService>('MenuItemService', [
    'mapMenuItemsToSlimMenuItems',
    'constructMenuItems'
  ])

  function setUp() {
    const fixture = TestBed.createComponent(OneCXSlimUserMenuComponent)
    const component = fixture.componentInstance

    return { fixture, component }
  }

  let baseUrlSubject: ReplaySubject<any>
  let appStateServiceMock: AppStateServiceMock
  let userServiceMock: UserServiceMock
  beforeEach(() => {
    baseUrlSubject = new ReplaySubject<any>(1)
    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        OneCXSlimUserMenuComponent,
        TranslateTestingModule.withTranslations({
          en: require('../../../assets/i18n/en.json')
        }).withDefaultLanguage('en'),
        NoopAnimationsModule,
        AccordionModule,
        TooltipModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BASE_URL,
          useValue: baseUrlSubject
        },
        provideShellCapabilityServiceMock(),
        provideAppStateServiceMock(),
        provideUserServiceMock(),
        { provide: MenuService, useValue: menuServiceSpy }
      ]
    }).overrideComponent(OneCXSlimUserMenuComponent, {
      set: {
        providers: [
          { provide: MenuItemService, useValue: menuItemServiceSpy },
          { provide: MenuItemAPIService, useValue: menuItemApiSpy }
        ]
      }
    })

    appStateServiceMock = TestBed.inject(AppStateService) as unknown as AppStateServiceMock
    userServiceMock = TestBed.inject(UserService) as unknown as UserServiceMock
    userServiceMock.lang$.next('en')
    baseUrlSubject.next('base_url_mock')
    ShellCapabilityServiceMock.setCapabilities([Capability.CURRENT_LOCATION_TOPIC])
    // Reset mocks
    menuServiceSpy.isActive.calls.reset()
    menuServiceSpy.isVisible.calls.reset()
    menuItemApiSpy.getMenuItems.calls.reset()
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.calls.reset()
    menuItemServiceSpy.constructMenuItems.calls.reset()
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.returnValue([])
    menuItemServiceSpy.constructMenuItems.and.returnValue([])
    menuItemApiSpy.getMenuItems.and.returnValue(of({} as any))
  })

  it('should create', () => {
    const { component } = setUp()
    expect(component).toBeTruthy()
  })

  it('should call ocxInitRemoteComponent with the correct config', (doneFn: DoneFn) => {
    const { component } = setUp()

    const mockConfig: RemoteComponentConfig = {
      appId: 'appId',
      productName: 'prodName',
      permissions: ['permission'],
      baseUrl: 'base'
    }

    component.ocxRemoteComponentConfig = mockConfig

    expect(component['menuItemApiService'].configuration.basePath).toEqual('base/bff')

    component['baseUrl'].subscribe((baseUrl) => {
      expect(baseUrl).toEqual('base')
      doneFn()
    })
  })

  it('should have no content in INACTIVE MODE', async () => {
    menuServiceSpy.isActive.and.returnValue(of(false))

    const { fixture } = setUp()

    const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
    const content = await (await slimUserMenu.host()).text()
    expect(content).toBe('')
  })

  it('should be hidden in INACTIVE MODE', (doneFn: DoneFn) => {
    menuServiceSpy.isActive.and.returnValue(of(false))

    const { component } = setUp()

    component.isHidden$.subscribe((isHidden) => {
      expect(isHidden).toBeTrue()
      doneFn()
    })
  })

  it('should be hidden in any active mode if menuService.isVisible returns false', async () => {
    menuServiceSpy.isActive.and.returnValue(of(true))
    menuServiceSpy.isVisible.and.returnValue(of(false))

    const { fixture } = setUp()

    const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
    const isHidden = await slimUserMenu.isHidden()
    expect(isHidden).toBeTrue()
  })

  it('should log error when getMenuItems fails', async () => {
    spyOn(console, 'error').and.callThrough()
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.returnValue([])
    menuItemServiceSpy.constructMenuItems.and.returnValue([])
    menuItemApiSpy.getMenuItems.and.returnValue(throwError(() => new Error('API error')))

    const { fixture } = setUp()
    const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)

    const items = await slimUserMenu.getItems()
    expect(items.length).toBe(0)
    expect(console.error).toHaveBeenCalledWith('Unable to load menu items for slim user menu.')
  })

  it('should have correct number of items', async () => {
    const fakeResponse = {
      workspaceName: 'workspace',
      menu: [
        {
          children: [{ id: 'fake' }]
        }
      ]
    } as any
    menuItemApiSpy.getMenuItems.and.callFake(() => {
      return of(fakeResponse)
    })
    const menuItems = [
      { title: 'Item 1', link: '/item1' },
      { title: 'Item 2', link: '/item2' },
      { title: 'Item 3', link: '/item3' }
    ]
    menuItemServiceSpy.constructMenuItems.and.returnValue(menuItems)
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.callFake((items) => {
      return [...items.map((item) => ({ ...item, active: false }))]
    })

    const { fixture } = setUp()

    const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
    await slimUserMenu.open()
    const items = await slimUserMenu.getItems()
    expect(menuItemServiceSpy.constructMenuItems).toHaveBeenCalledOnceWith([{ id: 'fake' } as any], 'en', '/')
    // +1 for logout item
    expect(items.length).toBe(4)
  })

  it('should publish on logout', () => {
    const { component } = setUp()
    spyOn(component['eventsPublisher'], 'publish')

    component.logout()
    expect(component['eventsPublisher'].publish).toHaveBeenCalledWith({ type: 'authentication#logoutButtonClicked' })
  })

  describe('SLIM MODE', () => {
    beforeEach(() => {
      const fakeResponse = {
        workspaceName: 'workspace',
        menu: [
          {
            children: [{ id: 'fake' }]
          }
        ]
      } as any
      menuItemApiSpy.getMenuItems.and.callFake(() => {
        return of(fakeResponse)
      })
      const menuItems = [
        { title: 'Item 1', link: '/item1' },
        { title: 'Item 2', link: '/item2' },
        { title: 'Item 3', link: '/item3' }
      ]
      menuItemServiceSpy.constructMenuItems.and.returnValue(menuItems)
      menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.callFake((items) => {
        return [...items.map((item) => ({ ...item, active: false }))]
      })
      menuServiceSpy.isActive.and.callFake((menuMode) => {
        if (menuMode === SlimMenuMode.SLIM) {
          return of(true)
        }

        return of(false)
      })
      menuServiceSpy.isVisible.and.returnValue(of(true))
    })

    it('should have correct classes and styles', async () => {
      // Set 1 rem to 16px
      document.documentElement.style.fontSize = '16px'

      const { fixture } = setUp()
      const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
      await slimUserMenu.open()
      const items = await slimUserMenu.getItems()
      expect(items.length).toBe(4)
      const item = items[0]
      expect(await item.getCssValue('height')).toEqual(4 * 16 + 'px') // 4 rem in px
    })

    it('should have correct header style', async () => {
      // Set 1 rem to 16px
      document.documentElement.style.fontSize = '16px'

      const { fixture } = setUp()
      const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
      const header = await slimUserMenu.getHeader()
      expect(header).not.toBe(null)
      expect(await header!.getCssValue('height')).toEqual(4 * 16 + 'px') // 4 rem in px
    })
  })

  describe('SLIM_PLUS MODE', () => {
    beforeEach(() => {
      const fakeResponse = {
        workspaceName: 'workspace',
        menu: [
          {
            children: [{ id: 'fake' }]
          }
        ]
      } as any
      menuItemApiSpy.getMenuItems.and.callFake(() => {
        return of(fakeResponse)
      })
      const menuItems = [
        { title: 'Item 1', link: '/item1' },
        { title: 'Item 2', link: '/item2' },
        { title: 'Item 3', link: '/item3' }
      ]
      menuItemServiceSpy.constructMenuItems.and.returnValue(menuItems)
      menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.callFake((items) => {
        return [...items.map((item) => ({ ...item, active: false }))]
      })
      menuServiceSpy.isActive.and.callFake((menuMode) => {
        if (menuMode === SlimMenuMode.SLIM_PLUS) {
          return of(true)
        }

        return of(false)
      })
      menuServiceSpy.isVisible.and.returnValue(of(true))
    })

    it('should have correct classes and styles', async () => {
      // Set 1 rem to 16px
      document.documentElement.style.fontSize = '16px'

      const { fixture } = setUp()
      const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
      await slimUserMenu.open()
      const items = await slimUserMenu.getItems()
      expect(items.length).toBe(4)
      const item = items[0]
      expect(await item.getCssValue('height')).toEqual(7 * 16 + 'px') // 4 rem in px
    })

    it('should have correct header style', async () => {
      // Set 1 rem to 16px
      document.documentElement.style.fontSize = '16px'

      const { fixture } = setUp()
      const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
      const header = await slimUserMenu.getHeader()
      expect(header).not.toBe(null)
      expect(await header!.getCssValue('height')).toEqual(7 * 16 + 'px') // 4 rem in px
      expect(await header!.getAttribute('class')).toContain('slim-user-menu-header-plus')
    })

    describe('Header Display Name', () => {
      it('should display displayName', async () => {
        userServiceMock.profile$.publish({
          person: {
            displayName: 'John Doe'
          }
        } as any)

        const { fixture } = setUp()
        const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
        const headerText = await slimUserMenu.getHeaderText()
        expect(headerText).toContain('John Doe')
      })

      it('should display firstname and lastname', async () => {
        userServiceMock.profile$.publish({
          person: {
            firstName: 'Mary',
            lastName: 'Jane'
          }
        } as any)

        const { fixture } = setUp()
        const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
        const headerText = await slimUserMenu.getHeaderText()
        expect(headerText).toContain('Mary Jane')
      })

      it('should display displayName', async () => {
        userServiceMock.profile$.publish({
          person: {},
          userId: 'user1'
        } as any)

        const { fixture } = setUp()
        const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
        const headerText = await slimUserMenu.getHeaderText()
        expect(headerText).toContain('user1')
      })
    })
  })

  describe('Header', () => {
    beforeEach(() => {
      const fakeResponse = {
        workspaceName: 'workspace',
        menu: []
      } as any
      menuItemApiSpy.getMenuItems.and.callFake(() => {
        return of(fakeResponse)
      })
      menuServiceSpy.isActive.and.callFake((menuMode) => {
        if (menuMode === SlimMenuMode.SLIM) {
          return of(true)
        }

        return of(false)
      })
      menuServiceSpy.isVisible.and.returnValue(of(true))
    })
    it('should display icon if avatar image not loaded', async () => {
      const { fixture, component } = setUp()

      const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)

      component.avatarImageLoadedEmitter.emit(undefined)

      const headerIcon = await slimUserMenu.getHeaderIcon()
      expect(headerIcon).not.toBeNull()
      expect(await headerIcon!.getAttribute('class')).toContain('pi pi-user')
    })
  })
})
