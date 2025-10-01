import { TestBed } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideRouter, Router, RouterModule } from '@angular/router'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject, of, throwError } from 'rxjs'
import { PanelMenuModule } from 'primeng/panelmenu'
import { PrimeIcons } from 'primeng/api'

import { PPanelMenuHarness } from '@onecx/angular-testing'
import { AppStateService, Capability } from '@onecx/angular-integration-interface'
import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'

import { MenuItemAPIService } from 'src/app/shared/generated'
import { OneCXVerticalMainMenuComponent } from './vertical-main-menu.component'
import {
  provideShellCapabilityServiceMock,
  ShellCapabilityServiceMock
} from '@onecx/angular-integration-interface/mocks'
import { MenuService } from 'src/app/shared/services/menu.service'

describe('OneCXVerticalMainMenuComponent', () => {
  const menuItemApiSpy = jasmine.createSpyObj<MenuItemAPIService>('MenuItemAPIService', ['getMenuItems'])
  const menuServiceSpy = jasmine.createSpyObj<MenuService>('MenuService', ['isVisible', 'isActive'])

  function setUp() {
    const fixture = TestBed.createComponent(OneCXVerticalMainMenuComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()

    return { fixture, component }
  }

  let baseUrlSubject: ReplaySubject<any>
  beforeEach(() => {
    baseUrlSubject = new ReplaySubject<any>(1)
    TestBed.configureTestingModule({
      declarations: [],
      imports: [
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
        provideRouter([{ path: 'admin/welcome', component: OneCXVerticalMainMenuComponent }]),
        provideShellCapabilityServiceMock(),
        { provide: MenuService, useValue: menuServiceSpy }
      ]
    })
      .overrideComponent(OneCXVerticalMainMenuComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule, RouterModule, PanelMenuModule],
          providers: [{ provide: MenuItemAPIService, useValue: menuItemApiSpy }]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')
    menuServiceSpy.isActive.and.returnValue(of(true))
    menuServiceSpy.isVisible.and.returnValue(of(true))
    menuItemApiSpy.getMenuItems.calls.reset()
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

  it('should init remote component', (done: DoneFn) => {
    const { component } = setUp()

    component.ocxInitRemoteComponent({
      baseUrl: 'base_url'
    } as RemoteComponentConfig)

    expect(menuItemApiSpy.configuration.basePath).toEqual('base_url/bff')
    baseUrlSubject.asObservable().subscribe((item) => {
      expect(item).toEqual('base_url')
      done()
    })
  })

  it('should render menu in correct positions', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({
        workspaceName: 'test-workspace'
      }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))
    menuItemApiSpy.getMenuItems.and.returnValue(
      of({
        workspaceName: 'test-workspace',
        menu: [
          {
            key: 'PORTAL_MAIN_MENU',
            name: 'Main Menu',
            children: [
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
            ]
          }
        ]
      } as any)
    )

    const { fixture, component } = setUp()
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(
      of({
        url: 'page-url',
        isFirst: true
      })
    )
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PPanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(2)

    expect(await panels[0].getText()).toEqual('Announcement & Help')
    expect(await panels[1].getText()).toEqual('Welcome Page')
  })

  it('should use translations whenever i18n translation is provided', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({
        workspaceName: 'test-workspace'
      }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))
    menuItemApiSpy.getMenuItems.and.returnValue(
      of({
        workspaceName: 'test-workspace',
        menu: [
          {
            key: 'PORTAL_MAIN_MENU',
            name: 'Main Menu',
            children: [
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
            ]
          }
        ]
      } as any)
    )

    const { fixture, component } = setUp()
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(
      of({
        url: 'page-url',
        isFirst: true
      })
    )
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PPanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(1)

    expect(await panels[0].getText()).toEqual('English welcome page')
  })

  it('should display icon if provided', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({
        workspaceName: 'test-workspace'
      }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))
    menuItemApiSpy.getMenuItems.and.returnValue(
      of({
        workspaceName: 'test-workspace',
        menu: [
          {
            key: 'PORTAL_MAIN_MENU',
            name: 'Main Menu',
            children: [
              {
                key: 'CORE_WELCOME',
                name: 'Welcome Page',
                url: '/admin/welcome',
                position: 0,
                badge: 'home',
                external: false,
                children: []
              }
            ]
          }
        ]
      } as any)
    )

    const { fixture, component } = setUp()
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(
      of({
        url: 'page-url',
        isFirst: true
      })
    )
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PPanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(1)

    expect(await panels[0].hasIcon(PrimeIcons.HOME)).toBeTrue()
  })

  it('should use routerLink for local urls', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({
        workspaceName: 'test-workspace'
      }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))
    menuItemApiSpy.getMenuItems.and.returnValue(
      of({
        workspaceName: 'test-workspace',
        menu: [
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
                children: []
              }
            ]
          }
        ]
      } as any)
    )
    const router = TestBed.inject(Router)

    const { fixture, component } = setUp()
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(
      of({
        url: 'page-url',
        isFirst: true
      })
    )
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PPanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(1)
    await panels[0].click()
    expect(router.url).toBe('/admin/welcome')
  })

  it('should use href for external urls', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({
        workspaceName: 'test-workspace'
      }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))
    menuItemApiSpy.getMenuItems.and.returnValue(
      of({
        workspaceName: 'test-workspace',
        menu: [
          {
            key: 'PORTAL_MAIN_MENU',
            name: 'Main Menu',
            children: [
              {
                key: 'Google',
                name: 'Go to google',
                url: 'https://www.google.com/',
                position: 0,
                external: true,
                children: []
              }
            ]
          }
        ]
      } as any)
    )

    const { fixture, component } = setUp()
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(
      of({
        url: 'page-url',
        isFirst: true
      })
    )
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PPanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(1)
    expect(await panels[0].getLink()).toBe('https://www.google.com/')
  })

  it('should render submenus', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({
        workspaceName: 'test-workspace'
      }) as any
    )
    spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))
    menuItemApiSpy.getMenuItems.and.returnValue(
      of({
        workspaceName: 'test-workspace',
        menu: [
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
      } as any)
    )

    const { fixture, component } = setUp()
    spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(
      of({
        url: 'page-url',
        isFirst: true
      })
    )
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PPanelMenuHarness)
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
        of({
          workspaceName: 'test-workspace'
        }) as any
      )
      spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))
      menuItemApiSpy.getMenuItems.and.returnValue(
        of({
          workspaceName: 'test-workspace',
          menu: baseItems
        } as any)
      )

      const { fixture, component } = setUp()
      spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(
        of({
          url: '/admin/help',
          isFirst: true
        })
      )
      await component.ngOnInit()

      const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PPanelMenuHarness)
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
        of({
          workspaceName: 'test-workspace'
        }) as any
      )
      spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))
      menuItemApiSpy.getMenuItems.and.returnValue(
        of({
          workspaceName: 'test-workspace',
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

      const { component } = setUp()
      spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(
        of({
          url: '/admin/help',
          isFirst: true
        })
      )
      component.menuItems$.next({
        workspaceName: 'test-workspace',
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
        of({
          workspaceName: 'other-workspace'
        }) as any
      )
      spyOn(appStateService.currentMfe$, 'asObservable').and.returnValue(of({} as any))
      menuItemApiSpy.getMenuItems.and.returnValue(
        of({
          workspaceName: 'other-workspace',
          menu: [
            {
              key: 'PORTAL_MAIN_MENU',
              name: 'Main Menu',
              children: [
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
            }
          ]
        } as any)
      )

      const { component } = setUp()
      spyOn(appStateService.currentLocation$, 'asObservable').and.returnValue(
        of({
          url: '/admin/help',
          isFirst: true
        })
      )
      component.menuItems$.next({
        workspaceName: 'test-workspace',
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
    spyOn(console, 'error')
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({
        workspaceName: 'test-workspace'
      }) as any
    )
    menuItemApiSpy.getMenuItems.and.returnValue(throwError(() => {}))

    const { fixture, component } = setUp()
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PPanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(0)
    expect(console.error).toHaveBeenCalled()
  })
})
