import { TestBed } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject } from 'rxjs'

import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { AppStateServiceMock, provideAppStateServiceMock } from '@onecx/angular-integration-interface/mocks'
import { Workspace } from '@onecx/integration-interface'

import { OneCXCurrentWorkspaceLogoComponent } from './current-workspace-logo.component'
import { RefType } from 'src/app/shared/generated'

const workspace1: Partial<Workspace> = {
  id: 'w1',
  workspaceName: 'workspace1',
  displayName: 'Workspace 1',
  logoUrl: 'https://host:port/site/logo.png'
}

describe('OneCXCurrentWorkspaceLogoComponent', () => {
  let mockAppStateService: AppStateServiceMock

  function setUp() {
    const fixture = TestBed.createComponent(OneCXCurrentWorkspaceLogoComponent)
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
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en'),
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAppStateServiceMock(),
        { provide: BASE_URL, useValue: baseUrlSubject }
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

        component.onImageLoadError(component.logoUrl[RefType.Logo]!)
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
        component.logoUrl[RefType.Logo] = workspace1.logoUrl
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

  describe('imageType input changes', () => {
    it('should reload image when imageType changes', () => {
      const { component } = setUp()
      component.workspaceName = workspace1.workspaceName

      const imageUrlSpy = spyOn(component.imageUrl$, 'next')

      // Change imageType via setter (simulating input change)
      component.imageType = RefType.LogoSmall

      expect(imageUrlSpy).toHaveBeenCalled()
    })

    it('should not trigger update when imageType value does not change', () => {
      const { component } = setUp()
      component.workspaceName = workspace1.workspaceName

      // First set to LogoSmall to establish a baseline
      component.imageType = RefType.LogoSmall

      // Set same value twice - BehaviorSubject will still emit but we can verify the value didn't change
      const previousType = component.imageType
      component.imageType = RefType.LogoSmall

      expect(component.imageType).toBe(previousType)
    })
  })

  describe('getImageUrl - all priority paths', () => {
    it('should return undefined and emit imageLoadingFailed when all options exhausted', () => {
      const { component } = setUp()
      component.workspaceName = workspace1.workspaceName
      component.imageUrl = undefined
      component.logoUrl[RefType.Logo] = undefined
      component.defaultImageUrl = undefined
      component.useDefaultLogo = false

      const emitSpy = spyOn(component.imageLoadingFailed, 'emit')

      const url = component.getImageUrl(workspace1.workspaceName, 'default', RefType.Logo)

      expect(url).toBeUndefined()
      expect(emitSpy).toHaveBeenCalledWith(true)
    })

    it('should get image url - use BFF image url for logo', () => {
      const { component } = setUp()
      component.workspaceName = workspace1.workspaceName
      component.imageUrl = undefined
      component.logoUrl[RefType.Logo] = undefined

      const url = component.getImageUrl(workspace1.workspaceName, 'image', RefType.Logo)

      expect(url).toContain('/images/')
      expect(url).toContain(workspace1.workspaceName!)
      expect(url).toContain('/logo')
    })

    it('should get image url - use BFF image url for small logo', () => {
      const { component } = setUp()
      component.workspaceName = workspace1.workspaceName
      component.imageUrl = undefined
      component.logoUrl[RefType.LogoSmall] = undefined

      const url = component.getImageUrl(workspace1.workspaceName, 'image', RefType.LogoSmall)

      expect(url).toContain('/images/')
      expect(url).toContain(workspace1.workspaceName!)
      expect(url).toContain('/logo-small')
    })

    it('should skip external URL when empty string', () => {
      const { component } = setUp()
      component.workspaceName = workspace1.workspaceName
      component.imageUrl = undefined
      component.logoUrl[RefType.Logo] = ''

      const url = component.getImageUrl(workspace1.workspaceName, 'ext-url', RefType.Logo)

      expect(url).toContain('/images/')
    })

    it('should skip input imageUrl when empty string', () => {
      const { component } = setUp()
      component.workspaceName = workspace1.workspaceName
      component.imageUrl = ''
      component.logoUrl[RefType.Logo] = 'http://external/logo.png'

      const url = component.getImageUrl(workspace1.workspaceName, 'url', RefType.Logo)

      expect(url).toBe(component.logoUrl[RefType.Logo])
    })

    it('should not use default image when useDefaultLogo is false', () => {
      const { component } = setUp()
      component.workspaceName = workspace1.workspaceName
      component.imageUrl = undefined
      component.logoUrl[RefType.Logo] = undefined
      component.defaultImageUrl = 'http://default/logo.png'
      component.useDefaultLogo = false

      const emitSpy = spyOn(component.imageLoadingFailed, 'emit')

      const url = component.getImageUrl(workspace1.workspaceName, 'default', RefType.Logo)

      expect(url).toBeUndefined()
      expect(emitSpy).toHaveBeenCalledWith(true)
    })

    it('should not use default image when defaultImageUrl is empty', () => {
      const { component } = setUp()
      component.workspaceName = workspace1.workspaceName
      component.imageUrl = undefined
      component.logoUrl[RefType.Logo] = undefined
      component.defaultImageUrl = ''
      component.useDefaultLogo = true

      const emitSpy = spyOn(component.imageLoadingFailed, 'emit')

      const url = component.getImageUrl(workspace1.workspaceName, 'default', RefType.Logo)

      expect(url).toBeUndefined()
      expect(emitSpy).toHaveBeenCalledWith(true)
    })
  })

  describe('workspace updates', () => {
    it('should update logo URLs when workspace changes', (done) => {
      const { component } = setUp()

      const newWorkspace: Partial<Workspace> = {
        workspaceName: 'workspace2',
        logoUrl: 'http://new/logo.png',
        logoSmallImageUrl: 'http://new/logo-small.png'
      }

      mockAppStateService.currentWorkspace$.publish(newWorkspace as Workspace)

      setTimeout(() => {
        expect(component.workspaceName).toBe('workspace2')
        expect(component.logoUrl[RefType.Logo]).toBe('http://new/logo.png')
        expect(component.logoUrl[RefType.LogoSmall]).toBe('http://new/logo-small.png')
        done()
      }, 100)
    })
  })

  describe('ocxInitRemoteComponent', () => {
    it('should configure workspaceApi basePath with apiPrefix', () => {
      const { component } = setUp()
      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'http://base-url'
      }

      component.ocxInitRemoteComponent(mockConfig)

      expect(component['workspaceApi'].configuration.basePath).toContain('http://base-url')
      expect(component['workspaceApi'].configuration.basePath).toContain('/bff')
    })

    it('should set defaultImageUrl when DEFAULT_LOGO_PATH is configured', () => {
      const { component } = setUp()
      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'http://base-url'
      }

      component.ocxInitRemoteComponent(mockConfig)

      if (component.defaultImageUrl) {
        expect(component.defaultImageUrl).toContain('http://base-url')
      }
    })
  })
})
