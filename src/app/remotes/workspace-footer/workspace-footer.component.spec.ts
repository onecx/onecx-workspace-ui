import { TestBed } from '@angular/core/testing'
import { CommonModule } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject } from 'rxjs'

import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'

//import { Workspace } from 'src/app/shared/generated'
import { OneCXWorkspaceFooterComponent } from './workspace-footer.component'

describe('OneCXWorkspaceFooterComponent', () => {
  function setUp() {
    const fixture = TestBed.createComponent(OneCXWorkspaceFooterComponent)
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
        {
          provide: BASE_URL,
          useValue: baseUrlSubject
        }
      ]
    })
      .overrideComponent(OneCXWorkspaceFooterComponent, {
        set: {
          imports: [TranslateTestingModule, CommonModule]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')
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

    xit('should init remote component', (done: DoneFn) => {
      const { component } = setUp()

      component.ocxInitRemoteComponent({ baseUrl: 'base_url' } as RemoteComponentConfig)

      baseUrlSubject.asObservable().subscribe((item) => {
        expect(item).toEqual('base_url')
        done()
      })
    })
  })

  /*
  describe('themes', () => {
    it('should get themes from rc emitter', (done) => {
      component.ngOnInit()

      component.themesEmitter.emit(themesOrg)

      component.themes$?.subscribe({
        next: (data) => {
          expect(data).toEqual(themesOrg)
          done()
        },
        error: done.fail
      })
    })

    it('should NOT extend themes if workspace is using a known theme', () => {
      if (component.workspace) {
        component.workspace.theme = 'theme1'

        component.checkAndExtendThemes(themesOrg)

        expect(themesOrg.length).toBe(2)
      }
    })

    it('should extend themes if workspace is using an unknown theme name', () => {
      if (component.workspace) {
        component.workspace.theme = 'unknown'

        component.checkAndExtendThemes(themesOrg)

        expect(themesOrg.length).toBe(3)
      }
    })

    it('should get url if defined - logo', () => {
      if (component.workspace) {
        component.workspace.theme = 'theme1'

        const url = component.getThemeImageUrl(themesOrg, 'theme1', RefType.Logo)

        expect(url).toBe(themesOrg[0].logoUrl)
      }
    })

    it('should get url if defined - favicon', () => {
      if (component.workspace) {
        component.workspace.theme = 'theme1'

        const url = component.getThemeImageUrl(themesOrg, 'theme1', RefType.Favicon)

        expect(url).toBe(themesOrg[0].faviconUrl)
      }
    })
  })
  */
})
