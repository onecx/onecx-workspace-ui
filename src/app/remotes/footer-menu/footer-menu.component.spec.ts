import { ComponentFixture, TestBed } from '@angular/core/testing'
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

describe('OneCXFooterMenuComponent', () => {
  let component: OneCXFooterMenuComponent
  let fixture: ComponentFixture<OneCXFooterMenuComponent>
  let oneCXFooterMenuHarness: OneCXFooterMenuHarness

  const menuItemApiSpy = jasmine.createSpyObj<MenuItemAPIService>('MenuItemAPIService', ['getMenuItems'])

  let baseUrlSubject: ReplaySubject<any>
  beforeEach(() => {
    baseUrlSubject = new ReplaySubject<any>(1)
    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        TranslateTestingModule.withTranslations({
          en: require('../../../assets/i18n/en.json')
        }).withDefaultLanguage('en')
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
          imports: [TranslateTestingModule, CommonModule, RouterTestingModule],
          providers: [{ provide: MenuItemAPIService, useValue: menuItemApiSpy }]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')

    menuItemApiSpy.getMenuItems.calls.reset()
  })

  it('should create', () => {
    fixture = TestBed.createComponent(OneCXFooterMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()

    expect(component).toBeTruthy()
  })

  it('should init remote component', (done: DoneFn) => {
    fixture = TestBed.createComponent(OneCXFooterMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()

    component.ocxInitRemoteComponent({
      baseUrl: 'base_url'
    } as RemoteComponentConfig)

    expect(menuItemApiSpy.configuration.basePath).toEqual('base_url/bff')
    baseUrlSubject.asObservable().subscribe((item) => {
      console.log(item)
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
                url: '/contact'
              }
            ]
          }
        ]
      } as any)
    )

    fixture = TestBed.createComponent(OneCXFooterMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    await component.ngOnInit()

    oneCXFooterMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXFooterMenuHarness)
    const menuItems = await oneCXFooterMenuHarness.getMenuItems()
    expect(menuItems.length).toEqual(2)

    const translatedItemArr = await Promise.all(
      menuItems.map(async (item) => {
        const id = await item.getAttribute('id')
        return id === 'footer-FOOTER_CONTACT-router'
      })
    )
    const translatedItem = menuItems.find((_, index) => translatedItemArr[index])
    expect(translatedItem).toBeTruthy()
    expect(await translatedItem?.text()).toEqual('English Contact value')
    expect(await translatedItem?.getAttribute('ng-reflect-router-link')).toEqual('/contact')

    const nameItemArr = await Promise.all(
      menuItems.map(async (item) => {
        const id = await item.getAttribute('id')
        return id === 'footer-FOOTER_CONTACT_ONLY_NAME-router'
      })
    )
    const nameItem = menuItems.find((_, index) => nameItemArr[index])
    expect(nameItem).toBeTruthy()
    expect(await nameItem?.text()).toEqual('Contact')
    expect(await nameItem?.getAttribute('ng-reflect-router-link')).toEqual('/contact')
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

    fixture = TestBed.createComponent(OneCXFooterMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    await component.ngOnInit()

    oneCXFooterMenuHarness = await TestbedHarnessEnvironment.harnessForFixture(fixture, OneCXFooterMenuHarness)
    const menuItems = await oneCXFooterMenuHarness.getMenuItems()
    expect(menuItems.length).toEqual(1)

    const item = menuItems[0]
    expect(item).toBeTruthy()
    expect(await item?.text()).toEqual('Browser')
    expect(await item?.getAttribute('href')).toEqual('https://www.google.com/')
  })
})
