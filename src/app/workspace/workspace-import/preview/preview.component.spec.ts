import { NO_ERRORS_SCHEMA } from '@angular/core'
import { HttpClient, provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { of } from 'rxjs'

import { AppStateService, createTranslateLoader } from '@onecx/portal-integration-angular'

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

fdescribe('PreviewComponent', () => {
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
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        })
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

  describe('construction - nok', () => {
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

  /*
  it('should set workspaceName correctly', () => {
    component.formGroup.controls['name'].setValue('workspace')

    component.onModelChange()
    expect(component.workspaceName).toEqual('workspace')
  })

  it('should change values onModelChange', () => {
    component.formGroup.controls['name'].setValue('newName')
    component.formGroup.controls['theme'].setValue('new theme')

    component.onModelChange()
    expect(component.themeName).toEqual('new theme')
    if (component.importRequestDTO.workspaces?.['newName'].name) {
      expect(component.workspaceName).toEqual(component.importRequestDTO.workspaces?.['newName'].name)
    }
    if (component.importRequestDTO.workspaces?.['newName'].theme) {
      expect(component.themeName).toEqual(component.importRequestDTO.workspaces?.['newName'].theme)
    }
  })

  it('should map menuItems to tree nodes: standard case', () => {
    component.ngOnInit()

    if (component.importRequestDTO?.workspaces?.['newName'].menu?.menu?.menuItems) {
      expect(component.menuItems).toContain({
        label: 'name',
        expanded: false,
        key: undefined,
        leaf: true,
        children: []
      })
    }
  })

  it('should map menuItems to tree nodes: empty case', () => {
    if (!component.importRequestDTO) {
      component.importRequestDTO = {}
    }
    if (!component.importRequestDTO.workspaces) {
      component.importRequestDTO.workspaces = {}
    }
    if (!component.importRequestDTO.workspaces['newName']) {
      component.importRequestDTO.workspaces['newName'] = {}
    }
    component.importRequestDTO.workspaces['newName'].menuItems = undefined

    component.ngOnInit()

    expect(component.menuItems).toEqual([])
  })

  it('should map menuItems to tree nodes: recursion case', () => {
    if (!component.importRequestDTO) {
      component.importRequestDTO = {}
    }
    if (!component.importRequestDTO.workspaces) {
      component.importRequestDTO.workspaces = {}
    }
    if (!component.importRequestDTO.workspaces['newName']) {
      component.importRequestDTO.workspaces['newName'] = {}
    }
    component.importRequestDTO.workspaces['newName'].menuItems = [
      {
        name: 'menu',
        key: 'key',
        position: 1,
        disabled: true,
        external: true,
        children: [{ name: 'menu', key: 'key', position: 2, disabled: true, external: true }]
      }
    ]

    component.ngOnInit()

    if (component.importRequestDTO?.workspaces?.['newName'].menuItems) {
      expect(component.menuItems).toContain({
        label: 'menu',
        expanded: false,
        key: 'key',
        leaf: false,
        children: [
          jasmine.objectContaining({
            label: 'menu',
            key: 'key',
            leaf: true
          })
        ]
      })
    }
  })
*/
})
