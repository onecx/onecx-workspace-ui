import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, ReplaySubject, throwError } from 'rxjs'

import { OneCXSlimVerticalMainMenuComponent } from './slim-vertical-main-menu.component'
import { provideHttpClient } from '@angular/common/http'
import {
  AppStateServiceMock,
  FakeTopic,
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
import { OneCXSlimVerticalMainMenuHarness } from './slim-vertical-main-menu.component.harness'
import { CurrentLocationTopicPayload, EventsTopic, Workspace } from '@onecx/integration-interface'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { SlimMenuMode } from 'src/app/shared/model/slim-menu-mode'

describe('OneCXSlimVerticalMainMenuComponent', () => {
  const menuItemApiSpy = jasmine.createSpyObj<MenuItemAPIService>('MenuItemAPIService', ['getMenuItems'])
  const menuServiceSpy = jasmine.createSpyObj<MenuService>('MenuService', ['isVisible', 'isActive'])
  const menuItemServiceSpy = jasmine.createSpyObj<MenuItemService>('MenuItemService', [
    'mapMenuItemsToSlimMenuItems',
    'constructMenuItems'
  ])

  function setUp() {
    const fixture = TestBed.createComponent(OneCXSlimVerticalMainMenuComponent)
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
        OneCXSlimVerticalMainMenuComponent,
        TranslateTestingModule.withTranslations({
          en: require('../../../assets/i18n/en.json')
        }).withDefaultLanguage('en'),
        NoopAnimationsModule
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
    }).overrideComponent(OneCXSlimVerticalMainMenuComponent, {
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

    const slimVerticalMenu = await TestbedHarnessEnvironment.harnessForFixture(
      fixture,
      OneCXSlimVerticalMainMenuHarness
    )
    const content = await (await slimVerticalMenu.host()).text()
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

    const slimVerticalMenu = await TestbedHarnessEnvironment.harnessForFixture(
      fixture,
      OneCXSlimVerticalMainMenuHarness
    )
    const isHidden = await slimVerticalMenu.isHidden()
    expect(isHidden).toBeTrue()
  })

  it('should log error when getMenuItems fails', async () => {
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.returnValue([])
    menuItemServiceSpy.constructMenuItems.and.returnValue([])
    menuItemApiSpy.getMenuItems.and.returnValue(throwError(() => new Error('API error')))
    spyOn(console, 'error')

    const { fixture } = setUp()
    const slimVerticalMenu = await TestbedHarnessEnvironment.harnessForFixture(
      fixture,
      OneCXSlimVerticalMainMenuHarness
    )

    const items = await slimVerticalMenu.getListItems()
    expect(items.length).toBe(0)
    expect(console.error).toHaveBeenCalledWith('Unable to load menu items for slim vertical main menu.')
  })

  it('should use currentLocation if capability is set', () => {
    ShellCapabilityServiceMock.setCapabilities([Capability.CURRENT_LOCATION_TOPIC])
    appStateServiceMock.currentLocation$.publish({
      url: 'locationTopic'
    } as CurrentLocationTopicPayload)
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.returnValue([])
    menuItemServiceSpy.constructMenuItems.and.returnValue([])
    menuItemApiSpy.getMenuItems.and.callFake(() => {
      return of({
        workspaceName: 'workspace',
        menu: []
      } as any)
    })

    const { component } = setUp()
    component.ngOnInit()

    expect(menuItemServiceSpy.mapMenuItemsToSlimMenuItems).toHaveBeenCalledOnceWith([], 'locationTopic')
  })

  it('should use eventsTopic if capability is not set', () => {
    ShellCapabilityServiceMock.setCapabilities([])
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.returnValue([])
    menuItemServiceSpy.constructMenuItems.and.returnValue([])
    appStateServiceMock.currentWorkspace$.publish({
      baseUrl: 'workspace_url'
    } as Workspace)
    menuItemApiSpy.getMenuItems.and.callFake(() => {
      return of({
        workspaceName: 'workspace',
        menu: []
      } as any)
    })

    const { component } = setUp()
    component['eventsTopic$'] = new FakeTopic<any>({
      type: 'navigated',
      payload: {
        url: 'eventsTopic'
      } as any
    }) as unknown as EventsTopic
    component.ngOnInit()

    expect(menuItemServiceSpy.mapMenuItemsToSlimMenuItems).toHaveBeenCalledOnceWith([], 'eventsTopic')
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
    const slimMenuItems = [
      ...menuItems.map((item) => {
        return {
          ...item,
          active: false
        }
      })
    ]
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.returnValue(slimMenuItems)

    const { fixture } = setUp()
    const slimVerticalMenu = await TestbedHarnessEnvironment.harnessForFixture(
      fixture,
      OneCXSlimVerticalMainMenuHarness
    )
    const items = await slimVerticalMenu.getListItems()
    expect(items.length).toEqual(3)
    expect(menuItemServiceSpy.constructMenuItems).toHaveBeenCalledOnceWith([{ id: 'fake' } as any], 'en', '/')
    expect(menuItemServiceSpy.mapMenuItemsToSlimMenuItems).toHaveBeenCalledOnceWith(menuItems, '/')
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
      const menuItems = [
        { title: 'Item 1', link: '/item1' },
        { title: 'Item 2', link: '/item2' },
        { title: 'Item 3', link: '/item3' }
      ]
      const slimMenuItems = [
        ...menuItems.map((item) => {
          return {
            ...item,
            active: false
          }
        })
      ]

      menuItemApiSpy.getMenuItems.and.callFake(() => {
        return of(fakeResponse)
      })
      menuItemServiceSpy.constructMenuItems.and.returnValue(menuItems)
      menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.returnValue(slimMenuItems)

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
      const slimVerticalMenu = await TestbedHarnessEnvironment.harnessForFixture(
        fixture,
        OneCXSlimVerticalMainMenuHarness
      )
      const listElement = await slimVerticalMenu.getList()
      expect(await listElement?.getAttribute('class')).toContain('slim-vertical-menu-list-slim')
      const listItems = await slimVerticalMenu.getListItems()
      expect(listItems.length).toBe(3)
      const item = listItems[0]
      //expect(await item.getCssValue('height')).toEqual(4 * 16 + 'px')
    })
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
      const menuItems = [
        { title: 'Item 1', link: '/item1' },
        { title: 'Item 2', link: '/item2' },
        { title: 'Item 3', link: '/item3' }
      ]
      const slimMenuItems = [
        ...menuItems.map((item) => {
          return {
            ...item,
            active: false
          }
        })
      ]

      menuItemApiSpy.getMenuItems.and.callFake(() => {
        return of(fakeResponse)
      })
      menuItemServiceSpy.constructMenuItems.and.returnValue(menuItems)
      menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.returnValue(slimMenuItems)

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
      const slimVerticalMenu = await TestbedHarnessEnvironment.harnessForFixture(
        fixture,
        OneCXSlimVerticalMainMenuHarness
      )
      const listElement = await slimVerticalMenu.getList()
      expect(await listElement?.getAttribute('class')).toContain('slim-vertical-menu-list-slim-plus')
      const listItems = await slimVerticalMenu.getListItems()
      expect(listItems.length).toBe(3)
      const item = listItems[0]
      //expect(await item.getCssValue('height')).toEqual(7 * 16 + 'px')
    })
  })
})
