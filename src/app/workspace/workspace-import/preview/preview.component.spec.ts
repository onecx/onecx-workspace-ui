import { NO_ERRORS_SCHEMA } from '@angular/core'
import { HttpClient, provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { of } from 'rxjs'

import { AppStateService, createTranslateLoader } from '@onecx/portal-integration-angular'
import { WorkspaceAPIService } from 'src/app/shared/generated'
import { PreviewComponent } from './preview.component'

const snapshot: any = {
  workspaces: {
    workspace: {
      name: 'name',
      menuItems: [{ name: 'name' }, { name: 'name2' }],
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
    component.importRequestDTO = snapshot
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should get themeNames from service', (done) => {
    component.themes$.subscribe((themes) => {
      expect(themes).toEqual([
        { label: undefined, value: 'theme1' },
        { label: undefined, value: 'theme2' }
      ])
      done()
    })
  })

  it('should fillForm, addValidators to formGroup and call onModelChange OnChanges: import theme checkbox disabled', () => {
    spyOn(component, 'fillForm')
    spyOn(component, 'onModelChange')

    component.ngOnChanges()

    expect(component.fillForm).toHaveBeenCalled()
    expect(component.onModelChange).toHaveBeenCalled()
  })

  it('should fillForm correctly', () => {
    component.hasPermission = true
    component.fillForm()

    expect(component.formGroup.controls['workspaceName'].value).toEqual(
      component.importRequestDTO?.workspaces?.['workspace'].name
    )
    expect(component.formGroup.controls['baseUrl'].value).toEqual(
      component.importRequestDTO?.workspaces?.['workspace'].baseUrl
    )
  })

  it('should set workspaceName correctly', () => {
    component.hasPermission = true
    component.formGroup.controls['workspaceName'].setValue('workspace')

    component.onModelChange()
    expect(component.workspaceName).toEqual('workspace')
  })

  it('should change values onModelChange', () => {
    component.hasPermission = true
    component.formGroup.controls['workspaceName'].setValue('newName')
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
})
