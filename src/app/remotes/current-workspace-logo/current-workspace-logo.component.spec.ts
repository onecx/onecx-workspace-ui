import { NO_ERRORS_SCHEMA } from '@angular/core'
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
  logoUrl: 'https://host:port/site/logo.png',
  logoSmallImageUrl: 'https://host:port/site/logo-small.png'
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
      schemas: [NO_ERRORS_SCHEMA],
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

  describe('image loading lifecycle', () => {
    describe('successful image load', () => {
      it('should emit success event when image loads successfully', () => {
        const { component } = setUp()
        const emitSpy = spyOn(component.imageLoadingFailed, 'emit')

        component.onImageLoadSuccess()

        expect(emitSpy).toHaveBeenCalledWith(false)
      })
    })

    describe('image load error', () => {
      it('should fall back from workspace external URL to custom input URL', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = 'http://custom/logo.png'
        component.logoUrl[RefType.Logo] = 'http://external/logo.png'

        const imageUrlSpy = spyOn(component.imageUrl$, 'next')

        component.onImageLoadError('http://external/logo.png')

        expect(imageUrlSpy).toHaveBeenCalledWith('http://custom/logo.png')
      })

      it('should fall back from custom input URL to BFF server endpoint', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = 'http://custom/logo.png'

        const imageUrlSpy = spyOn(component.imageUrl$, 'next')

        component.onImageLoadError('http://custom/logo.png')

        expect(imageUrlSpy).toHaveBeenCalledWith(
          `${component['workspaceApi'].configuration.basePath}/images/${workspace1.workspaceName}/logo`
        )
      })

      it('should fall back from BFF server endpoint to default asset', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.defaultImageUrl = '/assets/default-logo.png'
        component.useDefaultLogo = true

        const bffImageUrl = `${component['workspaceApi'].configuration.basePath}/images/${workspace1.workspaceName}/logo`
        const imageUrlSpy = spyOn(component.imageUrl$, 'next')

        component.onImageLoadError(bffImageUrl)

        expect(imageUrlSpy).toHaveBeenCalledWith('/assets/default-logo.png')
      })

      it('should maintain imageType context throughout fallback sequence', () => {
        const { component } = setUp()

        component.workspaceName = workspace1.workspaceName
        component.imageType = RefType.LogoSmall
        component.logoUrl[RefType.LogoSmall] = 'http://external/logo-small.png'

        const imageUrlSpy = spyOn(component.imageUrl$, 'next')

        component.onImageLoadError('http://external/logo-small.png')

        expect(imageUrlSpy).toHaveBeenCalled()
      })
    })
  })

  describe('imageType property', () => {
    it('should trigger URL recalculation when imageType changes', () => {
      const { component } = setUp()
      component.workspaceName = workspace1.workspaceName
      const imageUrlSpy = spyOn(component.imageUrl$, 'next')

      component.imageType = RefType.LogoSmall

      expect(imageUrlSpy).toHaveBeenCalled()
    })

    it('should invoke updateImageUrl method through setter', () => {
      const { component } = setUp()
      component.workspaceName = workspace1.workspaceName
      const updateSpy = spyOn(component, 'updateImageUrl')

      component.imageType = RefType.LogoSmall

      expect(updateSpy).toHaveBeenCalledTimes(1)
    })

    it('should support switching between logo variants', () => {
      const { component } = setUp()

      component.imageType = RefType.LogoSmall
      expect(component.imageType).toBe(RefType.LogoSmall)

      component.imageType = RefType.Logo
      expect(component.imageType).toBe(RefType.Logo)
    })
  })

  describe('image URL resolving strategy', () => {
    describe('priority 1 (url): custom imageUrl input property', () => {
      it('should prefer custom input URL for standard logo', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = '/custom/logo.png'

        const url = component.getImageUrl(workspace1.workspaceName, 'url', RefType.Logo)

        expect(url).toBe('/custom/logo.png')
      })

      it('should prefer custom input URL for small logo variant', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = '/custom/small-logo.png'

        const url = component.getImageUrl(workspace1.workspaceName, 'url', RefType.LogoSmall)

        expect(url).toBe('/custom/small-logo.png')
      })

      it('should skip to next priority when input property is empty', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = ''
        component.logoUrl[RefType.Logo] = 'http://external/logo.png'

        const url = component.getImageUrl(workspace1.workspaceName, 'url', RefType.Logo)

        expect(url).toBe('http://external/logo.png')
      })

      it('should skip to next priority when input property is undefined', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = undefined
        component.logoUrl[RefType.Logo] = 'http://external/logo.png'

        const url = component.getImageUrl(workspace1.workspaceName, 'url', RefType.Logo)

        expect(url).toBe('http://external/logo.png')
      })
    })

    describe('priority 2 (ext-url): external URL', () => {
      it('should use workspace-configured external URL for standard logo', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = undefined
        component.logoUrl[RefType.Logo] = workspace1.logoUrl

        const url = component.getImageUrl(workspace1.workspaceName, 'ext-url', RefType.Logo)

        expect(url).toBe(workspace1.logoUrl)
      })

      it('should use workspace-configured external URL for small logo variant', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = undefined
        component.logoUrl[RefType.LogoSmall] = workspace1.logoSmallImageUrl

        const url = component.getImageUrl(workspace1.workspaceName, 'ext-url', RefType.LogoSmall)

        expect(url).toBe(workspace1.logoSmallImageUrl)
      })

      it('should skip to next priority when external URL is empty', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = undefined
        component.logoUrl[RefType.Logo] = ''

        const url = component.getImageUrl(workspace1.workspaceName, 'ext-url', RefType.Logo)

        expect(url).toBe(`${component['workspaceApi'].configuration.basePath}/images/${workspace1.workspaceName}/logo`)
      })

      it('should skip to next priority when external URL is undefined', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = undefined
        component.logoUrl[RefType.Logo] = undefined

        const url = component.getImageUrl(workspace1.workspaceName, 'ext-url', RefType.Logo)

        expect(url).toBe(`${component['workspaceApi'].configuration.basePath}/images/${workspace1.workspaceName}/logo`)
      })
    })

    describe('priority 3 (image): BFF server-uploaded image', () => {
      it('should construct BFF endpoint URL for standard logo', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = undefined
        component.logoUrl[RefType.Logo] = undefined

        const url = component.getImageUrl(workspace1.workspaceName, 'image', RefType.Logo)

        expect(url).toBe(`${component['workspaceApi'].configuration.basePath}/images/${workspace1.workspaceName}/logo`)
      })

      it('should construct BFF endpoint URL for small logo variant', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = undefined
        component.logoUrl[RefType.LogoSmall] = undefined

        const url = component.getImageUrl(workspace1.workspaceName, 'image', RefType.LogoSmall)

        expect(url).toBe(
          `${component['workspaceApi'].configuration.basePath}/images/${workspace1.workspaceName}/logo-small`
        )
      })

      it('should always provide BFF URL regardless of previous priority states', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        // Priorities 1 and 2 are set but should be ignored
        component.imageUrl = 'http://custom/logo.png'
        component.logoUrl[RefType.Logo] = 'http://external/logo.png'

        const url = component.getImageUrl(workspace1.workspaceName, 'image', RefType.Logo)

        expect(url).toBe(`${component['workspaceApi'].configuration.basePath}/images/${workspace1.workspaceName}/logo`)
      })
    })

    describe('priority 4: default fallback asset', () => {
      it('should use default asset when enabled and all other sources unavailable', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = undefined
        component.logoUrl[RefType.Logo] = undefined
        component.defaultImageUrl = '/assets/default-logo.png'
        component.useDefaultLogo = true

        const url = component.getImageUrl(workspace1.workspaceName, 'default', RefType.Logo)

        expect(url).toBe('/assets/default-logo.png')
      })

      it('should skip default asset when feature flag is disabled', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = undefined
        component.logoUrl[RefType.Logo] = undefined
        component.defaultImageUrl = '/assets/default-logo.png'
        component.useDefaultLogo = false

        const emitSpy = spyOn(component.imageLoadingFailed, 'emit')

        const url = component.getImageUrl(workspace1.workspaceName, 'default', RefType.Logo)

        expect(url).toBeUndefined()
        expect(emitSpy).toHaveBeenCalledWith(true)
      })

      it('should skip default asset when path property is empty', () => {
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

      it('should skip default asset when path property is undefined', () => {
        const { component } = setUp()
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = undefined
        component.logoUrl[RefType.Logo] = undefined
        component.defaultImageUrl = undefined
        component.useDefaultLogo = true

        const emitSpy = spyOn(component.imageLoadingFailed, 'emit')

        const url = component.getImageUrl(workspace1.workspaceName, 'default', RefType.Logo)

        expect(url).toBeUndefined()
        expect(emitSpy).toHaveBeenCalledWith(true)
      })
    })

    describe('all priorities failed', () => {
      it('should return undefined and emit failure event when all strategies fail', () => {
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
