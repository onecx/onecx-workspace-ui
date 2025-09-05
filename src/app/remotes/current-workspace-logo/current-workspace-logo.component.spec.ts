import { TestBed } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, ReplaySubject } from 'rxjs'

import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { AppStateServiceMock, provideAppStateServiceMock } from '@onecx/angular-integration-interface/mocks'
import { Workspace } from '@onecx/integration-interface'

import { OneCXCurrentWorkspaceLogoComponent } from './current-workspace-logo.component'

const workspace1: Partial<Workspace> = {
  id: 'w1',
  workspaceName: 'workspace1',
  displayName: 'Workspace 1'
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
    mockAppStateService.currentWorkspace$.publish({ workspaceName: workspace1.workspaceName } as Workspace)
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
      component.logPrefix = 'get image url'
      component.workspaceName = workspace1.workspaceName

      component.onImageLoad()

      component.imageUrl$?.subscribe({
        next: (data) => {
          if (data) {
            expect(data).toBe('http://onecx-workspace-bff:8080/images/' + workspace1.workspaceName + '/logo')
          }
          done()
        },
        error: done.fail
      })
    })

    describe('provide logo - on error', () => {
      it('should load - failed - used: url', () => {
        const { component } = setUp()
        component.logEnabled = true // log without prefix !
        component.workspaceName = workspace1.workspaceName
        component.imageUrl = 'http://image/url'

        component.onImageLoadError(component.imageUrl)
      })

      it('should use image - failed - use default', () => {
        const { component } = setUp()
        component.logEnabled = true
        component.logPrefix = 'default'
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

        const url = component.getImageUrl(workspace1.workspaceName, 'url')

        expect(url).toBe(component.imageUrl)
      })

      it('should get url - use default image url', () => {
        const { component } = setUp()
        component.logEnabled = false
        component.logPrefix = 'default url'
        component.workspaceName = workspace1.workspaceName
        component.defaultImageUrl = '/default/url'
        component.useDefaultLogo = true // enable use of default image

        const url = component.getImageUrl(workspace1.workspaceName, 'default')

        expect(url).toBe(component.defaultImageUrl)
      })

      it('should get url - unknown prio type', () => {
        const { component } = setUp()
        component.logEnabled = false
        component.logPrefix = 'default url'
        component.workspaceName = workspace1.workspaceName
        component.defaultImageUrl = '/default/url'
        component.useDefaultLogo = false // enable use of default image

        const url = component.getImageUrl(workspace1.workspaceName, 'unknown')

        expect(url).toBeUndefined()
      })
    })
  })
})
