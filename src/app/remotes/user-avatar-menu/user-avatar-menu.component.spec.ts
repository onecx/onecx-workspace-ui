import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { NgModule, Renderer2 } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { AppStateService, UserService } from '@onecx/angular-integration-interface'
import { AppConfigService, IfPermissionDirective } from '@onecx/angular-accelerator'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject, of, throwError } from 'rxjs'
import { MenuModule } from 'primeng/menu'
import { AvatarModule } from 'primeng/avatar'
import { RippleModule } from 'primeng/ripple'
import { TooltipModule } from 'primeng/tooltip'
import { PrimeIcons } from 'primeng/api'
import { MenuItemAPIService } from 'src/app/shared/generated'
import { OneCXUserAvatarMenuComponent } from './user-avatar-menu.component'
import { OneCXUserAvatarMenuHarness } from './user-avatar-menu.harness'

@NgModule({
  imports: [],
  declarations: [IfPermissionDirective],
  exports: [IfPermissionDirective]
})
class PortalDependencyModule {}

describe('OneCXUserAvatarMenuComponent', () => {
  let component: OneCXUserAvatarMenuComponent
  let fixture: ComponentFixture<OneCXUserAvatarMenuComponent>
  let oneCXUserAvatarMenuHarness: OneCXUserAvatarMenuHarness

  const menuItemApiSpy = jasmine.createSpyObj<MenuItemAPIService>('MenuItemAPIService', ['getMenuItems'])

  const appConfigSpy = jasmine.createSpyObj<AppConfigService>('AppConfigService', ['init', 'getProperty'])

  let baseUrlSubject: ReplaySubject<any>
  beforeEach(async () => {
    baseUrlSubject = new ReplaySubject<any>(1)
    await TestBed.configureTestingModule({
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
        }
      ]
    })
      .overrideComponent(OneCXUserAvatarMenuComponent, {
        set: {
          imports: [
            PortalDependencyModule,
            TranslateTestingModule,
            CommonModule,
            RouterTestingModule,
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
    fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()

    expect(component).toBeTruthy()
  })

  it('should init remote component', (done: DoneFn) => {
    appConfigSpy.getProperty.and.returnValue('right')

    fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()

    component.ocxInitRemoteComponent({
      baseUrl: 'base_url',
      permissions: ['PROFILE#VIEW']
    } as RemoteComponentConfig)

    expect(component.permissions).toEqual(['PROFILE#VIEW'])
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

    fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()

    oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXUserAvatarMenuHarness)

    expect(await oneCXUserAvatarMenuHarness.getButtonTitle()).toEqual('Profile')
  })

  it('should not show profile info if permissions not met', async () => {
    appConfigSpy.getProperty.and.returnValue('right')

    fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()

    component.ocxInitRemoteComponent({
      baseUrl: 'base_url',
      permissions: []
    } as any)

    oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXUserAvatarMenuHarness)

    expect(await oneCXUserAvatarMenuHarness.getUserName()).toBeUndefined()
    expect(await oneCXUserAvatarMenuHarness.getUserEmail()).toBeUndefined()
    expect(await oneCXUserAvatarMenuHarness.getUserTenant()).toBeUndefined()
  })

  it('should not show profile info if user undefined', async () => {
    appConfigSpy.getProperty.and.returnValue('right')
    const userService = TestBed.inject(UserService)
    spyOn(userService.profile$, 'asObservable').and.returnValue(of(null) as any)

    fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    component = fixture.componentInstance
    component.ocxInitRemoteComponent({
      baseUrl: 'base_url',
      permissions: ['PROFILE#VIEW']
    } as any)
    fixture.detectChanges()

    oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXUserAvatarMenuHarness)

    expect(await oneCXUserAvatarMenuHarness.getUserName()).toBeUndefined()
    expect(await oneCXUserAvatarMenuHarness.getUserEmail()).toBeUndefined()
    expect(await oneCXUserAvatarMenuHarness.getUserTenant()).toBeUndefined()
  })

  it('should show profile info if permissions met and user defined', async () => {
    appConfigSpy.getProperty.and.returnValue('right')
    const userService = TestBed.inject(UserService)
    spyOn(userService.profile$, 'asObservable').and.returnValue(
      of({
        tenantName: 'user-tenant',
        person: {
          displayName: 'My user',
          email: 'my-user@example.com'
        }
      }) as any
    )

    fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    component = fixture.componentInstance
    component.ocxInitRemoteComponent({
      baseUrl: 'base_url',
      permissions: ['PROFILE#VIEW']
    } as any)
    fixture.detectChanges()

    oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXUserAvatarMenuHarness)

    expect(await oneCXUserAvatarMenuHarness.getUserName()).toEqual('My user')
    expect(await oneCXUserAvatarMenuHarness.getUserEmail()).toEqual('my-user@example.com')
    expect(await oneCXUserAvatarMenuHarness.getUserTenant()).toEqual('Tenant: user-tenant')
  })

  describe('menu section', () => {
    beforeEach(() => {
      appConfigSpy.getProperty.and.returnValue('right')
      const userService = TestBed.inject(UserService)
      spyOn(userService.profile$, 'asObservable').and.returnValue(
        of({
          tenantName: 'user-tenant',
          person: {
            displayName: 'My user',
            email: 'my-user@example.com'
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

      fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
      component = fixture.componentInstance
      component.ocxInitRemoteComponent({
        baseUrl: 'base_url',
        permissions: ['PROFILE#VIEW']
      } as any)
      fixture.detectChanges()

      oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(
        fixture,
        OneCXUserAvatarMenuHarness
      )

      const menuItems = await oneCXUserAvatarMenuHarness.getMenuItems()
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

      fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
      component = fixture.componentInstance
      component.ocxInitRemoteComponent({
        baseUrl: 'base_url',
        permissions: ['PROFILE#VIEW']
      } as any)
      fixture.detectChanges()

      oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(
        fixture,
        OneCXUserAvatarMenuHarness
      )

      const menuItems = await oneCXUserAvatarMenuHarness.getMenuItems()
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

      fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
      component = fixture.componentInstance
      component.ocxInitRemoteComponent({
        baseUrl: 'base_url',
        permissions: ['PROFILE#VIEW']
      } as any)
      fixture.detectChanges()

      oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(
        fixture,
        OneCXUserAvatarMenuHarness
      )

      const menuItems = await oneCXUserAvatarMenuHarness.getMenuItems()
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

      fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
      component = fixture.componentInstance
      component.ocxInitRemoteComponent({
        baseUrl: 'base_url',
        permissions: ['PROFILE#VIEW']
      } as any)
      fixture.detectChanges()

      oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(
        fixture,
        OneCXUserAvatarMenuHarness
      )

      const menuItems = await oneCXUserAvatarMenuHarness.getMenuItems()
      expect(await menuItems[0].isExternal()).toBeFalse()
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

      fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
      component = fixture.componentInstance
      component.ocxInitRemoteComponent({
        baseUrl: 'base_url',
        permissions: ['PROFILE#VIEW']
      } as any)
      fixture.detectChanges()

      oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(
        fixture,
        OneCXUserAvatarMenuHarness
      )

      const menuItems = await oneCXUserAvatarMenuHarness.getMenuItems()
      expect(await menuItems[0].isExternal()).toBeTrue()
    })

    it('should only show logout on failed menu fetch call', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(throwError(() => {}))

      fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
      component = fixture.componentInstance
      component.ocxInitRemoteComponent({
        baseUrl: 'base_url',
        permissions: ['PROFILE#VIEW']
      } as any)
      fixture.detectChanges()

      oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(
        fixture,
        OneCXUserAvatarMenuHarness
      )

      const menuItems = await oneCXUserAvatarMenuHarness.getMenuItems()
      expect(await menuItems[0].getText()).toEqual('Log out')
    })

    it('should have correct icon for logout', async () => {
      menuItemApiSpy.getMenuItems.and.returnValue(
        of({
          workspaceName: 'test-workspace',
          menu: []
        } as any)
      )

      fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
      component = fixture.componentInstance
      fixture.detectChanges()

      oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(
        fixture,
        OneCXUserAvatarMenuHarness
      )

      const menuItems = await oneCXUserAvatarMenuHarness.getMenuItems()

      expect(await menuItems[0].hasIcon(PrimeIcons.POWER_OFF)).toBeTrue()
    })

    it('should publish event on logout click', async () => {
      fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
      component = fixture.componentInstance
      fixture.detectChanges()

      spyOn(component.eventsPublisher$, 'publish')

      oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(
        fixture,
        OneCXUserAvatarMenuHarness
      )

      const menuItems = await oneCXUserAvatarMenuHarness.getMenuItems()
      await menuItems[0].selectItem()

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

      fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
      component = fixture.componentInstance
      component.ocxInitRemoteComponent({
        baseUrl: 'base_url',
        permissions: ['PROFILE#VIEW']
      } as any)
      fixture.detectChanges()

      oneCXUserAvatarMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(
        fixture,
        OneCXUserAvatarMenuHarness
      )

      expect(await oneCXUserAvatarMenuHarness.isMenuHidden()).toBeTrue()

      await oneCXUserAvatarMenuHarness.clickButton()

      expect(await oneCXUserAvatarMenuHarness.isMenuHidden()).toBeFalse()
    })
  })

  it('should create listener on ngAfterViewInit and remove it on ngOnDestroy', () => {
    const spyRemoveFunction = jasmine.createSpy()

    fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    const renderer = fixture.componentRef.injector.get<Renderer2>(Renderer2)
    spyOn(renderer, 'listen').and.returnValue(spyRemoveFunction)
    component = fixture.componentInstance
    fixture.detectChanges()

    component.ngAfterViewInit()

    expect(renderer.listen).toHaveBeenCalledWith('body', 'click', jasmine.any(Function))

    component.ngOnDestroy()
    expect(spyRemoveFunction).toHaveBeenCalledTimes(1)
  })
})
