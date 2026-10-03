import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { firstValueFrom, of, ReplaySubject, Subject, throwError } from 'rxjs'

import { RemoteComponentConfig, REMOTE_COMPONENT_CONFIG, SlotService } from '@onecx/angular-remote-components'
import { SlotServiceMock } from '@onecx/angular-remote-components/mocks'
import {
  provideAppStateServiceMock,
  provideShellCapabilityServiceMock,
  provideUserServiceMock,
  ShellCapabilityServiceMock,
  UserServiceMock
} from '@onecx/angular-integration-interface/mocks'
import { AppStateService, Capability } from '@onecx/angular-integration-interface'
import { Workspace } from '@onecx/integration-interface'
import { TestbedHarnessEnvironment } from '@onecx/angular-testing'

import { MenuItemAPIService } from 'src/app/shared/generated'
import { MenuService } from 'src/app/shared/services/menu.service'
import { MenuItemService } from 'src/app/shared/services/menu-item.service'
import { SlimMenuMode } from 'src/app/shared/model/slim-menu-mode'
import { ItemType } from 'src/app/shared/model/slim-menu-item'

import { OneCXSlimUserMenuHarness } from './slim-user-menu.component.harness'
import { OneCXSlimUserMenuComponent } from './slim-user-menu.component'

describe('OneCXSlimUserMenuComponent', () => {
  // The component injects this token non-optionally, so it must be provided (a ReplaySubject,
  // mirroring the real remote-component host).
  const rcConfig = new ReplaySubject<RemoteComponentConfig>(1)
  const defaultConfig: RemoteComponentConfig = {
    appId: 'appId',
    productName: 'prodName',
    permissions: ['permission'],
    baseUrl: 'base'
  }
  const menuServiceSpy = jasmine.createSpyObj<MenuService>('MenuService', ['isVisible', 'isActive'])
  const menuItemServiceSpy = jasmine.createSpyObj<MenuItemService>('MenuItemService', [
    'mapMenuItemsToSlimMenuItems',
    'constructMenuItems'
  ])

  // Shared fake menu response: workspaceName 'workspace', one menu with a single child.
  const fakeResponse = {
    workspaceName: 'workspace',
    menu: [{ children: [{ id: 'fake' }] }]
  } as any

  const fakeMenuItems = [
    { title: 'Item 1', link: '/item1' },
    { title: 'Item 2', link: '/item2' },
    { title: 'Item 3', link: '/item3' }
  ] as any[]

  // Stub the service spies with the values the tests rely on.
  function stubMenuServices() {
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.callFake((items: any[]) => [
      ...items.map((item) => ({ ...item, active: false }))
    ])
    menuItemServiceSpy.constructMenuItems.and.returnValue(fakeMenuItems)
  }

  let workspaceSubject: Subject<Workspace>

  function setUp() {
    // The menu pipeline is kicked off from the constructor by the current workspace emission.
    // Hold that emission in a subject (and spy asObservable BEFORE the component is created) so
    // the getMenuItems spy can be installed before the pipeline fires - otherwise getMenuItems()
    // would already have been called on the (unmocked) API service against a real HTTP request.
    workspaceSubject = new Subject()
    spyOn(TestBed.inject(AppStateService).currentWorkspace$, 'asObservable').and.returnValue(
      workspaceSubject.asObservable()
    )

    const fixture = TestBed.createComponent(OneCXSlimUserMenuComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()
    return { fixture, component }
  }

  // MenuItemAPIService is providedIn 'any', so the component holds its own instance and a
  // root-level provider would be shadowed - spy on the actual instance the component uses.
  function spyGetMenuItems(component: OneCXSlimUserMenuComponent): jasmine.Spy {
    return spyOn(
      (component as unknown as { menuItemApiService: MenuItemAPIService }).menuItemApiService,
      'getMenuItems'
    )
  }

  // Trigger the menu pipeline by emitting the workspace (after the spy has been installed).
  function triggerWorkspace() {
    workspaceSubject.next({ workspaceName: 'workspace', baseUrl: '/' } as Workspace)
  }

  // Flush change detection so the async pipes (menuItems$ etc.) render after the pipeline emits.
  async function flush(fixture: ComponentFixture<OneCXSlimUserMenuComponent>) {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  let userServiceMock: UserServiceMock
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        OneCXSlimUserMenuComponent,
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
        provideAppStateServiceMock(),
        provideUserServiceMock(),
        { provide: MenuService, useValue: menuServiceSpy },
        // MenuItemService is providedIn 'root', so a root-level useValue applies to the component.
        { provide: MenuItemService, useValue: menuItemServiceSpy },
        { provide: REMOTE_COMPONENT_CONFIG, useValue: rcConfig },
        // The template renders <ocx-slot>; the mock starts empty so it renders nothing.
        { provide: SlotService, useClass: SlotServiceMock }
      ]
    })

    // Seed the remote-component config token and reset all spies.
    rcConfig.next(defaultConfig)
    menuServiceSpy.isActive.calls.reset()
    menuServiceSpy.isVisible.calls.reset()
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.calls.reset()
    menuItemServiceSpy.constructMenuItems.calls.reset()
    // Defaults used by tests that don't override them (a throw would otherwise surface through
    // the un-awaited getMenuItems pipeline).
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.returnValue([])
    menuItemServiceSpy.constructMenuItems.and.returnValue([])

    userServiceMock = TestBed.inject(UserServiceMock)
    userServiceMock.lang$.next('en')
    ShellCapabilityServiceMock.setCapabilities([Capability.CURRENT_LOCATION_TOPIC])
  })

  it('should create', () => {
    const { component } = setUp()
    expect(component).toBeTruthy()
  })

  it('should apply the remote component config to the menu api service and token', async () => {
    const { component } = setUp()

    const mockConfig: RemoteComponentConfig = {
      appId: 'appId',
      productName: 'prodName',
      permissions: ['permission'],
      baseUrl: 'base'
    }

    component.ocxRemoteComponentConfig = mockConfig

    expect(component['menuItemApiService'].configuration.basePath).toEqual('base/bff')
    expect(await firstValueFrom(component.remoteComponentConfig)).toEqual(mockConfig)
  })

  it('should have no content in INACTIVE MODE', async () => {
    menuServiceSpy.isActive.and.returnValue(of(false))

    const { fixture } = setUp()

    const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
    const content = await (await slimUserMenu.host()).text()
    expect(content).toBe('')
  })

  it('should return false from isHidden when wrapper element is absent (INACTIVE MODE)', async () => {
    menuServiceSpy.isActive.and.returnValue(of(false))

    const { fixture } = setUp()

    const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
    const isHidden = await slimUserMenu.isHidden()
    expect(isHidden).toBeFalse()
  })

  it('should return null from getHeaderText when header element is absent (INACTIVE MODE)', async () => {
    menuServiceSpy.isActive.and.returnValue(of(false))

    const { fixture } = setUp()

    const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
    const headerText = await slimUserMenu.getHeaderText()
    expect(headerText).toBeNull()
  })

  it('should be hidden in INACTIVE MODE', (doneFn: DoneFn) => {
    menuServiceSpy.isActive.and.returnValue(of(false))

    const { component } = setUp()

    component.isHidden$.subscribe((isHidden) => {
      expect(isHidden).toBeTrue()
      doneFn()
    })
  })

  it('should not be hidden when active and visible', (doneFn: DoneFn) => {
    menuServiceSpy.isActive.and.returnValue(of(true))
    menuServiceSpy.isVisible.and.returnValue(of(true))

    const { component } = setUp()

    component.isHidden$.subscribe((isHidden) => {
      expect(isHidden).toBeFalse()
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
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.returnValue([])
    menuItemServiceSpy.constructMenuItems.and.returnValue([])
    spyOn(console, 'error')

    const { fixture, component } = setUp()
    spyGetMenuItems(component).and.returnValue(throwError(() => new Error('API error')))
    triggerWorkspace()

    // The pipeline retries 3 times with a 500ms delay before catchError resolves to undefined.
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await flush(fixture)

    const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
    const items = await slimUserMenu.getItems()
    expect(items.length).toBe(0)
    expect(console.error).toHaveBeenCalledWith('Unable to load menu items for slim user menu.')
  })

  it('should have correct number of items', async () => {
    menuServiceSpy.isActive.and.returnValue(of(true))
    menuServiceSpy.isVisible.and.returnValue(of(true))
    stubMenuServices()

    const { fixture, component } = setUp()
    spyGetMenuItems(component).and.callFake(() => of(fakeResponse))
    triggerWorkspace()
    await flush(fixture)

    const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
    await slimUserMenu.open()
    const items = await slimUserMenu.getItems()
    expect(menuItemServiceSpy.constructMenuItems).toHaveBeenCalledOnceWith([{ id: 'fake' } as any], 'en', '/')
    // +1 for the logout item
    expect(items.length).toBe(4)
  })

  it('should publish on logout', async () => {
    menuServiceSpy.isActive.and.returnValue(of(true))
    menuServiceSpy.isVisible.and.returnValue(of(true))
    menuItemServiceSpy.constructMenuItems.and.returnValue([])
    menuItemServiceSpy.mapMenuItemsToSlimMenuItems.and.callFake((items: any[]) => [
      ...items.map((item) => ({ ...item, active: false, type: ItemType.ACTION }))
    ])

    const { component, fixture } = setUp()
    spyGetMenuItems(component).and.callFake(() => of(fakeResponse))
    triggerWorkspace()
    await flush(fixture)
    spyOn(component['eventsPublisher'], 'publish')

    const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
    await slimUserMenu.open()
    const items = await slimUserMenu.getItems()
    expect(items.length).toBe(1) // Only the logout item
    await items[items.length - 1].click() // Click the logout item

    expect(component['eventsPublisher'].publish).toHaveBeenCalledWith({ type: 'authentication#logoutButtonClicked' })
  })

  describe('displayName$', () => {
    beforeEach(() => {
      menuServiceSpy.isActive.and.returnValue(of(false))
    })

    it('should use displayName when available', (doneFn: DoneFn) => {
      userServiceMock.profile$.publish({ person: { displayName: 'John Doe' } } as any)

      const { component } = setUp()

      component.displayName$.subscribe((name) => {
        expect(name).toBe('John Doe')
        doneFn()
      })
    })

    it('should concatenate firstName and lastName when displayName is absent', (doneFn: DoneFn) => {
      userServiceMock.profile$.publish({ person: { firstName: 'Mary', lastName: 'Jane' } } as any)

      const { component } = setUp()

      component.displayName$.subscribe((name) => {
        expect(name).toBe('Mary Jane')
        doneFn()
      })
    })

    it('should fall back to userId when no name fields are available', (doneFn: DoneFn) => {
      userServiceMock.profile$.publish({ person: {}, userId: 'user1' } as any)

      const { component } = setUp()

      component.displayName$.subscribe((name) => {
        expect(name).toBe('user1')
        doneFn()
      })
    })
  })

  describe('SLIM MODE', () => {
    beforeEach(() => {
      stubMenuServices()
      menuServiceSpy.isActive.and.callFake((menuMode) => (menuMode === SlimMenuMode.SLIM ? of(true) : of(false)))
      menuServiceSpy.isVisible.and.returnValue(of(true))
    })

    it('should have correct classes and styles', async () => {
      // Set 1 rem to 16px
      document.documentElement.style.fontSize = '16px'

      const { fixture, component } = setUp()
      spyGetMenuItems(component).and.callFake(() => of(fakeResponse))
      triggerWorkspace()
      await flush(fixture)

      const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
      await slimUserMenu.open()
      const items = await slimUserMenu.getItems()
      expect(items.length).toBe(4)
    })

    it('should have correct header style', async () => {
      // Set 1 rem to 16px
      document.documentElement.style.fontSize = '16px'

      const { fixture } = setUp()

      const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
      const header = await slimUserMenu.getHeader()
      expect(header).not.toBe(null)
    })
  })

  describe('SLIM_PLUS MODE', () => {
    beforeEach(() => {
      stubMenuServices()
      menuServiceSpy.isActive.and.callFake((menuMode) => (menuMode === SlimMenuMode.SLIM_PLUS ? of(true) : of(false)))
      menuServiceSpy.isVisible.and.returnValue(of(true))
    })

    it('should have correct classes and styles', async () => {
      // Set 1 rem to 16px
      document.documentElement.style.fontSize = '16px'

      const { fixture, component } = setUp()
      spyGetMenuItems(component).and.callFake(() => of(fakeResponse))
      triggerWorkspace()
      await flush(fixture)

      const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
      await slimUserMenu.open()
      const items = await slimUserMenu.getItems()
      expect(items.length).toBe(4)
    })

    it('should have correct header style', async () => {
      // Set 1 rem to 16px
      document.documentElement.style.fontSize = '16px'

      const { fixture } = setUp()

      const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
      const header = await slimUserMenu.getHeader()
      expect(header).not.toBe(null)
      expect(await header!.getAttribute('class')).toContain('slim-user-menu-header-plus')
    })
  })

  describe('Header', () => {
    beforeEach(() => {
      menuServiceSpy.isActive.and.callFake((menuMode) => (menuMode === SlimMenuMode.SLIM ? of(true) : of(false)))
      menuServiceSpy.isVisible.and.returnValue(of(true))
    })

    it('should display icon if avatar image not loaded', async () => {
      const { fixture, component } = setUp()
      spyGetMenuItems(component).and.callFake(() => of({ workspaceName: 'workspace', menu: [] } as any))

      const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)

      component.avatarImageLoadedEmitter.emit(undefined)

      const headerIcon = await slimUserMenu.getHeaderIcon()
      expect(headerIcon).not.toBeNull()
      expect(await headerIcon!.getAttribute('class')).toContain('pi pi-user')
    })

    it('should not display icon if avatar image is loaded', async () => {
      const { fixture, component } = setUp()
      spyGetMenuItems(component).and.callFake(() => of({ workspaceName: 'workspace', menu: [] } as any))

      const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)

      component.avatarImageLoadedEmitter.emit(true)
      fixture.detectChanges()

      const headerIcon = await slimUserMenu.getHeaderIcon()
      expect(headerIcon).toBeNull()
    })

    it('should return text from getHeaderText when header element is present', async () => {
      const { fixture, component } = setUp()
      spyGetMenuItems(component).and.callFake(() => of({ workspaceName: 'workspace', menu: [] } as any))

      const slimUserMenu = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXSlimUserMenuHarness)
      const headerText = await slimUserMenu.getHeaderText()
      expect(headerText).not.toBeNull()
    })
  })
})
