import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideRouter, Router } from '@angular/router'
import { firstValueFrom, Observable, of, throwError } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { RemoteComponentConfig } from '@onecx/angular-remote-components'
import {
  AppStateServiceMock,
  provideAppConfigServiceMock,
  provideAppStateServiceMock,
  provideUserServiceMock
} from '@onecx/angular-integration-interface/mocks'
import { Workspace } from '@onecx/integration-interface'

import { MenuItemAPIService } from 'src/app/shared/generated'
import { OneCXFooterMenuComponent } from './footer-menu.component'
import { OneCXFooterMenuHarness } from './footer-menu.harness'

describe('OneCXFooterMenuComponent', () => {
  const menuResponse = (children: any[]) =>
    of({
      workspaceName: 'test-workspace',
      menu: [{ key: 'FOOTER_MENU', name: 'Footer menu', children }]
    } as any)

  let appStateMock: AppStateServiceMock

  function setUp() {
    const fixture = TestBed.createComponent(OneCXFooterMenuComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()
    return { fixture, component }
  }

  // MenuItemAPIService is providedIn 'any', so the component holds its own instance - a root-level
  // provider would be shadowed, thus spy on the actual instance the component uses
  function spyGetMenuItems(component: OneCXFooterMenuComponent): jasmine.Spy {
    return spyOn(
      (component as unknown as { menuItemApiService: MenuItemAPIService }).menuItemApiService,
      'getMenuItems'
    )
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OneCXFooterMenuComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAppConfigServiceMock(),
        provideAppStateServiceMock(),
        provideUserServiceMock(),
        provideRouter([
          { path: 'contact', component: OneCXFooterMenuComponent },
          { path: 'contact2', component: OneCXFooterMenuComponent }
        ])
      ]
    }).compileComponents()

    appStateMock = TestBed.inject(AppStateServiceMock)
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

  it('should init remote component', async () => {
    const { component } = setUp()
    const mockConfig: RemoteComponentConfig = {
      appId: 'appId',
      productName: 'prodName',
      permissions: [],
      baseUrl: 'base_url'
    }
    component.ocxInitRemoteComponent(mockConfig)

    const menuItemApi = (component as unknown as { menuItemApiService: MenuItemAPIService }).menuItemApiService
    const remoteConfig = (component as unknown as { remoteComponentConfig: Observable<RemoteComponentConfig> })
      .remoteComponentConfig

    expect(menuItemApi.configuration.basePath).toEqual('base_url/bff')
    expect(await firstValueFrom(remoteConfig)).toEqual(mockConfig)
  })

  it('should use routerLink for local urls', async () => {
    const { fixture, component } = setUp()
    spyGetMenuItems(component).and.returnValue(
      menuResponse([
        {
          external: false,
          i18n: { en: 'English Contact value', de: 'German Contact value' },
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
      ])
    )
    const router = TestBed.inject(Router)

    // the menu pipeline is driven by the current workspace emission
    appStateMock.currentWorkspace$.publish({ workspaceName: 'test-workspace' } as Workspace)
    await fixture.whenStable()
    fixture.detectChanges()

    const harness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXFooterMenuHarness)
    const menuItems = await harness.getMenuItems()
    expect(menuItems.length).toEqual(2)

    const translatedItem = await harness.getMenuItem('ws_footer_menu_footer_contact_link')
    expect(translatedItem).toBeTruthy()
    expect(await translatedItem?.text()).toEqual('English Contact value')
    await translatedItem?.click()
    expect(router.url).toBe('/contact')

    const nameItem = await harness.getMenuItem('ws_footer_menu_footer_contact_only_name_link')
    expect(nameItem).toBeTruthy()
    expect(await nameItem?.text()).toEqual('Contact')
    await nameItem?.click()
    expect(router.url).toBe('/contact2')
  })

  it('should use href for external urls', async () => {
    const { fixture, component } = setUp()
    spyGetMenuItems(component).and.returnValue(
      menuResponse([{ external: true, i18n: {}, name: 'Browser', key: 'BROWSER', url: 'https://www.google.com/' }])
    )

    appStateMock.currentWorkspace$.publish({ workspaceName: 'test-workspace' } as Workspace)
    await fixture.whenStable()
    fixture.detectChanges()

    const harness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXFooterMenuHarness)
    const menuItems = await harness.getMenuItems()
    expect(menuItems.length).toEqual(1)

    const item = menuItems[0]
    expect(item).toBeTruthy()
    expect(await item?.text()).toEqual('Browser')
    expect(await item?.getAttribute('href')).toEqual('https://www.google.com/')
  })

  it('should return 0 menu items when unable to load them', async () => {
    const { fixture, component } = setUp()
    const consoleErrorSpy = spyOn(console, 'error')
    spyGetMenuItems(component).and.returnValue(throwError(() => new Error('unable to load menu')))

    appStateMock.currentWorkspace$.publish({ workspaceName: 'test-workspace' } as Workspace)

    // the component retries the failing call (retry: delay 500ms, count 3) before giving up
    await new Promise((resolve) => setTimeout(resolve, 1700))
    fixture.detectChanges()

    const harness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXFooterMenuHarness)
    const menuItems = await harness.getMenuItems()
    expect(menuItems.length).toEqual(0)
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})
