import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of } from 'rxjs'

import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { ConfirmComponent } from './confirm.component'
import { PortalInternalAPIService, ThemesAPIService } from '../../../generated'

const portal = {
  portalName: 'name',
  portalRoles: ['role'],
  themeName: 'theme',
  baseUrl: 'url',
  tenantId: 'id'
}

describe('ConfirmComponent', () => {
  let component: ConfirmComponent
  let fixture: ComponentFixture<ConfirmComponent>

  const apiServiceSpy = {
    getAllPortals: jasmine.createSpy('getAllPortals').and.returnValue(of({}))
  }
  const themeServiceSpy = jasmine.createSpyObj('ThemeService', ['getThemes'])
  themeServiceSpy.getThemes.and.returnValue(
    of([
      { label: undefined, value: 'theme1' },
      { label: undefined, value: 'theme2' }
    ])
  )

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ConfirmComponent],
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
      providers: [
        { provide: PortalInternalAPIService, useValue: apiServiceSpy },
        { provide: ThemesAPIService, useValue: themeServiceSpy }
      ]
    }).compileComponents()

    apiServiceSpy.getAllPortals.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should reflect missing baseUrl and fetch portals OnInit', () => {
    apiServiceSpy.getAllPortals.and.returnValue(of([]))
    component.baseUrl = ''
    spyOn(component, 'checkPortalUniqueness')

    component.ngOnInit()

    expect(component.checkPortalUniqueness).toHaveBeenCalled()
    expect(component.baseUrlIsMissing).toBeTrue()
  })

  it('should also fetch themes OnInit if themeName exists', () => {
    apiServiceSpy.getAllPortals.and.returnValue(of([]))
    themeServiceSpy.getThemes.and.returnValue(of([]))
    spyOn(component, 'checkThemeNames')
    component.themeName = 'name'

    component.ngOnInit()

    expect(component.checkThemeNames).toHaveBeenCalled()
  })

  it('should set portalTenantExists to true in checkPortalUniqueness onInit if permission', () => {
    apiServiceSpy.getAllPortals.and.returnValue(of([portal]))
    component.hasPermission = true
    component.portalName = 'name'
    component.tenantId = 'id'

    component.ngOnInit()

    expect(component.portalTenantExists).toBeTrue()
  })

  it('should set portalNameExists to true in checkPortalUniqueness onInit if no permission', () => {
    apiServiceSpy.getAllPortals.and.returnValue(of([portal]))
    component.hasPermission = false
    component.portalName = 'name'

    component.ngOnInit()

    expect(component.portalNameExists).toBeTrue()
  })

  it('should set baseUrlExists to true in checkPortalUniqueness onInit', () => {
    apiServiceSpy.getAllPortals.and.returnValue(of([portal]))
    component.baseUrl = 'url'
    component.baseUrlIsMissing = false

    component.ngOnInit()

    expect(component.baseUrlExists).toBeTrue()
  })

  it('should set themeNameExists to true in checkPortalUniqueness onInit', () => {
    apiServiceSpy.getAllPortals.and.returnValue(of([portal]))
    themeServiceSpy.getThemes.and.returnValue(of([{ name: 'theme' }]))
    component.hasPermission = false
    component.themeName = 'theme'

    component.ngOnInit()

    expect(component.themeNameExists).toBeTrue()
  })
})
