import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of } from 'rxjs'

import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { PreviewComponent } from './preview.component'
import { ThemesAPIService } from '../../../shared/generated'

describe('PreviewComponent', () => {
  let component: PreviewComponent
  let fixture: ComponentFixture<PreviewComponent>

  const themeServiceSpy = jasmine.createSpyObj('ThemeService', ['getThemes'])
  themeServiceSpy.getThemes.and.returnValue(
    of([
      { label: undefined, value: 'theme1' },
      { label: undefined, value: 'theme2' }
    ])
  )

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreviewComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: HttpLoaderFactory,
            deps: [HttpClient]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: ThemesAPIService, useValue: themeServiceSpy }]
    }).compileComponents()
    themeServiceSpy.getThemes.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(PreviewComponent)
    component = fixture.componentInstance
    const portal = {
      portal: {
        portalName: 'name',
        portalRoles: ['role'],
        themeName: 'theme',
        baseUrl: 'url',
        tenantId: 'id',
        microfrontendRegistrations: new Set([{ version: 1 }])
      },
      menuItems: [{ name: 'menu', key: 'key', position: 1, disabled: true, portalExit: true }]
    }
    component.importRequestDTO = portal
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should get themeNames from service', (done) => {
    themeServiceSpy.getThemes

    component.themes$.subscribe((themes) => {
      expect(themes).toEqual([
        { label: undefined, value: '' },
        { label: undefined, value: '' }
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

  it('should fillForm, addValidators to formGroup and call onModelChange OnChanges: import theme checkbox enabled', () => {
    spyOn(component, 'fillForm')
    spyOn(component, 'onModelChange')
    component.importThemeCheckbox = true

    component.ngOnChanges()

    expect(component.formGroup.controls['themeName'].validator).toBeDefined()
    expect(component.fillForm).toHaveBeenCalled()
    expect(component.onModelChange).toHaveBeenCalled()
  })

  it('should fillForm correctly', () => {
    component.hasPermission = true
    component.fillForm()

    expect(component.formGroup.controls['portalName'].value).toEqual(component.importRequestDTO?.portal?.portalName)
    expect(component.formGroup.controls['themeName'].value).toEqual(component.importRequestDTO?.portal?.themeName)
    expect(component.formGroup.controls['baseUrl'].value).toEqual(component.importRequestDTO?.portal?.baseUrl)
    expect(component.formGroup.controls['tenantId'].value).toEqual(component.importRequestDTO?.portal?.tenantId)
  })

  it('should change values onModelChange', () => {
    component.hasPermission = true
    component.formGroup.controls['tenantId'].setValue('new id')

    component.onModelChange()

    expect(component.tenantId).toEqual(component.importRequestDTO?.portal?.tenantId)
    expect(component.formGroup.controls['tenantId'].value).toEqual(component.importRequestDTO?.portal?.tenantId)
  })

  it('should behave correctly onThemeChange', () => {
    spyOn(component, 'onModelChange')
    const event = { value: 'theme' }

    component.onThemeChange(event)

    expect(component.onModelChange).toHaveBeenCalled()
    expect(component.themeName).toEqual('theme')
  })

  it('should map menuItems to tree nodes: standard case', () => {
    component.ngOnInit()

    if (component.importRequestDTO?.menuItems) {
      expect(component.menuItems).toContain({ label: 'menu', expanded: false, key: 'key', leaf: true, children: [] })
    }
  })

  it('should map menuItems to tree nodes: empty case', () => {
    component.importRequestDTO.menuItems = undefined

    component.ngOnInit()

    expect(component.menuItems).toEqual([])
  })

  it('should map menuItems to tree nodes: recursion case', () => {
    component.importRequestDTO.menuItems = [
      {
        name: 'menu',
        key: 'key',
        position: 1,
        disabled: true,
        portalExit: true,
        children: [{ name: 'menu', key: 'key', position: 2, disabled: true, portalExit: true }]
      }
    ]

    component.ngOnInit()

    if (component.importRequestDTO?.menuItems) {
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
