import { TestBed } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { firstValueFrom, of, ReplaySubject, throwError } from 'rxjs'

import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { provideAppConfigServiceMock } from '@onecx/angular-integration-interface/mocks'

import { SearchWorkspacesResponse, Workspace, WorkspaceAPIService } from 'src/app/shared/generated'
import { OneCXWorkspaceDataComponent } from './workspace-data.component'

const workspace1: Workspace = {
  id: 'w1',
  name: 'workspace1',
  displayName: 'Workspace 1'
}
const workspace2: Workspace = {
  id: 'w2',
  name: 'workspace2',
  displayName: 'Workspace 2'
}
const workspaces: Workspace[] = [workspace1, workspace2]

describe('OneCXWorkspaceDataComponent', () => {
  // the component injects this token - it must be provided (a ReplaySubject, like the real host)
  const rcConfig = new ReplaySubject<RemoteComponentConfig>(1)
  const defaultRCConfig: RemoteComponentConfig = {
    appId: 'appId',
    productName: 'prodName',
    baseUrl: 'base',
    permissions: ['permission']
  }
  rcConfig.next(defaultRCConfig)

  const workspaceApiSpy = {
    searchWorkspaces: jasmine.createSpy('searchWorkspaces').and.returnValue(of({})),
    getWorkspaceByName: jasmine.createSpy('getWorkspaceByName').and.returnValue(of({}))
  }

  function setUp() {
    const fixture = TestBed.createComponent(OneCXWorkspaceDataComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()
    return { fixture, component }
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        OneCXWorkspaceDataComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideAppConfigServiceMock(),
        { provide: REMOTE_COMPONENT_CONFIG, useValue: rcConfig }
      ]
    })
      .overrideComponent(OneCXWorkspaceDataComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule],
          providers: [{ provide: WorkspaceAPIService, useValue: workspaceApiSpy }]
        }
      })
      .compileComponents()

    workspaceApiSpy.searchWorkspaces.calls.reset()
    workspaceApiSpy.getWorkspaceByName.calls.reset()
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

    it('should init remote component', async () => {
      const { component } = setUp()

      component.ocxInitRemoteComponent({ baseUrl: 'base_url' } as RemoteComponentConfig)

      // ocxInitRemoteComponent() pushes the config to the token and re-bases the API service.
      expect((await firstValueFrom(rcConfig))?.baseUrl).toEqual('base_url')
      const workspaceApi = (component as unknown as { workspaceApi: WorkspaceAPIService }).workspaceApi
      expect(workspaceApi.configuration.basePath).toEqual('base_url/bff')
    })
  })

  describe('getting workspaces', () => {
    it('should get workspaces - successful with data', (done) => {
      const { component } = setUp()
      const mockResponse: SearchWorkspacesResponse = { stream: workspaces }
      workspaceApiSpy.searchWorkspaces.and.returnValue(of(mockResponse))
      component.dataType = 'workspaces'

      component.ngOnChanges()

      component.workspaces$?.subscribe({
        next: (data) => {
          if (data) {
            expect(data).toEqual(workspaces)
          }
          done()
        },
        error: done.fail
      })
    })

    it('should get workspaces - successful without data', (done) => {
      const { component } = setUp()
      const mockResponse: SearchWorkspacesResponse = { stream: [] }
      workspaceApiSpy.searchWorkspaces.and.returnValue(of(mockResponse))
      component.dataType = 'workspaces'

      component.ngOnChanges()

      component.workspaces$?.subscribe({
        next: (data) => {
          if (data) {
            expect(data).toEqual([])
          }
          done()
        },
        error: done.fail
      })
    })

    it('should get workspaces - successful without stream', (done) => {
      const { component } = setUp()
      const mockResponse: SearchWorkspacesResponse = { stream: undefined }
      workspaceApiSpy.searchWorkspaces.and.returnValue(of(mockResponse))
      component.dataType = 'workspaces'

      component.ngOnChanges()

      component.workspaces$?.subscribe({
        next: (data) => {
          if (data) {
            expect(data).toEqual([])
          }
          done()
        },
        error: done.fail
      })
    })

    it('should get workspaces - failed', (done) => {
      const { component } = setUp()
      const errorResponse = { status: 400, statusText: 'Error on getting workspaces' }
      workspaceApiSpy.searchWorkspaces.and.returnValue(throwError(() => errorResponse))
      component.dataType = 'workspaces'
      spyOn(console, 'error')

      component.ngOnChanges()
      component.workspaces$?.subscribe({
        next: (data) => {
          if (data) {
            expect(console.error).toHaveBeenCalledWith('onecx-workspace-data.searchWorkspaces', errorResponse)
          }
          done()
        },
        error: done.fail
      })
    })
  })

  describe('getting workspace', () => {
    it('should get workspace - rejected, missing name', () => {
      const { component } = setUp()
      component.dataType = 'workspace'
      workspaceApiSpy.getWorkspaceByName.and.returnValue(of())

      component.ngOnChanges()

      expect(workspaceApiSpy.getWorkspaceByName).not.toHaveBeenCalled()
    })

    it('should get workspace - successful with data', (done) => {
      const { component } = setUp()
      workspaceApiSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace1 }))
      component.dataType = 'workspace'
      component.workspaceName = workspace1.name

      component.ngOnChanges()

      component.workspace$?.subscribe({
        next: (data) => {
          expect(data).toEqual(workspace1)
          done()
        },
        error: done.fail
      })
    })

    it('should get workspace - failed', (done) => {
      const { component } = setUp()
      const errorResponse = { status: 400, statusText: 'Error on getting workspaces' }
      workspaceApiSpy.getWorkspaceByName.and.returnValue(throwError(() => errorResponse))
      component.dataType = 'workspace'
      component.workspaceName = workspace1.name
      spyOn(console, 'error')

      component.ngOnChanges()

      component.workspace$?.subscribe({
        next: (data) => {
          expect(console.error).toHaveBeenCalledWith('onecx-workspace-data.getWorkspaceByName', errorResponse)
          done()
        },
        error: done.fail
      })
    })
  })

  describe('provide logo', () => {
    it('should load - initially', (done) => {
      const { component } = setUp()
      component.logEnabled = true // log with prefix
      component.logPrefix = 'get image url'
      component.workspaceName = workspace1.name
      component.dataType = 'logo'

      component.ngOnChanges()
      component.onImageLoad()

      component.imageUrl$?.subscribe({
        next: (data) => {
          if (data) {
            expect(data).toBe('base_url/bff/images/workspace1/logo')
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
        component.workspaceName = workspace1.name
        component.imageUrl = 'http://image/url'
        component.dataType = 'logo'

        component.onImageLoadError(component.imageUrl)

        expect().nothing()
      })

      it('should use image - failed - use default', () => {
        const { component } = setUp()
        component.logEnabled = false
        component.logPrefix = 'default logo'
        component.workspaceName = workspace1.name
        component.dataType = 'logo'

        component.onImageLoadError('base_url/bff/images/workspace1/logo')

        expect().nothing()
      })
    })

    describe('provide logo - get url', () => {
      it('should get image url - data type undefined', () => {
        const { component } = setUp()
        component.dataType = undefined
        component.workspaceName = workspace1.name

        const url = component.getImageUrl(workspace1.name, 'other')

        expect(url).toBeUndefined()
      })

      it('should get image url - use input image url', () => {
        const { component } = setUp()
        component.dataType = 'logo'
        component.logEnabled = false
        component.logPrefix = 'url'
        component.workspaceName = workspace1.name
        component.imageUrl = '/url'

        const url = component.getImageUrl(workspace1.name, 'url')

        expect(url).toBe(component.imageUrl)
      })

      it('should get url - use default image url', () => {
        const { component } = setUp()
        component.dataType = 'logo'
        component.logEnabled = false
        component.logPrefix = 'default url'
        component.workspaceName = workspace1.name
        component.defaultImageUrl = '/default/url'
        component.useDefaultLogo = true // enable use of default image

        const url = component.getImageUrl(workspace1.name, 'default')

        expect(url).toBe(component.defaultImageUrl)
      })
    })
  })
})
