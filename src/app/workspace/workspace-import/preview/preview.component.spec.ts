import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'

import { PreviewComponent } from './preview.component'
import { Theme, ImportWorkspace } from '../workspace-import.component'

const formValue = {
  name: 'ADMIN',
  displayName: 'Admin',
  theme: 'default',
  baseUrl: '/admin',
  mandatory: false
}
const importWorkspace: ImportWorkspace = {
  ...formValue,
  themeObject: { name: 'default', displayName: 'default' } as Theme,
  homePage: '/welcome',
  menuItems: [{ name: 'name', children: [{ name: 'child1' }] }, { name: 'name2' }],
  products: [{ productName: 'productTestName' }],
  roles: [{ name: 'roleTestName' }]
}
const themesOrg: Theme[] = [
  { name: 'theme1', displayName: 'Theme 1', logoUrl: '/logo', faviconUrl: '/favicon' },
  { name: 'theme2', displayName: 'Theme 2' }
]

describe('PreviewComponent', () => {
  let component: PreviewComponent
  let fixture: ComponentFixture<PreviewComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreviewComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [provideHttpClientTesting(), provideHttpClient()],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(PreviewComponent)
    component = fixture.componentInstance
    component.importWorkspace = importWorkspace
    fixture.detectChanges()
  })

  describe('construction - success', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
      // complex data
      expect(component.menuItems.length).toBe(2)
      expect(component.workspaceRoles.length).toBe(1)
      expect(component.workspaceProducts.length).toBe(1)
      // init form
      expect(component.formGroup.value).toEqual(formValue)
      expect(component.formGroup.valid).toBeTrue()
    })
  })

  describe('model changes', () => {
    it('should change workspace name', () => {
      const newWorkspaceName = 'Test'
      component.formGroup.controls['displayName'].setValue(newWorkspaceName)

      component.onModelChange()

      expect(component.importWorkspace?.displayName).toEqual(newWorkspaceName)
    })
  })

  describe('themes', () => {
    it('should get themes form rc emitter', (done) => {
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
      component.importTheme = themesOrg[0]

      expect(themesOrg.length).toBe(2) // themesOrg

      component.checkAndExtendThemes(themesOrg)

      expect(themesOrg.length).toBe(2) // themesOrg
    })

    it('should extend themes if workspace is using an unknown theme name', () => {
      component.importTheme = importWorkspace.themeObject!

      expect(themesOrg.length).toBe(2) // themesOrg

      component.checkAndExtendThemes(themesOrg)

      expect(themesOrg.length).toBe(3) // themesOrg + workspace theme
    })

    it('should use a dummy theme (more a theroretical case)', () => {
      component.importWorkspace = { ...importWorkspace, themeObject: undefined }

      component.ngOnInit()

      expect(component.importTheme).toEqual({})
    })
  })

  describe('different import data', () => {
    it('should create - form invalid, no menu items', () => {
      const formValue_2 = {
        name: 'ADMIN2',
        displayName: 'Admin 2',
        theme: 'default',
        baseUrl: '/', // too short
        mandatory: false
      }
      const importWorkspace2: any = {
        ...formValue_2,
        themeObject: { name: 'default', displayName: 'default' } as Theme,
        homePage: '/welcome',
        menuItems: []
      }
      component.importWorkspace = importWorkspace2
      component.ngOnInit()

      expect(component).toBeTruthy()
      if (importWorkspace.themeObject) expect(component.importTheme).toEqual(importWorkspace.themeObject)
      // complex data
      expect(component.menuItems.length).toBe(0)
      expect(component.workspaceRoles.length).toBe(0)
      expect(component.workspaceProducts.length).toBe(0)
      // init form
      expect(component.formGroup.value).toEqual(formValue_2)
      expect(component.formGroup.valid).toBeFalse()
    })
  })
})
