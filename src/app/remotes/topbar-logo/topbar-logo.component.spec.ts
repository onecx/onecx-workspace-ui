import { TestBed } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, ReplaySubject } from 'rxjs'

import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { FakeTopic } from '@onecx/angular-integration-interface/mocks'

import { OneCXTopbarLogoComponent } from './topbar-logo.component'
import { RefType } from 'src/app/shared/generated'
import { Topic } from '@onecx/accelerator'
import { MenuService } from 'src/app/shared/services/menu.service'
import { OneCXCurrentWorkspaceLogoComponent } from '../current-workspace-logo/current-workspace-logo.component'
import { ResizedEventType } from '../../shared/resized-events/v1/resized-event-type'

describe('OneCXTopbarLogoComponent', () => {
  let fakeEventsTopic: FakeTopic<any>
  const menuServiceSpy = jasmine.createSpyObj<MenuService>('MenuService', ['isVisible', 'isActive'])

  function setUp() {
    const fixture = TestBed.createComponent(OneCXTopbarLogoComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()
    fakeEventsTopic = new FakeTopic()
    component['resizedEventsTopic'] = fakeEventsTopic as unknown as Topic<any>
    return { fixture, component }
  }

  let baseUrlSubject: ReplaySubject<any>
  beforeEach(() => {
    baseUrlSubject = new ReplaySubject<any>(1)
    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        OneCXCurrentWorkspaceLogoComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en'),
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BASE_URL, useValue: baseUrlSubject },
        { provide: MenuService, useValue: menuServiceSpy }
      ]
    })
      .overrideComponent(OneCXTopbarLogoComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule, OneCXCurrentWorkspaceLogoComponent],
          providers: []
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')
    menuServiceSpy.isActive.and.returnValue(of(true))
    menuServiceSpy.isVisible.and.returnValue(of(true))
  })

  describe('initialize', () => {
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

      component.ocxInitRemoteComponent({ baseUrl: 'base_url' } as RemoteComponentConfig)

      baseUrlSubject.asObservable().subscribe((item) => {
        expect(item).toEqual('base_url')
        done()
      })
    })
  })

  describe('dynamic width and logo type switching', () => {
    it('should have default width', () => {
      const { component } = setUp()

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig

      expect(component.container.nativeElement.style.width).toEqual('14.5rem')
    })

    it('should not change if slotWidth is not set', () => {
      const { component } = setUp()

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig
      fakeEventsTopic.publish({
        type: ResizedEventType.SLOT_RESIZED,
        payload: {
          slotName: 'onecx-shell-vertical-menu',
          slotDetails: {
            height: 800
          }
        }
      })

      expect(component.container.nativeElement.style.width).toEqual('14.5rem')
    })

    it('should change if slotWidth is set', () => {
      document.documentElement.style.fontSize = '16px' // 1rem = 16px
      const { component } = setUp()

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig
      fakeEventsTopic.publish({
        type: ResizedEventType.SLOT_RESIZED,
        payload: {
          slotName: 'onecx-shell-vertical-menu',
          slotDetails: {
            width: 400,
            height: 800
          }
        }
      })

      const expectedWidth = 400 - 16 * 2.5 + 'px'
      expect(component.container.nativeElement.style.width).toEqual(expectedWidth)
    })

    it('should not change if static menu is not active', () => {
      document.documentElement.style.fontSize = '16px' // 1rem = 16px
      menuServiceSpy.isActive.and.returnValue(of(false))

      const { component } = setUp()

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig
      fakeEventsTopic.publish({
        type: ResizedEventType.SLOT_RESIZED,
        payload: {
          slotName: 'onecx-shell-vertical-menu',
          slotDetails: {
            width: 400,
            height: 800
          }
        }
      })

      expect(component.container.nativeElement.style.width).toEqual('400px')
    })

    it('should handle slot group resized event', () => {
      document.documentElement.style.fontSize = '16px' // 1rem = 16px
      const { component } = setUp()

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig
      fakeEventsTopic.publish({
        type: ResizedEventType.SLOT_GROUP_RESIZED,
        payload: {
          slotGroupName: 'onecx-shell-body-start',
          slotGroupDetails: {
            width: 300,
            height: 800
          }
        }
      })

      const expectedWidth = 300 - 16 * 2.5 + 'px'
      expect(component.container.nativeElement.style.width).toEqual(expectedWidth)
    })

    it('should handle slot group resized event when static menu is not active', () => {
      document.documentElement.style.fontSize = '16px' // 1rem = 16px
      menuServiceSpy.isActive.and.returnValue(of(false))

      const { component } = setUp()

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig
      fakeEventsTopic.publish({
        type: ResizedEventType.SLOT_GROUP_RESIZED,
        payload: {
          slotGroupName: 'onecx-shell-body-start',
          slotGroupDetails: {
            width: 300,
            height: 800
          }
        }
      })

      expect(component.container.nativeElement.style.width).toEqual('300px')
    })

    it('should keep default width when slot width is zero', () => {
      const { component } = setUp()

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig
      fakeEventsTopic.publish({
        type: ResizedEventType.SLOT_RESIZED,
        payload: {
          slotName: 'onecx-shell-vertical-menu',
          slotDetails: {
            width: 0,
            height: 800
          }
        }
      })

      expect(component.container.nativeElement.style.width).toEqual('14.5rem')
    })

    it('should switch to small logo when width is below threshold', () => {
      document.documentElement.style.fontSize = '16px' // 1rem = 16px
      const { component } = setUp()
      component.currentImageType = RefType.Logo

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig

      fakeEventsTopic.publish({
        type: ResizedEventType.SLOT_RESIZED,
        payload: {
          slotName: 'onecx-shell-vertical-menu',
          slotDetails: {
            width: 200,
            height: 800
          }
        }
      })

      expect(component.currentImageType).toEqual(RefType.LogoSmall)
    })

    it('should not switch to small logo when already using small logo', () => {
      document.documentElement.style.fontSize = '16px' // 1rem = 16px
      const { component } = setUp()
      component.currentImageType = RefType.LogoSmall

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig

      fakeEventsTopic.publish({
        type: ResizedEventType.SLOT_RESIZED,
        payload: {
          slotName: 'onecx-shell-vertical-menu',
          slotDetails: {
            width: 200,
            height: 800
          }
        }
      })

      expect(component.currentImageType).toEqual(RefType.LogoSmall)
    })

    it('should switch back to regular logo when width is above threshold', () => {
      document.documentElement.style.fontSize = '16px' // 1rem = 16px
      const { component } = setUp()
      component.currentImageType = RefType.LogoSmall

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig

      fakeEventsTopic.publish({
        type: ResizedEventType.SLOT_RESIZED,
        payload: {
          slotName: 'onecx-shell-vertical-menu',
          slotDetails: {
            width: 400,
            height: 800
          }
        }
      })

      expect(component.currentImageType).toEqual(RefType.Logo)
    })
  })
})
