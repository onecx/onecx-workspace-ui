import { NO_ERRORS_SCHEMA, NgModule, Renderer2 } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideRouter, Router, RouterModule } from '@angular/router'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject, of, throwError } from 'rxjs'
import { MenuModule } from 'primeng/menu'
import { AvatarModule } from 'primeng/avatar'
import { RippleModule } from 'primeng/ripple'
import { TooltipModule } from 'primeng/tooltip'
import { PrimeIcons } from 'primeng/api'

import { BASE_URL, RemoteComponentConfig, SlotService } from '@onecx/angular-remote-components'
import { AppStateService, UserService } from '@onecx/angular-integration-interface'
import { IfPermissionDirective } from '@onecx/angular-accelerator'
import { AppConfigService } from '@onecx/portal-integration-angular'

import { MenuItemAPIService } from 'src/app/shared/generated'
import { OneCXUserAvatarMenuHarness } from './user-avatar-menu.harness'
import { OneCXUserAvatarMenuComponent, slotInitializer } from './user-avatar-menu.component'

@NgModule({
  imports: [],
  declarations: [IfPermissionDirective],
  exports: [IfPermissionDirective]
})
class PortalDependencyModule {}

describe('OneCXUserAvatarMenuComponent', () => {
  const menuItemApiSpy = jasmine.createSpyObj<MenuItemAPIService>('MenuItemAPIService', ['getMenuItems'])
  const appConfigSpy = jasmine.createSpyObj<AppConfigService>('AppConfigService', ['init', 'getProperty'])

  function setUp() {
    const fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()
    return { fixture, component }
  }

  async function setUpWithHarness() {
    const { fixture, component } = setUp()
    const avatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXUserAvatarMenuHarness)
    return { fixture, component, avatarMenuHarness }
  }

  async function setUpWithHarnessAndInit(permissions: Array<string>) {
    const fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    const component = fixture.componentInstance
    component.ocxInitRemoteComponent({ baseUrl: 'base_url', permissions: permissions } as any)
    fixture.detectChanges()

    const avatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXUserAvatarMenuHarness)
    return { fixture, component, avatarMenuHarness }
  }

  let baseUrlSubject: ReplaySubject<any>
  beforeEach(async () => {
    baseUrlSubject = new ReplaySubject<any>(1)
    await TestBed.configureTestingModule({
      imports: [
        TranslateTestingModule.withTranslations({
          en: require('../../../assets/i18n/en.json')
        }).withDefaultLanguage('en'),
        // RouterTestingModule.withRoutes([{ path: 'admin/user-profile', component: {} as any }]),
        NoopAnimationsModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin/user-profile', component: OneCXUserAvatarMenuComponent }]),
        { provide: BASE_URL, useValue: baseUrlSubject },
        { provide: AppConfigService, useValue: appConfigSpy }
      ]
    })
      .overrideComponent(OneCXUserAvatarMenuComponent, {
        set: {
          imports: [
            PortalDependencyModule,
            TranslateTestingModule,
            CommonModule,
            RouterModule,
            MenuModule,
            AvatarModule,
            RippleModule,
            TooltipModule
          ],
          providers: [{ provide: MenuItemAPIService, useValue: menuItemApiSpy }]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')

    menuItemApiSpy.getMenuItems.calls.reset()
    appConfigSpy.init.and.returnValue(Promise.resolve())
    appConfigSpy.getProperty.calls.reset()
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
    appConfigSpy.getProperty.and.returnValue('right')
    const { component } = setUp()
    component.ocxInitRemoteComponent({
      baseUrl: 'base_url'
    } as RemoteComponentConfig)

    expect(menuItemApiSpy.configuration.basePath).toEqual('base_url/bff')
    expect(component.menuAnchorPosition).toBe('right')
    baseUrlSubject.asObservable().subscribe((item) => {
      expect(item).toEqual('base_url')
      expect(appConfigSpy.init).toHaveBeenCalledOnceWith('base_url')
      done()
    })
  })

  it('should show button initially', async () => {
    appConfigSpy.getProperty.and.returnValue('right')
    const { avatarMenuHarness } = await setUpWithHarness()

    expect(await avatarMenuHarness.getUserAvatarButtonId()).toEqual('ws_user_avatar_menu_action')
  })

  it('should not show profile info if permissions not met', async () => {
    appConfigSpy.getProperty.and.returnValue('right')
    const fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    const component = fixture.componentInstance
    component.ocxInitRemoteComponent({ baseUrl: 'base_url', permissions: [] } as any)
    fixture.detectChanges()
    const avatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXUserAvatarMenuHarness)

    expect(await avatarMenuHarness.getOrganization()).toBeUndefined()
    expect(await avatarMenuHarness.getUserName()).toBeUndefined()
  })

  it('should not show profile info if user undefined', async () => {
    appConfigSpy.getProperty.and.returnValue('right')
    const userService = TestBed.inject(UserService)
    spyOn(userService.profile$, 'asObservable').and.returnValue(of(null) as any)

    const fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    const component = fixture.componentInstance
    component.ocxInitRemoteComponent({ baseUrl: 'base_url', permissions: [] } as any)
    fixture.detectChanges()

    const avatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXUserAvatarMenuHarness)

    expect(await avatarMenuHarness.getOrganization()).toBeUndefined()
    expect(await avatarMenuHarness.getUserName()).toBeUndefined()
  })

  it('should show profile info if permissions met and user defined', async () => {
    appConfigSpy.getProperty.and.returnValue('right')
    const userService = TestBed.inject(UserService)
    const profile = {
      organization: 'orgId',
      person: {
        displayName: 'My display name',
        email: 'my-user@example.com'
      }
    }
    spyOn(userService.profile$, 'asObservable').and.returnValue(of(profile) as any)

    const { avatarMenuHarness } = await setUpWithHarnessAndInit([])

    expect(await avatarMenuHarness.getUserName()).toEqual(profile.person.displayName)
    expect(await avatarMenuHarness.getOrganization()).toEqual(profile.organization)
  })

  describe('menu section', () => {
    beforeEach(() => {
      appConfigSpy.getProperty.and.returnValue('right')
      const userService = TestBed.inject(UserService)
      const profile = {
        organization: 'orgId',
        person: {
          displayName: 'My display name',
          email: 'my-user@example.com'
        }
      }
      spyOn(userService.profile$, 'asObservable').and.returnValue(of(profile) as any)
      const appStateService = TestBed.inject(AppStateService)
      spyOn(appStateService.currentWorkspace$, 'asObservable').and.returnValue(
        of({ workspaceName: 'test-workspace' }) as any
      )
    })

    it('should render menu in correct positions', async () => {
      const userProfileMenu = {
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
      }
      menuItemApiSpy.getMenuItems.and.returnValue(of(userProfileMenu as any))

      const { avatarMenuHarness } = await setUpWithHarnessAndInit([])
      const menuItems = await avatarMenuHarness.getMenuItems()

      expect(menuItems.length).toBe(3)
      expect(await menuItems[0].getText()).toEqual('Account Settings')
      expect(await menuItems[1].getText()).toEqual('Personal Info')
      expect(await menuItems[2].getText()).toEqual('Log out')
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
      const { avatarMenuHarness } = await setUpWithHarnessAndInit([])
      const menuItems = await avatarMenuHarness.getMenuItems()

      expect(await menuItems[0].getText()).toEqual('English personal info')
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
      const { avatarMenuHarness } = await setUpWithHarnessAndInit([])
      const menuItems = await avatarMenuHarness.getMenuItems()

      expect(await menuItems[0].hasIcon(PrimeIcons.HOME)).toBeTrue()
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
      const { avatarMenuHarness } = await setUpWithHarnessAndInit([])
      const menuItems = await avatarMenuHarness.getMenuItems()

      await menuItems[0].selectItem()
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
      const { avatarMenuHarness } = await setUpWithHarnessAndInit([])
      const menuItems = await avatarMenuHarness.getMenuItems()

      expect(await menuItems[0].getLink()).toBe('https://www.google.com/')
    })

    it('should only show logout on failed menu fetch call', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(throwError(() => {}))
      const { avatarMenuHarness } = await setUpWithHarnessAndInit([])
      const menuItems = await avatarMenuHarness.getMenuItems()

      expect(await menuItems[0].getText()).toEqual('Log out')
    })

    it('should have correct icon for logout', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(of({ workspaceName: 'workspace', menu: [] } as any))
      const { avatarMenuHarness } = await setUpWithHarness()
      const menuItems = await avatarMenuHarness.getMenuItems()

      expect(await menuItems[0].hasIcon(PrimeIcons.POWER_OFF)).toBeTrue()
    })

    it('should publish event on logout click', async () => {
      const { component } = setUp()

      spyOn(component.eventsPublisher$, 'publish')

      component.onLogout()

      expect(component.eventsPublisher$.publish).toHaveBeenCalledOnceWith({
        type: 'authentication#logoutButtonClicked'
      })
    })

    it('should have hidden menu after button click', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(
        of({
          workspaceName: 'test-workspace',
          menu: []
        } as any)
      )
      const { avatarMenuHarness } = await setUpWithHarnessAndInit([])

      expect(await avatarMenuHarness.isMenuHidden()).toBeTrue()
      await avatarMenuHarness.clickButton()
      expect(await avatarMenuHarness.isMenuHidden()).toBeFalse()
    })
  })

  it('should create listener on ngAfterViewInit and remove it on ngOnDestroy', () => {
    const spyRemoveFunction = jasmine.createSpy()
    const { fixture, component } = setUp()
    const renderer = fixture.componentRef.injector.get<Renderer2>(Renderer2)
    spyOn(renderer, 'listen').and.returnValue(spyRemoveFunction)

    component.ngAfterViewInit()

    expect(renderer.listen).toHaveBeenCalledWith('body', 'click', jasmine.any(Function))
    component.ngOnDestroy()
    expect(spyRemoveFunction).toHaveBeenCalledTimes(1)
  })

  it('should open menu on avatar button enter key', () => {
    const { component } = setUp()
    component.menuOpen = false
    component.onAvatarEnter()
    expect(component.menuOpen).toBeTrue()
  })

  it('should close menu on avatar button escape key', () => {
    const { component } = setUp()
    component.menuOpen = true
    component.onAvatarEscape()
    expect(component.menuOpen).toBeFalse()
  })

  it('should close menu and focus on avatar button when escape clicked on menu item', async () => {
    const { avatarMenuHarness, fixture, component } = await setUpWithHarnessAndInit([])
    component.menuOpen = true
    fixture.nativeElement.focus()

    component.onItemEscape((await avatarMenuHarness.getUserAvatarButton()) as any)

    expect(component.menuOpen).toBeFalse()
    expect(await (await avatarMenuHarness.getUserAvatarButton()).isFocused()).toBeTrue()
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
