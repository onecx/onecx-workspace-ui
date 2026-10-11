import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideRouter, Router } from '@angular/router'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { firstValueFrom, of, throwError } from 'rxjs'

import { PrimeIcons } from 'primeng/api'

import { AppStateService, Capability } from '@onecx/angular-integration-interface'
import { RemoteComponentConfig } from '@onecx/angular-remote-components'
import {
  FakeTopic,
  provideAppConfigServiceMock,
  provideAppStateServiceMock,
  provideShellCapabilityServiceMock,
  provideUserServiceMock,
  ShellCapabilityServiceMock
} from '@onecx/angular-integration-interface/mocks'

import { MenuItemAPIService } from 'src/app/shared/generated'
import { MenuService } from 'src/app/shared/services/menu.service'
import { OneCXVerticalMainMenuComponent } from './vertical-main-menu.component'
import { PanelMenuHarness } from './vertical-main-menu.component.harness'

describe('OneCXVerticalMainMenuComponent', () => {
  const menuServiceSpy = jasmine.createSpyObj<MenuService>('MenuService', ['isVisible', 'isActive'])

  const menuResponse = (children: any[]) =>
    ({
      workspaceName: 'test-workspace',
      menu: [{ key: 'PORTAL_MAIN_MENU', name: 'Main Menu', children }]
    }) as any

  // Tests install their spies (workspace / mfe / location / getMenuItems) and then call ngOnInit
  // explicitly, so the menu pipeline always runs against the mocked services. The initial
  // detectChanges() is crucial: it subscribes the template's async pipe (menuItems$) to the stable
  // BehaviorSubject BEFORE ngOnInit emits the value, so the OnPush <p-panelMenu> re-checks [model]
  // and renders (mirrors horizontal-main-menu). Without it the async pipe never picks up the value.
  function setUp() {
    const fixture = TestBed.createComponent(OneCXVerticalMainMenuComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()
    return { fixture, component }
  }

  // MenuItemAPIService is providedIn 'any', so the component holds its own instance and a
  // root-level provider would be shadowed - spy the actual instance it uses.
  function spyGetMenuItems(component: OneCXVerticalMainMenuComponent): jasmine.Spy {
    return spyOn(
      (component as unknown as { menuItemApiService: MenuItemAPIService }).menuItemApiService,
      'getMenuItems'
    )
  }

  // Flush change detection so the async pipes (menuItems$) render after ngOnInit emits.
  async function flush(fixture: ComponentFixture<OneCXVerticalMainMenuComponent>): Promise<void> {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        OneCXVerticalMainMenuComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([{ path: 'admin/welcome', component: OneCXVerticalMainMenuComponent }]),
        provideAppConfigServiceMock(),
        provideUserServiceMock(),
        provideAppStateServiceMock(),
        provideShellCapabilityServiceMock(),
        { provide: MenuService, useValue: menuServiceSpy }
      ]
    })

    menuServiceSpy.isActive.and.returnValue(of(true))
    menuServiceSpy.isVisible.and.returnValue(of(true))
    ShellCapabilityServiceMock.setCapabilities([Capability.CURRENT_LOCATION_TOPIC])
  })

  it('should create', () => {
    const { component } = setUp()

    expect(component).toBeTruthy()
  })

  it('should create if CURRENT_LOCATION_TOPIC capability is not set', () => {
    ShellCapabilityServiceMock.setCapabilities([])
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

    component.ocxInitRemoteComponent({ baseUrl: 'base_url' } as RemoteComponentConfig)

    // The component re-bases its own API service and pushes the config to its own rc token.
    const api = (component as unknown as { menuItemApiService: MenuItemAPIService }).menuItemApiService
    expect(api.configuration.basePath).toEqual('base_url/bff')
    expect((await firstValueFrom(component['remoteComponentConfig']))?.baseUrl).toEqual('base_url')
  })

  it('should render menu in correct positions', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({ workspaceName: 'test-workspace' }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))

    const { fixture, component } = setUp()
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
            name: 'Announcement & Help',
            url: '/announcementAndHelpUrl',
            position: 0,
            external: false,
            i18n: {},
            children: []
          }
        ])
      )
    )
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(of({ url: 'page-url', isFirst: true }))

    await component.ngOnInit()
    await flush(fixture)

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(2)

    expect(await panels[0].getText()).toEqual('Announcement & Help')
    expect(await panels[1].getText()).toEqual('Welcome Page')
  })

  it('should use translations whenever i18n translation is provided', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({ workspaceName: 'test-workspace' }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))

    const { fixture, component } = setUp()
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
              en: 'English welcome page',
              de: 'German welcome page'
            },
            children: []
          }
        ])
      )
    )
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(of({ url: 'page-url', isFirst: true }))

    await component.ngOnInit()
    await flush(fixture)

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(1)

    expect(await panels[0].getText()).toEqual('English welcome page')
  })

  it('should display icon if provided', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({ workspaceName: 'test-workspace' }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))

    const { fixture, component } = setUp()
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
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(of({ url: 'page-url', isFirst: true }))

    await component.ngOnInit()
    await flush(fixture)

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(1)

    expect(await panels[0].hasIcon(PrimeIcons.HOME)).toBeTrue()
  })

  it('should use routerLink for local urls', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({ workspaceName: 'test-workspace' }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))

    const { fixture, component } = setUp()
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
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(of({ url: 'page-url', isFirst: true }))
    const router = TestBed.inject(Router)

    await component.ngOnInit()
    await flush(fixture)

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(1)
    await panels[0].click()
    expect(router.url).toBe('/admin/welcome')
  })

  it('should use href for external urls', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({ workspaceName: 'test-workspace' }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))

    const { fixture, component } = setUp()
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
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(of({ url: 'page-url', isFirst: true }))

    await component.ngOnInit()
    await flush(fixture)

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(1)
    expect(await panels[0].getLink()).toBe('https://www.google.com/')
  })

  it('should render submenus', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({ workspaceName: 'test-workspace' }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))

    const { fixture, component } = setUp()
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
            name: 'Announcement & Help',
            url: 'page-url',
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
    // A child of the group is active, so the group (its parent) is expanded and its items render.
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(of({ url: '/admin/help', isFirst: true }))

    await component.ngOnInit()
    await flush(fixture)

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(2)

    expect((await panels[0].getChildren()).length).toBe(0)
    const secondItemChildren = await panels[1].getChildren()
    expect(secondItemChildren.length).toBe(2)
    expect(await secondItemChildren[0].getText()).toEqual('Announcements')
    expect((await secondItemChildren[0].getChildren()).length).toBe(0)
    expect(await secondItemChildren[1].getText()).toEqual('Help Items')
    expect((await secondItemChildren[1].getChildren()).length).toBe(0)
  })

  it('should use eventsTopic to determine active item if capability is not set', async () => {
    ShellCapabilityServiceMock.setCapabilities([])
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({ workspaceName: 'test-workspace' }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))

    const { fixture, component } = setUp()
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
            name: 'Announcement & Help',
            url: 'page-url',
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

    component['eventsTopic$'] = new FakeTopic() as any
    component['eventsTopic$'].publish({
      type: 'navigated',
      payload: {
        url: '/admin/help'
      }
    })
    await component.ngOnInit()
    await flush(fixture)

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(2)

    expect((await panels[0].getChildren()).length).toBe(0)
    const secondItemChildren = await panels[1].getChildren()
    expect(secondItemChildren.length).toBe(2)
    expect(await secondItemChildren[0].getText()).toEqual('Announcements')
    expect(await (await secondItemChildren[0].host()).hasClass(component.activeItemClass)).toBeFalse()
  })

  describe('on router changes', () => {
    const baseItems = [
      {
        key: 'PORTAL_MAIN_MENU',
        name: 'Main Menu',
        children: [
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
            name: 'Announcement & Help',
            url: 'page-url',
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
        ]
      }
    ]

    it('should expand active item parents', async () => {
      const appStateService = TestBed.inject(AppStateService)
      spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
        of({ workspaceName: 'test-workspace' }) as any
      )
      spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))

      const { fixture, component } = setUp()
      spyGetMenuItems(component).and.returnValue(
        of({
          workspaceName: 'test-workspace',
          menu: baseItems
        } as any)
      )
      spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(of({ url: '/admin/help', isFirst: true }))

      await component.ngOnInit()
      await flush(fixture)

      const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PanelMenuHarness)
      const panels = await menu.getAllPanels()
      expect(panels.length).toEqual(2)

      expect((await panels[0].getChildren()).length).toBe(0)
      const secondItemChildren = await panels[1].getChildren()
      expect(secondItemChildren.length).toBe(2)
      expect(await secondItemChildren[0].getText()).toEqual('Announcements')
      expect(await (await secondItemChildren[0].host()).hasClass(component.activeItemClass)).toBeFalse()
      expect(await secondItemChildren[1].getText()).toEqual('Help Items')
      expect(await (await secondItemChildren[1].host()).hasClass(component.activeItemClass)).toBeTrue()

      const menuItems = component.menuItems$.getValue()
      expect(menuItems?.items.length).toBe(2)
      expect(menuItems?.items[0].expanded).toBeFalsy()
      expect(menuItems?.items[1].expanded).toBeTrue()
    })

    it('should update items if workspace did not change', async () => {
      const appStateService = TestBed.inject(AppStateService)
      spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
        of({ workspaceName: 'test-workspace' }) as any
      )
      spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))

      const { component } = setUp()
      spyGetMenuItems(component).and.returnValue(
        of({
          workspaceName: 'test-workspace',
          workspaceBaseUrl: '/base-path',
          menu: [
            {
              key: 'my-item',
              name: 'item-name-1',
              url: '/admin/help',
              position: 2,
              external: false,
              i18n: {},
              children: []
            }
          ]
        } as any)
      )
      spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(of({ url: '/admin/help', isFirst: true }))
      component.menuItems$.next({
        workspaceName: 'test-workspace',
        workspaceBaseUrl: '/base-path',
        items: [
          {
            id: 'my-item',
            items: undefined,
            label: 'item-name-2',
            routerLink: '/admin/help'
          }
        ]
      })
      await component.ngOnInit()

      const menuItems = component.menuItems$.getValue()
      expect(menuItems?.items.length).toBe(1)
      expect(menuItems?.items[0].label).toBe('item-name-2')
    })

    it('should overwrite items if workspace has changed', async () => {
      const appStateService = TestBed.inject(AppStateService)
      spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
        of({ workspaceName: 'other-workspace' }) as any
      )
      spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))

      const { component } = setUp()
      spyGetMenuItems(component).and.returnValue(
        of(
          menuResponse([
            {
              key: 'my-item',
              name: 'item-name-1',
              url: '/admin/help',
              position: 2,
              external: false,
              i18n: {},
              children: []
            }
          ])
        )
      )
      spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(of({ url: '/admin/help', isFirst: true }))
      component.menuItems$.next({
        workspaceName: 'test-workspace',
        workspaceBaseUrl: '/base-path',
        items: [
          {
            id: 'my-item',
            items: undefined,
            label: 'item-name-2',
            routerLink: '/admin/help'
          }
        ]
      })
      await component.ngOnInit()

      const menuItems = component.menuItems$.getValue()
      expect(menuItems?.items.length).toBe(1)
      expect(menuItems?.items[0].label).toBe('item-name-1')
    })
  })

  it('should return 0 panels when unable to load them', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({ workspaceName: 'test-workspace' }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))

    const { fixture, component } = setUp()
    const errorResponse = { status: 400, statusText: 'An error occur' }
    spyGetMenuItems(component).and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(of({ url: 'page-url', isFirst: true }))

    await component.ngOnInit()
    // The pipeline retries 3 times with a 500ms delay before catchError resolves to undefined.
    await new Promise((resolve) => setTimeout(resolve, 1700))
    await flush(fixture)

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(0)
    expect(console.error).toHaveBeenCalled()
  })
})
