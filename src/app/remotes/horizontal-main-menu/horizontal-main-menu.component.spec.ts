import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { provideRouter, Router } from '@angular/router'
import { firstValueFrom, of, ReplaySubject, throwError } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { Menubar } from 'primeng/menubar'
import { PrimeIcons } from 'primeng/api'

import { AppStateService } from '@onecx/angular-integration-interface'
import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { provideAppStateServiceMock, provideUserServiceMock } from '@onecx/angular-integration-interface/mocks'

import { MenuItemAPIService } from 'src/app/shared/generated'
import { MenuService } from 'src/app/shared/services/menu.service'
import { OneCXHorizontalMainMenuComponent } from './horizontal-main-menu.component'
import { MenuBarHarness } from './horizontal-main-menu.component.harness'

describe('OneCXHorizontalMainMenuComponent', () => {
  const menuServiceSpy = jasmine.createSpyObj<MenuService>('MenuService', ['isVisible', 'isActive'])
  // the component injects this token - it must be provided (a ReplaySubject, like the real host)
  const rcConfig = new ReplaySubject<RemoteComponentConfig>(1)
  const defaultConfig: RemoteComponentConfig = {
    appId: 'appId',
    productName: 'prodName',
    permissions: ['permission'],
    baseUrl: 'base'
  }

  const menuResponse = (children: any[]) =>
    ({
      workspaceName: 'test-workspace',
      menu: [{ key: 'PORTAL_MAIN_MENU', name: 'Main Menu', children }]
    }) as any

  function setUp() {
    const fixture = TestBed.createComponent(OneCXHorizontalMainMenuComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()
    return { fixture, component }
  }

  // MenuItemAPIService is providedIn 'any', so the component holds its own instance and a
  // root-level provider would be shadowed - spy on the actual instance it uses.
  function spyGetMenuItems(component: OneCXHorizontalMainMenuComponent): jasmine.Spy {
    return spyOn(
      (component as unknown as { menuItemApiService: MenuItemAPIService }).menuItemApiService,
      'getMenuItems'
    )
  }

  // the menu pipeline is driven by the current workspace emission
  function publishWorkspace(workspace: { workspaceName: string; baseUrl?: string }): void {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(of(workspace as any))
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OneCXHorizontalMainMenuComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([{ path: 'admin/welcome', component: OneCXHorizontalMainMenuComponent }]),
        provideUserServiceMock(),
        provideAppStateServiceMock(),
        { provide: MenuService, useValue: menuServiceSpy },
        { provide: REMOTE_COMPONENT_CONFIG, useValue: rcConfig }
      ]
    }).compileComponents()

    rcConfig.next(defaultConfig)
    menuServiceSpy.isActive.and.returnValue(of(true))
    menuServiceSpy.isVisible.and.returnValue(of(true))
  })

  it('should create', () => {
    const { component } = setUp()

    expect(component).toBeTruthy()
  })

  it('should call ocxInitRemoteComponent with the correct config', () => {
    const { component } = setUp()
    const mockConfig: RemoteComponentConfig = {
      appId: 'appId',
      productName: 'prodName',
      permissions: ['permission'],
      baseUrl: 'base'
    }
    spyOn(component, 'ocxInitRemoteComponent')

    component.ocxRemoteComponentConfig = mockConfig

    expect(component.ocxInitRemoteComponent).toHaveBeenCalledWith(mockConfig)
  })

  it('should init remote component', async () => {
    const { component } = setUp()
    const mockConfig = { baseUrl: 'base_url' } as RemoteComponentConfig

    component.ocxInitRemoteComponent(mockConfig)

    const menuItemApi = (component as unknown as { menuItemApiService: MenuItemAPIService }).menuItemApiService
    expect(menuItemApi.configuration.basePath).toEqual('base_url/bff')
    expect(await firstValueFrom(component.remoteComponentConfig)).toEqual(mockConfig)
  })

  it('should render menu in correct positions', async () => {
    const { fixture, component } = setUp()
    publishWorkspace({ workspaceName: 'test-workspace', baseUrl: '/' })
    spyGetMenuItems(component).and.returnValue(
      of(
        menuResponse([
          {
            key: 'CORE_WELCOME',
            name: 'Welcome Page',
            url: '/admin/welcome',
            position: 1,
            external: false,
            i18n: {},
            children: []
          },
          {
            key: 'CORE_AH_MGMT',
            name: 'Announcement and Help',
            url: '/announcementAndHelpUrl',
            position: 0,
            external: false,
            i18n: {},
            children: []
          }
        ])
      )
    )

    await component.ngOnInit()
    // menuItems$ is (re)assigned in ngOnInit; run CD so the async pipe subscribes to the new
    // observable and picks up its value, then again so the value propagates to <p-menubar [model]>
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, MenuBarHarness)
    const menuItems = await menu.getAllMenuItems()
    expect(menuItems.length).toEqual(2)

    expect(await menuItems[0].getText()).toEqual('Announcement and Help')
    expect(await menuItems[1].getText()).toEqual('Welcome Page')
  })

  it('should use translations whenever i18n translation is provided', async () => {
    const { fixture, component } = setUp()
    publishWorkspace({ workspaceName: 'test-workspace', baseUrl: '/' })
    spyGetMenuItems(component).and.returnValue(
      of(
        menuResponse([
          {
            key: 'CORE_WELCOME',
            name: 'Welcome Page',
            url: '/admin/welcome',
            position: 1,
            external: false,
            i18n: {
              en: 'English welcome page'
            },
            children: []
          }
        ])
      )
    )

    await component.ngOnInit()
    // menuItems$ is (re)assigned in ngOnInit; run CD so the async pipe subscribes to the new
    // observable and picks up its value, then again so the value propagates to <p-menubar [model]>
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, MenuBarHarness)
    const menuItems = await menu.getAllMenuItems()
    expect(menuItems.length).toEqual(1)

    expect(await menuItems[0].getText()).toEqual('English welcome page')
  })

  it('should display icon if provided', async () => {
    const { fixture, component } = setUp()
    publishWorkspace({ workspaceName: 'test-workspace', baseUrl: '/' })
    spyGetMenuItems(component).and.returnValue(
      of(
        menuResponse([
          {
            key: 'CORE_WELCOME',
            name: 'Welcome Page',
            url: '/admin/welcome',
            position: 0,
            badge: 'home',
            external: false,
            children: []
          }
        ])
      )
    )

    await component.ngOnInit()
    // menuItems$ is (re)assigned in ngOnInit; run CD so the async pipe subscribes to the new
    // observable and picks up its value, then again so the value propagates to <p-menubar [model]>
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, MenuBarHarness)
    const menuItems = await menu.getAllMenuItems()
    expect(menuItems.length).toEqual(1)

    expect(await menuItems[0].hasIcon(PrimeIcons.HOME)).toBeTrue()
  })

  it('should use routerLink for local urls', async () => {
    const { fixture, component } = setUp()
    publishWorkspace({ workspaceName: 'test-workspace', baseUrl: '/' })
    spyGetMenuItems(component).and.returnValue(
      of(
        menuResponse([
          {
            key: 'CORE_WELCOME',
            name: 'Welcome Page',
            url: '/admin/welcome',
            position: 0,
            external: false,
            children: []
          }
        ])
      )
    )
    const router = TestBed.inject(Router)

    await component.ngOnInit()
    // menuItems$ is (re)assigned in ngOnInit; run CD so the async pipe subscribes to the new
    // observable and picks up its value, then again so the value propagates to <p-menubar [model]>
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, MenuBarHarness)
    const menuItems = await menu.getAllMenuItems()
    expect(menuItems.length).toEqual(1)
    await menuItems[0].click()
    expect(router.url).toBe('/admin/welcome')
  })

  it('should use href for external urls', async () => {
    const { fixture, component } = setUp()
    publishWorkspace({ workspaceName: 'test-workspace', baseUrl: '/' })
    spyGetMenuItems(component).and.returnValue(
      of(
        menuResponse([
          {
            key: 'Google',
            name: 'Go to google',
            url: 'https://www.google.com/',
            position: 0,
            external: true,
            children: []
          }
        ])
      )
    )

    await component.ngOnInit()
    // menuItems$ is (re)assigned in ngOnInit; run CD so the async pipe subscribes to the new
    // observable and picks up its value, then again so the value propagates to <p-menubar [model]>
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, MenuBarHarness)
    const menuItems = await menu.getAllMenuItems()
    expect(menuItems.length).toEqual(1)
    expect(await menuItems[0].getLink()).toBe('https://www.google.com/')
  })

  it('should render submenus', async () => {
    const { fixture, component } = setUp()
    publishWorkspace({ workspaceName: 'test-workspace', baseUrl: '/' })
    spyGetMenuItems(component).and.returnValue(
      of(
        menuResponse([
          {
            key: 'CORE_WELCOME',
            name: 'Welcome Page',
            url: '/admin/welcome',
            position: 0,
            external: false,
            i18n: {},
            children: []
          },
          {
            key: 'CORE_AH_MGMT',
            name: 'Announcement and Help',
            url: '',
            position: 1,
            external: false,
            i18n: {},
            children: [
              {
                key: 'CORE_AH_MGMT_A',
                name: 'Announcements',
                url: '/admin/announcement',
                position: 1,
                external: false,
                i18n: {},
                children: []
              },
              {
                key: 'CORE_AH_MGMT_HI',
                name: 'Help Items',
                url: '/admin/help',
                position: 2,
                external: false,
                i18n: {},
                children: []
              }
            ]
          }
        ])
      )
    )

    await component.ngOnInit()
    // menuItems$ is (re)assigned in ngOnInit; run CD so the async pipe subscribes to the new
    // observable and picks up its value, then again so the value propagates to <p-menubar [model]>
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, MenuBarHarness)
    const menuItems = await menu.getAllMenuItems()
    expect(menuItems.length).toEqual(4)

    expect((await menuItems[0].getChildren()).length).toBe(0)
    const secondItemChildren = await menuItems[1].getChildren()
    expect(secondItemChildren.length).toBe(2)
    expect(await secondItemChildren[0].getText()).toEqual('Announcements')
    expect((await secondItemChildren[0].getChildren()).length).toBe(0)
    expect(await secondItemChildren[1].getText()).toEqual('Help Items')
    expect((await secondItemChildren[1].getChildren()).length).toBe(0)
  })

  it('should return 0 menu items when unable to load them', async () => {
    const { fixture, component } = setUp()
    const appStateService = TestBed.inject(AppStateService)
    spyOn(console, 'error')
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({ workspaceName: 'test-workspace' } as any)
    )
    spyGetMenuItems(component).and.returnValue(throwError(() => new Error('API error')))

    await component.ngOnInit()
    // getMenuItems retries (delay 500ms x 3) before the catchError emits - wait for it to settle
    await new Promise((resolve) => setTimeout(resolve, 1600))

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, MenuBarHarness)
    const menuItems = await menu.getAllMenuItems()
    expect(menuItems.length).toEqual(0)
    expect(console.error).toHaveBeenCalled()
  })

  it('should call menubar.hide() on mouseleave event', () => {
    const { component } = setUp()
    const mockMenubar = {
      el: { nativeElement: {} },
      hide: jasmine.createSpy('hide')
    } as unknown as Menubar
    let mouseleaveCallback: ((event: any) => void) | undefined

    spyOn(component['renderer'], 'listen').and.callFake((_el: any, event: string, callback: (event: any) => void) => {
      if (event === 'mouseleave') {
        mouseleaveCallback = callback
      }
      return () => {}
    })

    component['menubarSetter'] = mockMenubar
    mouseleaveCallback?.({})

    expect(mockMenubar.hide).toHaveBeenCalled()
  })

  it('should not register listener when menubar is undefined', () => {
    const { component } = setUp()
    const listenSpy = spyOn(component['renderer'], 'listen')

    component['menubarSetter'] = undefined

    expect(listenSpy).not.toHaveBeenCalled()
  })
})
