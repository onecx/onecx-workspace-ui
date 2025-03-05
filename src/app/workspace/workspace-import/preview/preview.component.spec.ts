import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { of } from 'rxjs'

import { WorkspaceAPIService } from 'src/app/shared/generated'
import { PreviewComponent } from './preview.component'

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

describe('PreviewComponent', () => {
  let component: PreviewComponent
  let fixture: ComponentFixture<PreviewComponent>

  const wsServiceSpy = jasmine.createSpyObj('WorkspaceAPIService', ['getAllThemes'])
  wsServiceSpy.getAllThemes.and.returnValue(
    of([
      { label: undefined, value: 'theme1' },
      { label: undefined, value: 'theme2' }
    ])
  )

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreviewComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClientTesting(),
        provideHttpClient(),
        { provide: WorkspaceAPIService, useValue: wsServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents()
    wsServiceSpy.getAllThemes.calls.reset()
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
      expect(component.themeName).toEqual(importDTO.workspaces.ADMIN.theme)
      expect(component.baseUrl).toEqual(importDTO.workspaces.ADMIN.baseUrl)
      // complex data
      expect(component.menuItems.length).toBe(2)
      expect(component.workspaceRoles.length).toBe(1)
      expect(component.workspaceProducts.length).toBe(1)
      // init form
      expect(component.formGroup.value).toEqual(formValue)
      expect(component.formGroup.valid).toBeTrue()
    })

    it('should get themes from service', (done) => {
      component.themes$.subscribe((themes) => {
        expect(themes).toEqual([
          { label: undefined, value: 'theme1' },
          { label: undefined, value: 'theme2' }
        ])
        done()
      })
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
      expect(component.themeName).toEqual(importDTO_2.workspaces.ADMIN2.theme)
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
