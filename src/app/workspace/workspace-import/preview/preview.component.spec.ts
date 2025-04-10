import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'

import { PreviewComponent, Theme } from './preview.component'

const formValue = {
  name: 'ADMIN',
  displayName: 'Admin',
  theme: 'default',
  baseUrl: '/admin'
}
const importDTO: any = {
  id: 'uuid',
  created: '2025-01-07T06:20:55.581276Z',
  workspaces: {
    ADMIN: {
      ...formValue,
      homePage: '/welcome',
      menuItems: [{ name: 'name', children: [{ name: 'child1' }] }, { name: 'name2' }],
      products: [{ productName: 'productTestName' }],
      roles: [{ name: 'roleTestName' }]
    }
  }
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
    component.importRequestDTO = importDTO
    fixture.detectChanges()
  })

  describe('construction - success', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
      // init component values
      expect(component.workspaceName).toEqual(importDTO.workspaces.ADMIN.name)
      expect(component.displayName).toEqual(importDTO.workspaces.ADMIN.displayName)
      expect(component.theme.name).toEqual(importDTO.workspaces.ADMIN.theme)
      expect(component.baseUrl).toEqual(importDTO.workspaces.ADMIN.baseUrl)
      // complex data
      expect(component.menuItems.length).toBe(2)
      expect(component.workspaceRoles.length).toBe(1)
      expect(component.workspaceProducts.length).toBe(1)
      // init form
      expect(component.formGroup.value).toEqual(formValue)
      expect(component.formGroup.valid).toBeTrue()
    })

    describe('model changes', () => {
      it('should change workspace name', () => {
        const newWorkspaceName = 'test'
        component.formGroup.controls['name'].setValue(newWorkspaceName)

        component.onModelChange()

        expect(component.workspaceName).toEqual(newWorkspaceName)
      })
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
      component.theme.name = 'theme1'

      component.checkAndExtendThemes(themesOrg)

      expect(themesOrg.length).toBe(2)
    })

    it('should extend themes if workspace is using an unknown theme name', () => {
      component.theme.name = 'unknown'

      component.checkAndExtendThemes(themesOrg)

      expect(themesOrg.length).toBe(3)
    })
  })

  describe('different import data', () => {
    it('should create - form invalid, no menu items', () => {
      const formValue_2 = {
        name: 'ADMIN2',
        displayName: 'Admin 2',
        theme: 'default',
        baseUrl: '/' // too short
      }
      const importDTO_2: any = {
        id: 'uuid',
        created: '2025-01-07T06:20:55.581276Z',
        workspaces: {
          ADMIN2: {
            ...formValue_2,
            homePage: '/welcome',
            menuItems: []
          }
        }
      }
      component.importRequestDTO = importDTO_2
      component.ngOnInit()

      expect(component).toBeTruthy()
      // init component values
      expect(component.workspaceName).toEqual(importDTO_2.workspaces.ADMIN2.name)
      expect(component.displayName).toEqual(importDTO_2.workspaces.ADMIN2.displayName)
      expect(component.theme.name).toEqual(importDTO_2.workspaces.ADMIN2.theme)
      expect(component.baseUrl).toEqual(importDTO_2.workspaces.ADMIN2.baseUrl)
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
