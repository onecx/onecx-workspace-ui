import { TestBed, waitForAsync } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject, of } from 'rxjs'

import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { AppStateService } from '@onecx/angular-integration-interface'
import { provideAppStateServiceMock } from '@onecx/angular-integration-interface/mocks'

import { OneCXWorkspaceFooterComponent } from './workspace-footer.component'

describe('OneCXWorkspaceFooterComponent', () => {
  function setUp() {
    const fixture = TestBed.createComponent(OneCXWorkspaceFooterComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()
    return { fixture, component }
  }

  type MFE = { displayName?: string | undefined; version?: string | undefined }
  const mfe: MFE = { displayName: 'OneCX Help UI', version: '1.0.0' }

  let baseUrlSubject: ReplaySubject<any>
  class MockAppStateService {
    currentWorkspace$ = { asObservable: () => of({ workspaceName: 'ADMIN' }) }
    currentMfe$ = { asObservable: () => of(mfe) }
  }
  let mockAppStateService: MockAppStateService

  beforeEach(waitForAsync(() => {
    mockAppStateService = new MockAppStateService()
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
        { provide: AppStateService, useValue: mockAppStateService }
      ]
    })
      .overrideComponent(OneCXWorkspaceFooterComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule],
          providers: [{ provide: AppStateService, useValue: mockAppStateService }]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')
  }))

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

    it('should getting version info', (done) => {
      const { component } = setUp()

      component.versionInfo$.subscribe((version) => {
        expect(version).toEqual({
          workspaceName: 'ADMIN',
          hostVersion: '',
          separator: ' - ',
          mfeInfo: 'OneCX Help UI 1.0.0'
        })
        done()
      })
    })

    it('should getting version info - without mfe version info', (done) => {
      const mfe: MFE = { displayName: 'OneCX Help UI' }
      mockAppStateService.currentMfe$ = { asObservable: () => of(mfe) }
      const { component } = setUp()

      component.versionInfo$.subscribe((version) => {
        expect(version).toEqual({
          workspaceName: 'ADMIN',
          hostVersion: '',
          separator: ' - ',
          mfeInfo: 'OneCX Help UI'
        })
        done()
      })
    })

    it('should getting version info - without mfe display name', (done) => {
      const mfe: MFE = { version: '1.1.0' }
      mockAppStateService.currentMfe$ = { asObservable: () => of(mfe) }
      const { component } = setUp()

      component.versionInfo$.subscribe((version) => {
        expect(version).toEqual({
          workspaceName: 'ADMIN',
          hostVersion: '',
          separator: ' - ',
          mfeInfo: ''
        })
        done()
      })
    })

    it('should getting version info - without mfe info', (done) => {
      const mfe: MFE = {}
      mockAppStateService.currentMfe$ = { asObservable: () => of(mfe) }
      const { component } = setUp()

      component.versionInfo$.subscribe((version) => {
        expect(version).toEqual({
          workspaceName: 'ADMIN',
          hostVersion: '',
          separator: '',
          mfeInfo: ''
        })
        done()
      })
    })
  })
})
