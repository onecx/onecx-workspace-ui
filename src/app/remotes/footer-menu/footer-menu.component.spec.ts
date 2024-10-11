import { TestBed } from '@angular/core/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { CommonModule } from '@angular/common'
import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { AppStateService } from '@onecx/angular-integration-interface'
import { ReplaySubject, of } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { MenuItemAPIService } from 'src/app/shared/generated'
import { OneCXFooterMenuComponent } from './footer-menu.component'
import { OneCXFooterMenuHarness } from './footer-menu.harness'
import { RouterTestingModule } from '@angular/router/testing'
import { Router, RouterModule } from '@angular/router'

describe('OneCXFooterMenuComponent', () => {
  const menuItemApiSpy = jasmine.createSpyObj<MenuItemAPIService>('MenuItemAPIService', ['getMenuItems'])

  function setUp() {
    const fixture = TestBed.createComponent(OneCXFooterMenuComponent)
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
            path: 'contact',
            component: {} as any
          },
          {
            path: 'contact2',
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
      .overrideComponent(OneCXFooterMenuComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule, RouterModule],
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
            key: 'FOOTER_MENU',
            name: 'Footer menu',
            children: [
              {
                external: false,
                i18n: {
                  en: 'English Contact value',
                  de: 'German Contact value'
                },
                name: 'Contact',
                key: 'FOOTER_CONTACT',
                url: '/contact'
              },
              {
                external: false,
                i18n: {},
                name: 'Contact',
                key: 'FOOTER_CONTACT_ONLY_NAME',
                url: '/contact2'
              }
            ]
          }
        ]
      } as any)
    )
    const router = TestBed.inject(Router)

    const { fixture, component } = setUp()
    await component.ngOnInit()

    const oneCXFooterMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXFooterMenuHarness)
    const menuItems = await oneCXFooterMenuHarness.getMenuItems()
    expect(menuItems.length).toEqual(2)

    const translatedItem = await oneCXFooterMenuHarness.getMenuItem('ws_footer_footer_contact_link')
    expect(translatedItem).toBeTruthy()
    expect(await translatedItem?.text()).toEqual('English Contact value')
    await translatedItem?.click()
    expect(router.url).toBe('/contact')

    const nameItem = await oneCXFooterMenuHarness.getMenuItem('ws_footer_footer_contact_only_name_link')
    expect(nameItem).toBeTruthy()
    expect(await nameItem?.text()).toEqual('Contact')
    await nameItem?.click()
    expect(router.url).toBe('/contact2')
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
            key: 'FOOTER_MENU',
            name: 'Footer menu',
            children: [
              {
                external: true,
                i18n: {},
                name: 'Browser',
                key: 'BROWSER',
                url: 'https://www.google.com/'
              }
            ]
          }
        ]
      } as any)
    )

    const { fixture, component } = setUp()
    await component.ngOnInit()

    const oneCXFooterMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXFooterMenuHarness)
    const menuItems = await oneCXFooterMenuHarness.getMenuItems()
    expect(menuItems.length).toEqual(1)

    const item = menuItems[0]
    expect(item).toBeTruthy()
    expect(await item?.text()).toEqual('Browser')
    expect(await item?.getAttribute('href')).toEqual('https://www.google.com/')
  })
})
