import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { CommonModule } from '@angular/common'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { PPanelMenuHarness } from '@onecx/angular-testing'
import { AppStateService } from '@onecx/angular-integration-interface'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject, of } from 'rxjs'
import { PanelMenuModule } from 'primeng/panelmenu'
import { PrimeIcons } from 'primeng/api'
import { MenuItemAPIService } from 'src/app/shared/generated'
import { OneCXVerticalMainMenuComponent } from './vertical-main-menu.component'

describe('OneCXVerticalMainMenuComponent', () => {
  let component: OneCXVerticalMainMenuComponent
  let fixture: ComponentFixture<OneCXVerticalMainMenuComponent>

  const menuItemApiSpy = jasmine.createSpyObj<MenuItemAPIService>('MenuItemAPIService', ['getMenuItems'])

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
        }
      ]
    })
      .overrideComponent(OneCXVerticalMainMenuComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule, RouterTestingModule, PanelMenuModule],
          providers: [{ provide: MenuItemAPIService, useValue: menuItemApiSpy }]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')

    menuItemApiSpy.getMenuItems.calls.reset()
  })

  it('should create', () => {
    fixture = TestBed.createComponent(OneCXVerticalMainMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()

    expect(component).toBeTruthy()
  })

  it('should init remote component', (done: DoneFn) => {
    fixture = TestBed.createComponent(OneCXVerticalMainMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()

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

    fixture = TestBed.createComponent(OneCXVerticalMainMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
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

    fixture = TestBed.createComponent(OneCXVerticalMainMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
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

    fixture = TestBed.createComponent(OneCXVerticalMainMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
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

    fixture = TestBed.createComponent(OneCXVerticalMainMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PPanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(1)

    expect(await panels[0].isExternal()).toBeFalse()
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

    fixture = TestBed.createComponent(OneCXVerticalMainMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    await component.ngOnInit()

    const menu = await TestbedHarnessEnvironment.harnessForFixture(fixture, PPanelMenuHarness)
    const panels = await menu.getAllPanels()
    expect(panels.length).toEqual(1)

    expect(await panels[0].isExternal()).toBeTrue()
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

    fixture = TestBed.createComponent(OneCXVerticalMainMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
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
})
