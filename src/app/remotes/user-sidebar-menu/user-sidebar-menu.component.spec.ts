import { TestBed } from '@angular/core/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { CommonModule } from '@angular/common'
import { provideRouter, Router, RouterModule } from '@angular/router'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateService } from '@ngx-translate/core'
import { BASE_URL, RemoteComponentConfig, SlotService } from '@onecx/angular-remote-components'
import { AppStateService, UserService } from '@onecx/angular-integration-interface'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject, of, throwError } from 'rxjs'
import { PanelMenuModule } from 'primeng/panelmenu'
import { AccordionModule } from 'primeng/accordion'
import { PrimeIcons } from 'primeng/api'
import { MenuItemAPIService } from 'src/app/shared/generated'
import { OneCXUserSidebarMenuComponent, slotInitializer } from './user-sidebar-menu.component'
import { OneCXUserSidebarMenuHarness } from './user-sidebar-menu.harness'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { UserProfile } from '@onecx/integration-interface'
import { AppConfigService } from '@onecx/angular-accelerator'

describe('OneCXUserSidebarMenuComponent', () => {
  const menuItemApiSpy = jasmine.createSpyObj<MenuItemAPIService>('MenuItemAPIService', ['getMenuItems'])

  const appConfigSpy = jasmine.createSpyObj<AppConfigService>('AppConfigService', ['init'])

  function setUp() {
    const fixture = TestBed.createComponent(OneCXUserSidebarMenuComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()

    return { fixture, component }
  }

  async function setUpWithHarness() {
    const { fixture, component } = setUp()
    const sidebarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXUserSidebarMenuHarness)
    return { fixture, component, sidebarMenuHarness }
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
        {
          provide: AppConfigService,
          useValue: appConfigSpy
        },
        provideRouter([{ path: 'admin/user-profile', component: OneCXUserSidebarMenuComponent }])
      ]
    })
      .overrideComponent(OneCXUserSidebarMenuComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule, RouterModule, PanelMenuModule, AccordionModule],
          providers: [{ provide: MenuItemAPIService, useValue: menuItemApiSpy }],
          schemas: [NO_ERRORS_SCHEMA]
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
      expect(appConfigSpy.init).toHaveBeenCalledOnceWith('base_url')
      done()
    })
  })

  describe('user section', () => {
    it('should display person displayName', async () => {
      const userService = TestBed.inject(UserService)
      spyOn(userService.profile$, 'asObservable').and.returnValue(
        of({
          userId: 'my-user-id',
          organization: 'org',
          person: {
            displayName: 'My user',
            firstName: 'Name',
            lastName: 'Lastname'
          }
        }) as any
      )

      const { sidebarMenuHarness } = await setUpWithHarness()

      expect(await sidebarMenuHarness.getDisplayName()).toEqual('My user')
    })

    it('should display person firstName and lastName when displayName unavailable', async () => {
      const userService = TestBed.inject(UserService)
      spyOn(userService.profile$, 'asObservable').and.returnValue(
        of({
          userId: 'my-user-id',
          organization: 'org',
          person: {
            displayName: undefined,
            firstName: 'Name',
            lastName: 'Lastname'
          }
        }) as any
      )

      const { sidebarMenuHarness } = await setUpWithHarness()

      expect(await sidebarMenuHarness.getDisplayName()).toEqual('Name Lastname')
    })

    it('should display userId when none other user info available', async () => {
      const userService = TestBed.inject(UserService)
      spyOn(userService.profile$, 'asObservable').and.returnValue(
        of({
          userId: 'my-user-id',
          organization: 'org',
          person: {
            displayName: undefined,
            firstName: undefined,
            lastName: undefined
          }
        }) as any
      )

      const { sidebarMenuHarness } = await setUpWithHarness()

      expect(await sidebarMenuHarness.getDisplayName()).toEqual('my-user-id')
    })

    it('should display guest when no user info', async () => {
      const fixture = TestBed.createComponent(OneCXUserSidebarMenuComponent)
      const component = fixture.componentInstance

      const result = component.determineDisplayName(undefined as unknown as UserProfile)

      expect(result).toBe('Guest')
    })

    it('should activate inline profile', () => {
      const fixture = TestBed.createComponent(OneCXUserSidebarMenuComponent)
      const component = fixture.componentInstance
      const mockEvent = {
        preventDefault: jasmine.createSpy('preventDefault')
      } as unknown as UIEvent

      component.onInlineProfileClick(mockEvent)

      expect(component.inlineProfileActive).toBe(true)
    })
  })

  describe('menu section', () => {
    beforeEach(() => {
      const userService = TestBed.inject(UserService)
      spyOn(userService.profile$, 'asObservable').and.returnValue(
        of({
          userId: 'my-user-id',
          organization: 'org',
          person: {
            displayName: 'My user',
            firstName: 'Name',
            lastName: 'Lastname'
          }
        }) as any
      )
      const appStateService = TestBed.inject(AppStateService)
      spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
        of({
          workspaceName: 'test-workspace'
        }) as any
      )
    })

    it('should render menu in correct positions', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(
        of({
          workspaceName: 'test-workspace',
          menu: [
            {
              key: 'USER_PROFILE_MENU',
              name: 'User Profile Menu',
              children: [
                {
                  key: 'PERSONAL_INFO',
                  name: 'Personal Info',
                  url: '/admin/user-profile',
                  position: 1,
                  external: false,
                  i18n: {},
                  children: []
                },
                {
                  key: 'ACCOUNT_SETTINGS',
                  name: 'Account Settings',
                  url: '/admin/user-profile/account',
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

      const { sidebarMenuHarness } = await setUpWithHarness()
      await sidebarMenuHarness.expandAccordion()

      const menu = await sidebarMenuHarness.getPanelMenu()
      expect(menu).toBeTruthy()
      const panels = await menu?.getAllPanels()
      expect(panels?.length).toEqual(3)

      expect(await panels![0].getText()).toEqual('Account Settings')
      expect(await panels![1].getText()).toEqual('Personal Info')
      expect(await panels![2].getText()).toEqual('Log out')
    })

    it('should use translations whenever i18n translation is provided', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(
        of({
          workspaceName: 'test-workspace',
          menu: [
            {
              key: 'USER_PROFILE_MENU',
              name: 'User Profile Menu',
              children: [
                {
                  key: 'PERSONAL_INFO',
                  name: 'Personal Info',
                  url: '/admin/user-profile',
                  position: 1,
                  external: false,
                  i18n: {
                    en: 'English personal info',
                    de: 'German personal info'
                  },
                  children: []
                }
              ]
            }
          ]
        } as any)
      )

      const { sidebarMenuHarness } = await setUpWithHarness()
      await sidebarMenuHarness.expandAccordion()

      const menu = await sidebarMenuHarness.getPanelMenu()
      expect(menu).toBeTruthy()
      const panels = await menu?.getAllPanels()
      expect(await panels![0].getText()).toEqual('English personal info')
    })

    it('should display icon if provided', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(
        of({
          workspaceName: 'test-workspace',
          menu: [
            {
              key: 'USER_PROFILE_MENU',
              name: 'User Profile Menu',
              children: [
                {
                  key: 'PERSONAL_INFO',
                  name: 'Personal Info',
                  url: '/admin/user-profile',
                  position: 1,
                  external: false,
                  badge: 'home',
                  i18n: {},
                  children: []
                }
              ]
            }
          ]
        } as any)
      )

      const { sidebarMenuHarness } = await setUpWithHarness()
      await sidebarMenuHarness.expandAccordion()

      const menu = await sidebarMenuHarness.getPanelMenu()
      expect(menu).toBeTruthy()
      const panels = await menu?.getAllPanels()
      expect(await panels![0].hasIcon(PrimeIcons.HOME)).toBeTrue()
    })

    it('should use routerLink for local urls', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(
        of({
          workspaceName: 'test-workspace',
          menu: [
            {
              key: 'USER_PROFILE_MENU',
              name: 'User Profile Menu',
              children: [
                {
                  key: 'PERSONAL_INFO',
                  name: 'Personal Info',
                  url: '/admin/user-profile',
                  position: 1,
                  external: false,
                  i18n: {},
                  children: []
                }
              ]
            }
          ]
        } as any)
      )
      const router = TestBed.inject(Router)

      const { sidebarMenuHarness } = await setUpWithHarness()
      await sidebarMenuHarness.expandAccordion()

      const menu = await sidebarMenuHarness.getPanelMenu()
      expect(menu).toBeTruthy()
      const panels = await menu?.getAllPanels()
      await panels![0].click()
      expect(router.url).toBe('/admin/user-profile')
    })

    it('should use href for external urls', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(
        of({
          workspaceName: 'test-workspace',
          menu: [
            {
              key: 'USER_PROFILE_MENU',
              name: 'User profile menu',
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

      const { sidebarMenuHarness } = await setUpWithHarness()
      await sidebarMenuHarness.expandAccordion()

      const menu = await sidebarMenuHarness.getPanelMenu()
      expect(menu).toBeTruthy()
      const panels = await menu?.getAllPanels()
      expect(await panels![0].getLink()).toBe('https://www.google.com/')
    })

    it('should render submenus', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(
        of({
          workspaceName: 'test-workspace',
          menu: [
            {
              key: 'USER_PROFILE_MENU',
              name: 'User Profile Menu',
              children: [
                {
                  key: 'PERSONAL_INFO',
                  name: 'Personal Info',
                  url: '/admin/user-profile',
                  position: 0,
                  external: false,
                  i18n: {},
                  children: [
                    {
                      key: 'CHANGE_INFO',
                      name: 'Change personal info',
                      url: '/admin/user-profile/change',
                      position: 1,
                      external: false,
                      i18n: {}
                    }
                  ]
                },
                {
                  key: 'ACCOUNT_SETTINGS',
                  name: 'Account Settings',
                  url: '/admin/user-profile/account',
                  position: 1,
                  external: false,
                  i18n: {},
                  children: []
                }
              ]
            }
          ]
        } as any)
      )

      const { sidebarMenuHarness } = await setUpWithHarness()
      await sidebarMenuHarness.expandAccordion()

      const menu = await sidebarMenuHarness.getPanelMenu()
      expect(menu).toBeTruthy()
      const panels = await menu?.getAllPanels()

      const firstItemChildren = await panels![0].getChildren()
      expect(firstItemChildren.length).toBe(1)
      expect(await firstItemChildren[0].getText()).toEqual('Change personal info')
      expect((await firstItemChildren[0].getChildren()).length).toBe(0)
      expect((await panels![1].getChildren()).length).toBe(0)
    })

    it('should only show logout on failed menu fetch call', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(throwError(() => {}))

      const { sidebarMenuHarness } = await setUpWithHarness()
      await sidebarMenuHarness.expandAccordion()

      const menu = await sidebarMenuHarness.getPanelMenu()
      expect(menu).toBeTruthy()
      const panels = await menu?.getAllPanels()

      expect(panels?.length).toBe(1)
      expect(await panels![0].getText()).toBe('Log out')
    })
  })

  describe('logout panel', () => {
    beforeEach(() => {
      const userService = TestBed.inject(UserService)
      spyOn(userService.profile$, 'asObservable').and.returnValue(
        of({
          userId: 'my-user-id',
          organization: 'org',
          person: {
            displayName: 'My user',
            firstName: 'Name',
            lastName: 'Lastname'
          }
        }) as any
      )
      const appStateService = TestBed.inject(AppStateService)
      spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
        of({
          workspaceName: 'test-workspace'
        }) as any
      )
      menuItemApiSpy.getMenuItems.and.returnValue(
        of({
          workspaceName: 'test-workspace',
          menu: []
        } as any)
      )
    })

    it('should have correct icon for logout', async () => {
      const { sidebarMenuHarness } = await setUpWithHarness()
      await sidebarMenuHarness.expandAccordion()

      const menu = await sidebarMenuHarness.getPanelMenu()
      expect(menu).toBeTruthy()
      const panels = await menu?.getAllPanels()

      expect(await panels![0].hasIcon(PrimeIcons.POWER_OFF)).toBeTrue()
    })

    it('should default to Logout', async () => {
      const translateService = TestBed.inject(TranslateService)
      spyOn(translateService, 'get').and.returnValue(throwError(() => {}))

      const { sidebarMenuHarness } = await setUpWithHarness()
      await sidebarMenuHarness.expandAccordion()

      const menu = await sidebarMenuHarness.getPanelMenu()
      expect(menu).toBeTruthy()
      const panels = await menu?.getAllPanels()

      expect(await panels![0].getText()).toEqual('Logout')
    })

    it('should publish event on logout click', async () => {
      const { component, sidebarMenuHarness } = await setUpWithHarness()

      spyOn(component.eventsPublisher$, 'publish')

      await sidebarMenuHarness.expandAccordion()

      const menu = await sidebarMenuHarness.getPanelMenu()
      expect(menu).toBeTruthy()
      const panels = await menu?.getAllPanels()

      await panels![0].click()

      expect(component.eventsPublisher$.publish).toHaveBeenCalledOnceWith({
        type: 'authentication#logoutButtonClicked'
      })
    })
  })

  describe('slotInitializer', () => {
    let slotService: jasmine.SpyObj<SlotService>

    beforeEach(() => {
      slotService = jasmine.createSpyObj('SlotService', ['init'])
    })

    it('should call SlotService.init', () => {
      const initializer = slotInitializer(slotService)
      initializer()

      expect(slotService.init).toHaveBeenCalled()
    })
  })
})
