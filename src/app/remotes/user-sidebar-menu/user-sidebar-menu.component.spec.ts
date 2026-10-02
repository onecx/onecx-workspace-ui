import { TestBed } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideRouter, Router } from '@angular/router'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { TranslateService } from '@ngx-translate/core'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { firstValueFrom, of, ReplaySubject, throwError } from 'rxjs'
import { PanelMenuModule } from 'primeng/panelmenu'
import { AccordionModule } from 'primeng/accordion'
import { PrimeIcons } from 'primeng/api'

import {
  AngularRemoteComponentsModule,
  RemoteComponentConfig,
  REMOTE_COMPONENT_CONFIG,
  SlotService
} from '@onecx/angular-remote-components'
import { SlotServiceMock } from '@onecx/angular-remote-components/mocks'
import {
  AppConfigServiceMock,
  AppStateServiceMock,
  provideAppConfigServiceMock,
  provideAppStateServiceMock,
  provideUserServiceMock,
  UserServiceMock
} from '@onecx/angular-integration-interface/mocks'
import { UserProfile, Workspace } from '@onecx/integration-interface'

import { MenuItemAPIService } from 'src/app/shared/generated'
import { MenuService } from 'src/app/shared/services/menu.service'
import { OneCXUserSidebarMenuHarness } from './user-sidebar-menu.harness'
import { OneCXUserSidebarMenuComponent, slotInitializer } from './user-sidebar-menu.component'

describe('OneCXUserSidebarMenuComponent', () => {
  const menuItemApiSpy = jasmine.createSpyObj<MenuItemAPIService>('MenuItemAPIService', ['getMenuItems'])
  const menuServiceSpy = jasmine.createSpyObj<MenuService>('MenuService', ['isActive', 'isVisible'])
  const rcConfig = new ReplaySubject<RemoteComponentConfig>(1)
  const defaultRCConfig: RemoteComponentConfig = {
    appId: 'appId',
    productName: 'prodName',
    baseUrl: 'base',
    permissions: []
  }
  rcConfig.next(defaultRCConfig) // load default rc config (the component injects this token)

  let appConfigMock: AppConfigServiceMock
  let appStateMock: AppStateServiceMock
  let userMock: UserServiceMock

  function setUp() {
    const fixture = TestBed.createComponent(OneCXUserSidebarMenuComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()
    return { fixture, component }
  }

  async function setUpWithHarnessAndInit(permissions: string[] = []) {
    const { fixture, component } = setUp()
    component.ocxInitRemoteComponent({ baseUrl: 'base_url', permissions } as RemoteComponentConfig)
    fixture.detectChanges()
    // userMenu$/displayName$/organization$ resolve through async pipes (translate.get, ...);
    // flush the zone so the menu is rendered before querying the DOM.
    await fixture.whenStable()
    fixture.detectChanges()
    const sidebarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXUserSidebarMenuHarness)
    return { fixture, component, sidebarMenuHarness }
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslateTestingModule.withTranslations({
          en: require('../../../assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideUserServiceMock(),
        provideAppStateServiceMock(),
        provideAppConfigServiceMock(),
        { provide: MenuItemAPIService, useValue: menuItemApiSpy },
        { provide: REMOTE_COMPONENT_CONFIG, useValue: rcConfig },
        { provide: MenuService, useValue: menuServiceSpy },
        provideRouter([{ path: 'admin/user-profile' }])
      ]
    })
      .overrideComponent(OneCXUserSidebarMenuComponent, {
        set: {
          imports: [CommonModule, PanelMenuModule, AccordionModule, AngularRemoteComponentsModule],
          providers: [{ provide: SlotService, useClass: SlotServiceMock }]
        }
      })
      .compileComponents()

    appConfigMock = TestBed.inject(AppConfigServiceMock)
    appStateMock = TestBed.inject(AppStateServiceMock)
    userMock = TestBed.inject(UserServiceMock)

    appConfigMock.setProperty('REMOTES.USER_SIDEBAR_MENU.LOGOUT', 'Log out')
    menuServiceSpy.isActive.and.returnValue(of(true))
    menuServiceSpy.isVisible.and.returnValue(of(true))
    menuItemApiSpy.getMenuItems.and.returnValue(of({ workspaceName: 'test-workspace', menu: [] } as any))

    userMock.profile$.publish(undefined as unknown as UserProfile)
    appStateMock.currentWorkspace$.publish({ workspaceName: 'test-workspace' } as Workspace)
  })

  describe('initialize', () => {
    it('should create', async () => {
      const { component } = await setUpWithHarnessAndInit()
      expect(component).toBeTruthy()
    })

    it('should forward the config to the REMOTE_COMPONENT_CONFIG token', async () => {
      const { component } = setUp()
      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig

      expect(await firstValueFrom(rcConfig)).toEqual(mockConfig)
    })

    it('should set the base path of the menu item api service', () => {
      const { component } = setUp()

      component.ocxInitRemoteComponent({ baseUrl: 'base_url' } as RemoteComponentConfig)

      expect(menuItemApiSpy.configuration.basePath).toEqual('base_url/bff')
    })

    it('should init the app config service with the base url', async () => {
      const { component } = await setUpWithHarnessAndInit()

      expect(appConfigMock.init).toHaveBeenCalledOnceWith('base_url')
    })

    it('should set avatarImageLoaded from the avatar image slot output', async () => {
      const { component } = await setUpWithHarnessAndInit()
      expect(component.avatarImageLoaded).toBeUndefined()

      component.avatarImageLoadedEmitter.emit(true)

      expect(component.avatarImageLoaded).toBeTrue()
    })
  })

  describe('user section', () => {
    it('should display person displayName', async () => {
      userMock.profile$.publish({
        userId: 'my-user-id',
        organization: 'org',
        person: { displayName: 'My user', firstName: 'Name', lastName: 'Lastname' }
      } as UserProfile)

      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()

      expect(await sidebarMenuHarness.getDisplayName()).toEqual('My user')
    })

    it('should display person firstName and lastName when displayName unavailable', async () => {
      userMock.profile$.publish({
        userId: 'my-user-id',
        organization: 'org',
        person: { displayName: undefined, firstName: 'Name', lastName: 'Lastname' }
      } as UserProfile)

      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()

      expect(await sidebarMenuHarness.getDisplayName()).toEqual('Name Lastname')
    })

    it('should display userId when none other user info available', async () => {
      userMock.profile$.publish({
        userId: 'my-user-id',
        organization: 'org',
        person: { displayName: undefined, firstName: undefined, lastName: undefined }
      } as UserProfile)

      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()

      expect(await sidebarMenuHarness.getDisplayName()).toEqual('my-user-id')
    })

    it('should display guest when no user info', () => {
      const { component } = setUp()

      expect(component.determineDisplayName(undefined as unknown as UserProfile)).toBe('Guest')
    })

    it('should activate inline profile', () => {
      const { component } = setUp()
      const preventDefaultSpy = jasmine.createSpy('preventDefault')
      const mockEvent = { preventDefault: preventDefaultSpy } as unknown as UIEvent

      component.onInlineProfileClick(mockEvent)

      expect(component.inlineProfileActive).toBeTrue()
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should display organization', async () => {
      userMock.profile$.publish({
        userId: 'my-user-id',
        organization: 'user-organization',
        person: { displayName: undefined, firstName: undefined, lastName: undefined }
      } as UserProfile)

      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()

      expect(await sidebarMenuHarness.getOrg()).toEqual('user-organization')
    })

    it('should not display organization', async () => {
      userMock.profile$.publish({
        userId: 'my-user-id',
        organization: undefined,
        person: { displayName: undefined, firstName: undefined, lastName: undefined }
      } as UserProfile)

      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()

      expect(await sidebarMenuHarness.getOrg()).toBeFalsy()
    })
  })

  describe('menu section', () => {
    beforeEach(() => {
      userMock.profile$.publish({
        userId: 'my-user-id',
        organization: 'org',
        person: { displayName: 'My user', firstName: 'Name', lastName: 'Lastname' }
      } as UserProfile)
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

      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()
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
                  i18n: { en: 'English personal info', de: 'German personal info' },
                  children: []
                }
              ]
            }
          ]
        } as any)
      )

      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()
      await sidebarMenuHarness.expandAccordion()

      const panels = await (await sidebarMenuHarness.getPanelMenu())?.getAllPanels()
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

      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()
      await sidebarMenuHarness.expandAccordion()

      const panels = await (await sidebarMenuHarness.getPanelMenu())?.getAllPanels()
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

      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()
      await sidebarMenuHarness.expandAccordion()

      const panels = await (await sidebarMenuHarness.getPanelMenu())?.getAllPanels()
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

      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()
      await sidebarMenuHarness.expandAccordion()

      const panels = await (await sidebarMenuHarness.getPanelMenu())?.getAllPanels()
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

      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()
      await sidebarMenuHarness.expandAccordion()

      const panels = await (await sidebarMenuHarness.getPanelMenu())?.getAllPanels()
      expect(panels?.length).toBe(2)

      const firstItemChildren = await panels![0].getChildren()
      expect(firstItemChildren.length).toBe(1)
      expect(await firstItemChildren[0].getText()).toEqual('Change personal info')
      expect((await firstItemChildren[0].getChildren()).length).toBe(0)
      expect((await panels![1].getChildren()).length).toBe(0)
    })

    it('should only show logout on failed menu fetch call', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(throwError(() => new Error('unable to load menu')))
      spyOn(console, 'error')

      const { fixture, sidebarMenuHarness } = await setUpWithHarnessAndInit()

      // the component retries the failing call with a delay before giving up
      await new Promise((resolve) => setTimeout(resolve, 1800))
      await fixture.whenStable()
      fixture.detectChanges()

      await sidebarMenuHarness.expandAccordion()
      const panels = await (await sidebarMenuHarness.getPanelMenu())?.getAllPanels()

      expect(panels?.length).toBe(1)
      expect(await panels![0].getText()).toBe('Log out')
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('logout panel', () => {
    beforeEach(() => {
      userMock.profile$.publish({
        userId: 'my-user-id',
        organization: 'org',
        person: { displayName: 'My user', firstName: 'Name', lastName: 'Lastname' }
      } as UserProfile)
    })

    it('should have correct icon for logout', async () => {
      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()
      await sidebarMenuHarness.expandAccordion()

      const panels = await (await sidebarMenuHarness.getPanelMenu())?.getAllPanels()

      expect(await panels![0].hasIcon(PrimeIcons.POWER_OFF)).toBeTrue()
    })

    it('should default to Logout', async () => {
      const translateService = TestBed.inject(TranslateService)
      spyOn(translateService, 'get').and.returnValue(throwError(() => new Error('')))

      const { sidebarMenuHarness } = await setUpWithHarnessAndInit()
      await sidebarMenuHarness.expandAccordion()

      const panels = await (await sidebarMenuHarness.getPanelMenu())?.getAllPanels()

      expect(await panels![0].getText()).toEqual('Logout')
    })

    it('should publish event on logout click', async () => {
      const { component, sidebarMenuHarness } = await setUpWithHarnessAndInit()

      spyOn(component.eventsPublisher$, 'publish')

      await sidebarMenuHarness.expandAccordion()
      const panels = await (await sidebarMenuHarness.getPanelMenu())?.getAllPanels()
      await panels![0].click()

      expect(component.eventsPublisher$.publish).toHaveBeenCalledOnceWith({
        type: 'authentication#logoutButtonClicked'
      })
    })
  })

  describe('slotInitializer', () => {
    it('should call SlotService.init', () => {
      const slotService = jasmine.createSpyObj<SlotService>('SlotService', ['init'])
      const initializer = slotInitializer(slotService)

      initializer()

      expect(slotService.init).toHaveBeenCalled()
    })
  })
})
