import { TestBed } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, ReplaySubject } from 'rxjs'

import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { AppStateServiceMock, FakeTopic, provideAppStateServiceMock } from '@onecx/angular-integration-interface/mocks'
import { Workspace } from '@onecx/integration-interface'

import { OneCXCurrentWorkspaceLogoComponent } from './current-workspace-logo.component'
import { RefType } from 'src/app/shared/generated'
import { Topic } from '@onecx/accelerator'
import { MenuService } from 'src/app/shared/services/menu.service'

const workspace1: Partial<Workspace> = {
  id: 'w1',
  workspaceName: 'workspace1',
  displayName: 'Workspace 1',
  logoUrl: 'https://host:port/site/logo.png'
}

describe('OneCXCurrentWorkspaceLogoComponent', () => {
  let mockAppStateService: AppStateServiceMock
  let fakeEventsTopic: FakeTopic<any>
  const menuServiceSpy = jasmine.createSpyObj<MenuService>('MenuService', ['isVisible', 'isActive'])

  function setUp() {
    const fixture = TestBed.createComponent(OneCXCurrentWorkspaceLogoComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()
    fakeEventsTopic = new FakeTopic()
    component['eventsTopic'] = fakeEventsTopic as unknown as Topic<any>
    return { fixture, component }
  }

  let baseUrlSubject: ReplaySubject<any>
  beforeEach(() => {
    baseUrlSubject = new ReplaySubject<any>(1)
    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en'),
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAppStateServiceMock(),
        { provide: BASE_URL, useValue: baseUrlSubject },
        { provide: MenuService, useValue: menuServiceSpy }
      ]
    })
      .overrideComponent(OneCXCurrentWorkspaceLogoComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule],
          providers: []
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')
    mockAppStateService = TestBed.inject(AppStateServiceMock)
    mockAppStateService.currentWorkspace$.publish({
      workspaceName: workspace1.workspaceName,
      logoUrl: workspace1.logoUrl
    } as Workspace)
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

  describe('provide logo', () => {
    it('should load - initially', (done) => {
      const { component } = setUp()
      component.logEnabled = true
      component.logPrefix = 'prefix'
      component.workspaceName = workspace1.workspaceName

      component.onImageLoadSuccess()

      component.imageUrl$?.subscribe({
        next: (data) => {
          if (data) {
            expect(data).toBe(workspace1.logoUrl!)
          }
          done()
        },
        error: done.fail
      })
    })

    describe('on load error', () => {
      it('should failed - use image url', () => {
        const { component } = setUp()
        component.logEnabled = true // log without prefix !
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = 'http://image/url'

        component.onImageLoadError(component.imageUrl)
      })

      it('should failed - use external URL', () => {
        const { component } = setUp()
        component.logEnabled = false
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = undefined

        component.onImageLoadError(component.logoUrl['logo']!)
      })

      it('should failed - use default', () => {
        const { component } = setUp()
        component.logEnabled = false
        component.workspaceName = workspace1.workspaceName

        component.onImageLoadError('http://onecx-workspace-bff:8080/images/' + workspace1.workspaceName + '/logo')
      })
    })

    describe('provide logo - get url', () => {
      it('should get image url - use input image url', () => {
        const { component } = setUp()
        component.logEnabled = false
        component.logPrefix = 'url'
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = '/url'

        const url = component.getImageUrl(workspace1.workspaceName, 'url', RefType.Logo)

        expect(url).toBe(component.imageUrl)
      })

      it('should get image url without input URL - use the external URL', () => {
        const { component } = setUp()
        component.logEnabled = false
        component.logPrefix = 'ext-url'
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = undefined

        const url = component.getImageUrl(workspace1.workspaceName, 'url', RefType.Logo)

        expect(url).toBe(workspace1.logoUrl)
      })

      it('should get image url - use default image url', () => {
        const { component } = setUp()
        component.logEnabled = false
        component.logPrefix = 'default url'
        component.workspaceName = workspace1.workspaceName
        component.defaultImageUrl = '/default/url'
        component.useDefaultLogo = true // enable use of default image

        const url = component.getImageUrl(workspace1.workspaceName, 'default', RefType.Logo)

        expect(url).toBe(component.defaultImageUrl)
      })

      it('should get url - unknown prio type', () => {
        const { component } = setUp()
        component.logEnabled = false
        component.logPrefix = 'default url'
        component.workspaceName = workspace1.workspaceName
        component.defaultImageUrl = '/default/url'
        component.useDefaultLogo = false // enable use of default image

        const url = component.getImageUrl(workspace1.workspaceName, 'unknown', RefType.Logo)

        expect(url).toBeUndefined()
      })
    })
  })

  describe('dynamic width', () => {
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
        type: 'slot#resized',
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
        type: 'slot#resized',
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
        type: 'slot#resized',
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
        type: 'slotGroup#resized',
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
        type: 'slotGroup#resized',
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
        type: 'slot#resized',
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
      component.imageType = RefType.Logo

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig

      const imageUrlSpy = spyOn(component.imageUrl$, 'next')

      fakeEventsTopic.publish({
        type: 'slot#resized',
        payload: {
          slotName: 'onecx-shell-vertical-menu',
          slotDetails: {
            width: 200,
            height: 800
          }
        }
      })

      expect(component.imageType).toEqual(RefType.LogoSmall)
      expect(imageUrlSpy).toHaveBeenCalled()
    })

    it('should not switch to small logo when already using small logo', () => {
      document.documentElement.style.fontSize = '16px' // 1rem = 16px
      const { component } = setUp()
      component.imageType = RefType.LogoSmall

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig

      const imageUrlSpy = spyOn(component.imageUrl$, 'next')

      fakeEventsTopic.publish({
        type: 'slot#resized',
        payload: {
          slotName: 'onecx-shell-vertical-menu',
          slotDetails: {
            width: 200,
            height: 800
          }
        }
      })

      expect(component.imageType).toEqual(RefType.LogoSmall)
      expect(imageUrlSpy).not.toHaveBeenCalled()
    })

    it('should not switch to small logo when width is above threshold', () => {
      document.documentElement.style.fontSize = '16px' // 1rem = 16px
      const { component } = setUp()
      component.imageType = RefType.Logo

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }

      component.ocxRemoteComponentConfig = mockConfig

      const imageUrlSpy = spyOn(component.imageUrl$, 'next')

      fakeEventsTopic.publish({
        type: 'slot#resized',
        payload: {
          slotName: 'onecx-shell-vertical-menu',
          slotDetails: {
            width: 400,
            height: 800
          }
        }
      })

      expect(component.imageType).toEqual(RefType.Logo)
      expect(imageUrlSpy).not.toHaveBeenCalled()
    })
  })
})
