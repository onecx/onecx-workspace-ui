import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideRouter, Router } from '@angular/router'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { TranslateService } from '@ngx-translate/core'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { firstValueFrom, of, ReplaySubject, throwError } from 'rxjs'

import { AppConfigService } from '@onecx/angular-integration-interface'
import {
  RemoteComponentConfig,
  REMOTE_COMPONENT_CONFIG,
  SLOT_SERVICE,
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
import { OneCXUserAvatarMenuHarness } from './user-avatar-menu.harness'
import { OneCXUserAvatarMenuComponent } from './user-avatar-menu.component'

describe('OneCXUserAvatarMenuComponent', () => {
  // MenuItemAPIService is providedIn 'any', so the component builds its own instance and a module-level
  // provider would be shadowed. The component also declares its own (real) AppConfigService provider.
  // We re-point the component's providers (via overrideComponent) at the shared mocks/spy so the
  // component injects the very instances the tests assert on.
  const menuItemApiSpy = jasmine.createSpyObj<MenuItemAPIService>('MenuItemAPIService', ['getMenuItems'])
  const rcConfig = new ReplaySubject<RemoteComponentConfig>(1)
  const defaultRCConfig: RemoteComponentConfig = {
    appId: 'appId',
    productName: 'prodName',
    baseUrl: 'base',
    permissions: ['permission']
  }
  rcConfig.next(defaultRCConfig) // load default rc config (the component injects this token)

  const emptyMenu = { workspaceName: 'test-workspace', menu: [] } as any

  let appConfigMock: AppConfigServiceMock
  let userMock: UserServiceMock
  let appStateMock: AppStateServiceMock

  function setUp() {
    const fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    const component = fixture.componentInstance
    // first CD: subscribes the template async pipe (userMenu$) so the menu pipeline runs against the
    // (spied) API and the seeded workspace.
    fixture.detectChanges()
    return { fixture, component }
  }

  // Flush change detection so the async pipe value (userMenu$) renders.
  async function flush(fixture: ComponentFixture<OneCXUserAvatarMenuComponent>): Promise<void> {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  async function setupWithHarnessAndInit(permissions: string[] = []) {
    const { fixture, component } = setUp()
    component.ocxInitRemoteComponent({ baseUrl: 'base_url', permissions: permissions } as RemoteComponentConfig)
    await flush(fixture)
    const avatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXUserAvatarMenuHarness)
    return { fixture, component, avatarMenuHarness }
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OneCXUserAvatarMenuComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideUserServiceMock(),
        provideAppStateServiceMock(),
        provideAppConfigServiceMock(),
        { provide: REMOTE_COMPONENT_CONFIG, useValue: rcConfig },
        { provide: SlotService, useClass: SlotServiceMock },
        provideRouter([{ path: 'admin/user-profile', component: OneCXUserAvatarMenuComponent }])
      ]
    }).compileComponents()

    // Use the shared mocks/spy for the component's own instances (see note above).
    TestBed.overrideComponent(OneCXUserAvatarMenuComponent, {
      set: {
        providers: [
          { provide: SLOT_SERVICE, useExisting: SlotService },
          { provide: AppConfigService, useExisting: AppConfigServiceMock },
          { provide: MenuItemAPIService, useValue: menuItemApiSpy }
        ]
      }
    })

    appConfigMock = TestBed.inject(AppConfigServiceMock)
    userMock = TestBed.inject(UserServiceMock)
    appStateMock = TestBed.inject(AppStateServiceMock)

    rcConfig.next(defaultRCConfig)
    // default (empty) menu so the pipeline resolves for tests that don't care about items
    menuItemApiSpy.getMenuItems.and.returnValue(of(emptyMenu))
    userMock.profile$.publish(undefined as unknown as UserProfile)
    appStateMock.currentWorkspace$.publish({ workspaceName: 'test-workspace' } as Workspace)
  })

  describe('initialize', () => {
    it('should create', async () => {
      const { component } = await setupWithHarnessAndInit()
      expect(component).toBeTruthy()
    })

    it('should forward the config to the REMOTE_COMPONENT_CONFIG token', async () => {
      const { component } = await setupWithHarnessAndInit()
      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }
      component.ocxRemoteComponentConfig = mockConfig

      const rcConfigValue = await firstValueFrom(rcConfig)
      expect(rcConfigValue).toEqual(mockConfig)
    })

    it('should set the base path of the menu item api service', async () => {
      const { component } = await setupWithHarnessAndInit()
      component.ocxInitRemoteComponent({ baseUrl: 'base_url' } as RemoteComponentConfig)

      const api = (component as unknown as { menuItemApiService: MenuItemAPIService }).menuItemApiService
      expect(api.configuration.basePath).toEqual('base_url/bff')
    })

    it('should store the permissions from the config', async () => {
      const { component } = await setupWithHarnessAndInit(['p1', 'p2'])
      expect(component.permissions).toEqual(['p1', 'p2'])
    })

    it('should default the menu anchor position to right', async () => {
      const { component } = await setupWithHarnessAndInit()
      expect(component.menuAnchorPosition).toBe('right')
    })

    it('should read the menu anchor position from the app config', async () => {
      // the component reads the position inside appConfigService.init(...).then(...); the mock's init()
      // resets its config, so stub getProperty to control what the component observes.
      spyOn(appConfigMock, 'getProperty').and.returnValue('left')
      const { component } = await setupWithHarnessAndInit()
      expect(component.menuAnchorPosition).toBe('left')
    })

    it('should set avatarImageLoaded from the avatar image slot output', async () => {
      const { component } = await setupWithHarnessAndInit()
      expect(component.avatarImageLoaded).toBeUndefined()

      component.avatarImageLoadedEmitter.emit(true)
      expect(component.avatarImageLoaded).toBeTrue()
    })
  })

  describe('user info', () => {
    it('should show the user name and organization when a profile is available', async () => {
      userMock.profile$.publish({
        organization: 'orgId',
        person: {
          displayName: 'My display name',
          email: 'my-user@example.com'
        }
      } as UserProfile)

      const { avatarMenuHarness } = await setupWithHarnessAndInit()
      expect(await avatarMenuHarness.getUserName()).toEqual('My display name')
      expect(await avatarMenuHarness.getOrganization()).toEqual('orgId')
    })

    it('should hide the user name and organization when no profile is available', async () => {
      userMock.profile$.publish(undefined as unknown as UserProfile)

      const { avatarMenuHarness } = await setupWithHarnessAndInit()
      expect(await avatarMenuHarness.getUserName()).toBeUndefined()
      expect(await avatarMenuHarness.getOrganization()).toBeUndefined()
    })
  })

  describe('menu', () => {
    it('should render menu items in the correct order', async () => {
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

      const { avatarMenuHarness } = await setupWithHarnessAndInit()
      const menuItems = await avatarMenuHarness.getMenuItems()

      expect(menuItems.length).toBe(3) // two items + logout
      expect(await menuItems[0].getText()).toEqual('Account Settings')
      expect(await menuItems[1].getText()).toEqual('Personal Info')
    })

    it('should use the i18n translation whenever a translation for the user language is provided', async () => {
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

      const { avatarMenuHarness } = await setupWithHarnessAndInit()
      const menuItems = await avatarMenuHarness.getMenuItems()

      expect(await menuItems[0].getText()).toEqual('English personal info')
    })

    it('should render the badge as an icon when provided', async () => {
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

      const { avatarMenuHarness } = await setupWithHarnessAndInit()
      const menuItems = await avatarMenuHarness.getMenuItems()

      expect(await menuItems[0].hasIcon('pi-home')).toBeTrue()
    })

    it('should navigate with the router for local urls', async () => {
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
      const { avatarMenuHarness } = await setupWithHarnessAndInit()
      const menuItems = await avatarMenuHarness.getMenuItems()

      await menuItems[0].click()
      expect(router.url).toBe('/admin/user-profile')
    })

    it('should render the href for external urls', async () => {
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

      const { avatarMenuHarness } = await setupWithHarnessAndInit()
      const menuItems = await avatarMenuHarness.getMenuItems()

      expect(await menuItems[0].getLink()).toBe('https://www.google.com/')
    })

    it('should only show the logout item when the menu fetch fails', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(throwError(() => new Error('unable to load menu')))
      spyOn(console, 'error')

      const { fixture, avatarMenuHarness } = await setupWithHarnessAndInit()
      // the component retries the failing call (500ms x 3) before the pipeline resolves
      await new Promise((resolve) => setTimeout(resolve, 1700))
      await flush(fixture)

      const menuItems = await avatarMenuHarness.getMenuItems()
      expect(menuItems.length).toBe(1)
      expect(await menuItems[0].getText()).toEqual('Log out')
      expect(console.error).toHaveBeenCalled()
    })

    it('should publish an event on logout click', async () => {
      const { component } = await setupWithHarnessAndInit()

      spyOn(component.eventsPublisher$, 'publish')
      component.onLogout()

      expect(component.eventsPublisher$.publish).toHaveBeenCalledWith({
        type: 'authentication#logoutButtonClicked'
      })
    })

    it('should publish an event when the logout menu item is clicked', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(of({ workspaceName: 'workspace', menu: [] } as any))
      const { avatarMenuHarness, component } = await setupWithHarnessAndInit()
      const logoutItem = await avatarMenuHarness.getLogoutMenuItem()

      spyOn(component.eventsPublisher$, 'publish')
      await logoutItem.click()

      expect(component.eventsPublisher$.publish).toHaveBeenCalledWith({
        type: 'authentication#logoutButtonClicked'
      })
    })

    it('should show the translated logout label with a power-off icon', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(of({ workspaceName: 'workspace', menu: [] } as any))
      const { avatarMenuHarness } = await setupWithHarnessAndInit()
      const logoutItem = await avatarMenuHarness.getLogoutMenuItem()

      expect(await logoutItem.getText()).toEqual('Log out')
      expect(await logoutItem.hasIcon('pi-power-off')).toBeTrue()
    })

    it('should fall back to the raw "Logout" label when the translation is unavailable', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(of({ workspaceName: 'workspace', menu: [] } as any))
      // The pipeline resolves the logout label via translateService.get(...). Only that key errors so the
      // template's other | translate pipes (TOOLTIP / ORGID) keep resolving.
      const translateService = TestBed.inject(TranslateService)
      spyOn(translateService, 'get').and.callFake((key: string) =>
        key === 'REMOTES.USER_AVATAR_MENU.LOGOUT' ? throwError(() => new Error('no translation')) : of(key)
      )

      const { avatarMenuHarness } = await setupWithHarnessAndInit()
      const logoutItem = await avatarMenuHarness.getLogoutMenuItem()

      expect(await logoutItem.getText()).toEqual('Logout')
      expect(await logoutItem.hasIcon('pi-power-off')).toBeTrue()
    })
  })

  describe('menu visibility', () => {
    it('should start closed and open when the avatar button is clicked', async () => {
      const { avatarMenuHarness, component } = await setupWithHarnessAndInit()
      expect(component.menuOpen()).toBeFalse()
      expect(await avatarMenuHarness.isMenuHidden()).toBeTrue()

      await avatarMenuHarness.clickButton()
      expect(component.menuOpen()).toBeTrue()
      expect(await avatarMenuHarness.isMenuHidden()).toBeFalse()

      await avatarMenuHarness.clickButton()
      expect(component.menuOpen()).toBeFalse()
      expect(await avatarMenuHarness.isMenuHidden()).toBeTrue()
    })
  })

  // The close-on-escape / close-on-outside-click logic lives in the `document:` @HostListeners. They are
  // exercised by invoking the handler methods directly with a controlled `event.target` (dispatching to
  // `document` would always resolve `event.target` to `document`, so the inside/outside distinction could
  // not be reached). The handlers mutate the menuOpen signal synchronously.
  describe('global event listeners', () => {
    it('should close the menu when the escape key is pressed', async () => {
      const { avatarMenuHarness, component } = await setupWithHarnessAndInit()
      await avatarMenuHarness.clickButton()
      expect(component.menuOpen()).toBeTrue()

      component.onEscapePressed(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(component.menuOpen()).toBeFalse()
    })

    it('should not close the menu when escape is pressed while it is already closed', async () => {
      const { component } = await setupWithHarnessAndInit()
      expect(component.menuOpen()).toBeFalse()

      component.onEscapePressed(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(component.menuOpen()).toBeFalse()
    })

    it('should close the menu when clicking outside the component while it is open', async () => {
      const { fixture, avatarMenuHarness, component } = await setupWithHarnessAndInit()
      await avatarMenuHarness.clickButton()
      expect(component.menuOpen()).toBeTrue()

      // target is a node NOT inside the component's element.
      component.onDocumentClick({ target: document.body } as unknown as Event)

      expect(component.menuOpen()).toBeFalse()
      fixture.detectChanges()
      expect(await avatarMenuHarness.isMenuHidden()).toBeTrue()
    })

    it('should close the menu when the click is inside the component', async () => {
      const { fixture, avatarMenuHarness, component } = await setupWithHarnessAndInit()
      await avatarMenuHarness.clickButton()
      expect(component.menuOpen()).toBeTrue()

      // target is a node inside the component's element, so the `!clickedInside` guard is not taken
      // (covers the false side of the `if (!clickedInside)` branch); the menu is closed by the
      // unconditional set(false) that runs before it.
      const inside = fixture.nativeElement.querySelector('app-user-avatar-menu')
      component.onDocumentClick({ target: inside } as unknown as Event)

      expect(component.menuOpen()).toBeFalse()
    })
  })
})
