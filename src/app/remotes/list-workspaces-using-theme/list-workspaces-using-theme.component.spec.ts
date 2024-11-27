import { TestBed } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { provideRouter, RouterModule } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, ReplaySubject, throwError } from 'rxjs'
import { PanelMenuModule } from 'primeng/panelmenu'

import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'

import { SearchWorkspacesResponse, WorkspaceAPIService } from 'src/app/shared/generated'
import { OneCXListWorkspacesUsingThemeComponent } from './list-workspaces-using-theme.component'

describe('OneCXListWorkspacesUsingThemeComponent', () => {
  const wsApiSpy = {
    searchWorkspaces: jasmine.createSpy('searchWorkspaces').and.returnValue(of({}))
  }

  function setUp() {
    const fixture = TestBed.createComponent(OneCXListWorkspacesUsingThemeComponent)
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
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BASE_URL,
          useValue: baseUrlSubject
        },
        provideRouter([{ path: 'admin/theme', component: OneCXListWorkspacesUsingThemeComponent }])
      ]
    })
      .overrideComponent(OneCXListWorkspacesUsingThemeComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule, RouterModule, PanelMenuModule],
          providers: [{ provide: WorkspaceAPIService, useValue: wsApiSpy }]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')

    wsApiSpy.searchWorkspaces.calls.reset()
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

    baseUrlSubject.asObservable().subscribe((item) => {
      expect(item).toEqual('base_url')
      done()
    })
  })

  it('should call findWorkspacesUsingTheme with the current themeName', () => {
    const { component } = setUp()
    spyOn(component as any, 'findWorkspacesUsingTheme')
    component.themeName = 'testTheme'

    component.ngOnChanges()

    expect(component['findWorkspacesUsingTheme']).toHaveBeenCalled()
  })

  describe('findWorkspacesUsingTheme', () => {
    it('should filter workspaces by theme and return display names', (done) => {
      const { component } = setUp()
      const mockResponse: SearchWorkspacesResponse = {
        stream: [
          { name: 'ws1', theme: 'theme1', displayName: 'Workspace 1' },
          { name: 'ws2', theme: 'theme2', displayName: 'Workspace 2' },
          { name: 'ws3', theme: 'theme1', displayName: 'Workspace 3' }
        ]
      }
      wsApiSpy.searchWorkspaces.and.returnValue(of(mockResponse))

      component['findWorkspacesUsingTheme']()

      component.workspacesUsingTheme?.subscribe((result) => {
        expect(result).toEqual(['Workspace 1', 'Workspace 2', 'Workspace 3'])
        done()
      })
    })

    it('should handle empty response', (done) => {
      const { component } = setUp()
      const mockResponse: SearchWorkspacesResponse = { stream: [] }
      wsApiSpy.searchWorkspaces.and.returnValue(of(mockResponse))

      component['findWorkspacesUsingTheme']()

      component.workspacesUsingTheme?.subscribe((result) => {
        expect(result).toEqual([])
        done()
      })
    })

    it('should handle error and return empty array', (done) => {
      const errorResponse = { status: 400, statusText: 'Error on searching workspaces' }
      const { component } = setUp()
      wsApiSpy.searchWorkspaces.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.findWorkspacesUsingTheme()

      component.workspacesUsingTheme?.subscribe((result) => {
        expect(result).toEqual([])
        done()
      })
      expect(console.error).toHaveBeenCalledWith('searchWorkspaces', errorResponse)
    })
  })
})
