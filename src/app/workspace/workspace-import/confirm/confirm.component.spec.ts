import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
// import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
// import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of } from 'rxjs'

// import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { ConfirmComponent } from 'src/app/workspace/workspace-import/confirm/confirm.component'
import { WorkspaceAPIService } from 'src/app/shared/generated'

const workspace = {
  workspaceName: 'name',
  workspaceRoles: ['role'],
  themeName: 'theme',
  baseUrl: 'url',
  tenantId: 'id'
}

describe('ConfirmComponent', () => {
  let component: ConfirmComponent
  let fixture: ComponentFixture<ConfirmComponent>

  const apiServiceSpy = {
    searchWorkspaces: jasmine.createSpy('searchWorkspaces').and.returnValue(of({}))
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
        HttpClientTestingModule
        // TranslateModule.forRoot({
        //   loader: {
        //     provide: TranslateLoader,
        //     useFactory: HttpLoaderFactory,
        //     deps: [HttpClient]
        //   }
        // })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: WorkspaceAPIService, useValue: apiServiceSpy }
        // { provide: ThemesAPIService, useValue: themeServiceSpy }
      ]
    }).compileComponents()

    apiServiceSpy.searchWorkspaces.calls.reset()
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
    apiServiceSpy.searchWorkspaces.and.returnValue(of([]))
    component.baseUrl = ''
    spyOn(component, 'checkWorkspaceUniqueness')

    component.ngOnInit()

    expect(component.checkWorkspaceUniqueness).toHaveBeenCalled()
    expect(component.baseUrlIsMissing).toBeTrue()
  })

  it('should also fetch themes OnInit if themeName exists', () => {
    apiServiceSpy.searchWorkspaces.and.returnValue(of([]))
    themeServiceSpy.getThemes.and.returnValue(of([]))
    spyOn(component, 'checkThemeNames')
    component.themeName = 'name'

    component.ngOnInit()

    expect(component.checkThemeNames).toHaveBeenCalled()
  })

  it('should set workspaceTenantExists to true in checkWorkspaceUniqueness onInit if permission', () => {
    apiServiceSpy.searchWorkspaces.and.returnValue(of([workspace]))
    component.hasPermission = true
    component.workspaceName = 'name'
    component.tenantId = 'id'

    component.ngOnInit()

    expect(component.workspaceTenantExists).toBeTrue()
  })

  it('should set workspaceNameExists to true in checkWorkspaceUniqueness onInit if no permission', () => {
    apiServiceSpy.searchWorkspaces.and.returnValue(of([workspace]))
    component.hasPermission = false
    component.workspaceName = 'name'

    component.ngOnInit()

    expect(component.workspaceNameExists).toBeTrue()
  })

  it('should set baseUrlExists to true in checkWorkspaceUniqueness onInit', () => {
    apiServiceSpy.searchWorkspaces.and.returnValue(of([workspace]))
    component.baseUrl = 'url'
    component.baseUrlIsMissing = false

    component.ngOnInit()

    expect(component.baseUrlExists).toBeTrue()
  })

  it('should set themeNameExists to true in checkWorkspaceUniqueness onInit', () => {
    apiServiceSpy.searchWorkspaces.and.returnValue(of([workspace]))
    themeServiceSpy.getThemes.and.returnValue(of([{ name: 'theme' }]))
    component.hasPermission = false
    component.themeName = 'theme'

    component.ngOnInit()

    expect(component.themeNameExists).toBeTrue()
  })
})
