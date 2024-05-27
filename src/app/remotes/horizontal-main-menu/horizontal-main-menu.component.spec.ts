import { TestBed } from '@angular/core/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { CommonModule } from '@angular/common'
import { Router, RouterModule } from '@angular/router'
import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { AppStateService } from '@onecx/angular-integration-interface'
import { PMenuBarHarness } from '@onecx/angular-testing'
import { ReplaySubject, of } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { MenubarModule } from 'primeng/menubar'
import { PrimeIcons } from 'primeng/api'
import { MenuItemAPIService } from 'src/app/shared/generated'
import { OneCXHorizontalMainMenuComponent } from './horizontal-main-menu.component'

describe('OneCXHorizontalMainMenuComponent', () => {
  const menuItemApiSpy = jasmine.createSpyObj<MenuItemAPIService>('MenuItemAPIService', ['getMenuItems'])

  function setUp() {
    const fixture = TestBed.createComponent(OneCXHorizontalMainMenuComponent)
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
        RouterTestingModule.withRoutes([
          {
            path: 'admin/welcome',
            component: {} as any
          },
          {
            path: '',
            component: {} as any
          }
        ])
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BASE_URL,
          useValue: baseUrlSubject
        }
      ]
    })
      .overrideComponent(OneCXHorizontalMainMenuComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule, RouterModule, MenubarModule],
          providers: [{ provide: MenuItemAPIService, useValue: menuItemApiSpy }]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')

    menuItemApiSpy.getMenuItems.calls.reset()
  })

  it('should create', () => {
    const { component } = setUp()

    expect(component).toBeTruthy()
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
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PMenuBarHarness)
    const menuItems = await menu.getAllMenuItems()
    expect(menuItems.length).toEqual(2)

    expect(await menuItems[0].getText()).toEqual('Announcement & Help')
    expect(await menuItems[1].getText()).toEqual('Welcome Page')
  })

  it('should use translations whenever i18n translation is provided', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({
        workspaceName: 'test-workspace'
      }) as any
    )
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
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PMenuBarHarness)
    const menuItems = await menu.getAllMenuItems()
    expect(menuItems.length).toEqual(1)

    expect(await menuItems[0].getText()).toEqual('English welcome page')
  })

  it('should display icon if provided', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({
        workspaceName: 'test-workspace'
      }) as any
    )
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
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PMenuBarHarness)
    const menuItems = await menu.getAllMenuItems()
    expect(menuItems.length).toEqual(1)

    expect(await menuItems[0].hasIcon(PrimeIcons.HOME)).toBeTrue()
  })

  it('should use routerLink for local urls', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({
        workspaceName: 'test-workspace'
      }) as any
    )
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
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PMenuBarHarness)
    const menuItems = await menu.getAllMenuItems()
    expect(menuItems.length).toEqual(1)
    await menuItems[0].click()
    expect(router.url).toBe('/admin/welcome')
  })

  it('should use href for external urls', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({
        workspaceName: 'test-workspace'
      }) as any
    )
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
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PMenuBarHarness)
    const menuItems = await menu.getAllMenuItems()
    expect(menuItems.length).toEqual(1)
    expect(await menuItems[0].getLink()).toBe('https://www.google.com/')
  })

  it('should render submenus', async () => {
    const appStateService = TestBed.inject(AppStateService)
    spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
      of({
        workspaceName: 'test-workspace'
      }) as any
    )
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
            ]
          }
        ]
      } as any)
    )

    const { fixture, component } = setUp()
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PMenuBarHarness)
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
})
