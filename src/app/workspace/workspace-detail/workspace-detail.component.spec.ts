import { NO_ERRORS_SCHEMA, Component } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { Location } from '@angular/common'
import { HttpClient, HttpEventType, HttpHeaders, HttpResponse } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { Router } from '@angular/router'
import { RouterTestingModule } from '@angular/router/testing'
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import { PortalMessageService, ConfigurationService, AUTH_SERVICE } from '@onecx/portal-integration-angular'
import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { WorkspaceDetailComponent } from './workspace-detail.component'
import { WorkspacePropsComponent } from './workspace-props/workspace-props.component'
import { WorkspaceContactComponent } from './workspace-contact/workspace-contact.component'
import { WorkspaceRolesComponent } from './workspace-roles/workspace-roles.component'
import { WorkspaceImagesComponent } from './workspace-images/workspace-images.component'
import {
  PortalDTO,
  PortalMenuItemDTO,
  PortalInternalAPIService,
  MenuItemsInternalAPIService,
  ThemesAPIService,
  ThemeDTO
} from '../../shared/generated'

class MockRouter {
  navigate = jasmine.createSpy('navigate')
}

const portal: PortalDTO = {
  portalName: 'name',
  themeName: 'theme',
  themeId: 'id',
  baseUrl: '/some/base/url',
  id: 'id'
}

const mockMenuItems: PortalMenuItemDTO[] = [
  {
    name: 'menu name'
  },
  {
    name: 'menu2 name'
  }
]

const menuHttpResponse: HttpResponse<PortalMenuItemDTO[]> = {
  body: mockMenuItems,
  status: 200,
  statusText: 'OK',
  headers: new HttpHeaders(),
  url: 'mock-url',
  ok: true,
  type: HttpEventType.Response,
  clone: () => menuHttpResponse
}

const themeHttpResponse: HttpResponse<ThemeDTO> = {
  body: { name: 'theme' },
  status: 200,
  statusText: 'OK',
  headers: new HttpHeaders(),
  url: 'mock-url',
  ok: true,
  type: HttpEventType.Response,
  clone: () => themeHttpResponse
}

@Component({ template: '' })
class MockMenuComponent {}

class MockWorkspacePropsComponent {
  public onSubmit(): void {}
}

class MockWorkspaceContactComponent {
  public onSubmit(): void {}
}

class MockWorkspaceRolesComponent {
  public onSubmit(): void {}
}

class MockWorkspaceImagesComponent {
  public onSubmit(): void {}
}

describe('WorkspaceDetailComponent', () => {
  let component: WorkspaceDetailComponent
  let fixture: ComponentFixture<WorkspaceDetailComponent>
  let mockActivatedRoute: Partial<ActivatedRoute>
  let mockRouter = new MockRouter()
  const mockAuthService = jasmine.createSpyObj('IAuthService', ['hasPermission'])

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    getPortalByPortalId: jasmine.createSpy('getPortalByPortalId').and.returnValue(of({})),
    deletePortal: jasmine.createSpy('deletePortal').and.returnValue(of({}))
  }
  const menuApiServiceSpy = {
    getMenuStructureForPortalId: jasmine.createSpy('getMenuStructureForPortalId').and.returnValue(of(mockMenuItems))
  }
  const themeApiServiceSpy = jasmine.createSpyObj<ThemesAPIService>('ThemesAPIService', ['getThemeById'])
  const configServiceSpy = {
    getProperty: jasmine.createSpy('getProperty').and.returnValue('123'),
    getPortal: jasmine.createSpy('getPortal').and.returnValue({
      themeId: '1234',
      portalName: 'test',
      baseUrl: '/',
      microfrontendRegistrations: []
    }),
    lang: 'en'
  }
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['get'])
  const locationSpy = jasmine.createSpyObj<Location>('Location', ['back'])

  const mockActivatedRouteSnapshot: Partial<ActivatedRouteSnapshot> = {
    params: {
      id: 'mockId'
    }
  }
  mockActivatedRoute = {
    snapshot: mockActivatedRouteSnapshot as ActivatedRouteSnapshot
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceDetailComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: HttpLoaderFactory,
            deps: [HttpClient]
          }
        }),
        RouterTestingModule.withRoutes([{ path: 'menu', component: MockMenuComponent }])
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: PortalInternalAPIService, useValue: apiServiceSpy },
        { provide: ConfigurationService, useValue: configServiceSpy },
        { provide: MenuItemsInternalAPIService, useValue: menuApiServiceSpy },
        { provide: ThemesAPIService, useValue: themeApiServiceSpy },
        { provide: AUTH_SERVICE, useValue: mockAuthService },
        { provide: Location, useValue: locationSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.getPortalByPortalId.calls.reset()
    apiServiceSpy.deletePortal.calls.reset()
    menuApiServiceSpy.getMenuStructureForPortalId.calls.reset()
    themeApiServiceSpy.getThemeById.calls.reset()
    translateServiceSpy.get.calls.reset()
    locationSpy.back.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  function initializeComponent(): void {
    fixture = TestBed.createComponent(WorkspaceDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should set German date format', () => {
    configServiceSpy.lang = 'de'

    initializeComponent()

    expect(component.dateFormat).toEqual('dd.MM.yyyy HH:mm:ss')
  })

  it('should set selectedIndex onChange', () => {
    const event = {
      index: 1
    }

    component.onChange(event)

    expect(component.selectedIndex).toEqual(1)
  })

  it('should getPortalData onInit', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of([portal]))
    spyOn(component, 'onPortalData')

    component.ngOnInit()

    expect(component.onPortalData).toHaveBeenCalled()
  })

  it('should display error msg if get api call fails', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(throwError(() => new Error()))

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'SEARCH.ERROR',
      detailKey: 'PORTAL.NOT_EXIST_MESSAGE'
    })
  })

  it('should delete portal on confirmDeletePortal', () => {
    apiServiceSpy.deletePortal.and.returnValue(of({}))
    component.portalDownloadVisible = true

    component.confirmDeletePortal()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE_OK' })
    expect(component.portalDownloadVisible).toBeFalse()
  })

  it('should display error msg if delete api call fails', () => {
    apiServiceSpy.deletePortal.and.returnValue(throwError(() => new Error()))

    component.confirmDeletePortal()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'ACTIONS.DELETE.MESSAGE_NOK'
    })
  })

  it('should export a portal', () => {
    component.portalDetail = portal
    component.importThemeCheckbox = true
    menuApiServiceSpy.getMenuStructureForPortalId.and.returnValue(of(mockMenuItems))
    themeApiServiceSpy.getThemeById.and.returnValue(of(themeHttpResponse))

    component.onExportWorkspace()

    expect(component.portalDownloadVisible).toBeFalse()
  })

  it('should display error if themeNotSpecified on export', () => {
    component.portalDetail = portal
    component.portalDetail.themeId = ''
    component.importThemeCheckbox = true
    menuApiServiceSpy.getMenuStructureForPortalId.and.returnValue(of(mockMenuItems))
    themeApiServiceSpy.getThemeById.and.returnValue(throwError(() => new Error()))

    component.onExportWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'DETAIL.THEME_NOT_SPECIFIED_MESSAGE'
    })
  })

  it('should display error if portalNotFound on export', () => {
    component.portalDetail = undefined

    component.onExportWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'DETAIL.PORTAL_NOT_FOUND'
    })
  })

  it('should have prepared action buttons onInit: close', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of([portal]))

    component.ngOnInit()
    const action = component.actions[0]
    action.actionCallback()

    expect(locationSpy.back).toHaveBeenCalled()
  })

  it('should have prepared action buttons onInit: manageMenu', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of([portal]))
    spyOn(component, 'manageMenu')

    component.ngOnInit()
    const action = component.actions[1]
    action.actionCallback()

    expect(component.manageMenu).toHaveBeenCalled()
  })

  it('should have prepared action buttons onInit: toggleEditMode', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of([portal]))

    component.editMode = false
    component.ngOnInit()
    const action = component.actions[2]
    action.actionCallback()

    expect(component.editMode).toBeTrue()
  })

  it('should have prepared action buttons onInit: updatePortal props', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of([portal]))
    component.portalPropsComponent = new MockWorkspacePropsComponent() as unknown as WorkspacePropsComponent
    component.selectedIndex = 0

    component.ngOnInit()
    const action = component.actions[3]
    action.actionCallback()

    expect(component.editMode).toBeFalse()
  })

  it('should have prepared action buttons onInit: updatePortal contact', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of([portal]))
    component.portalContactComponent = new MockWorkspaceContactComponent() as unknown as WorkspaceContactComponent
    component.selectedIndex = 1

    component.ngOnInit()
    const action = component.actions[3]
    action.actionCallback()

    expect(component.editMode).toBeFalse()
  })

  it('should have prepared action buttons onInit: updatePortal roles', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of([portal]))
    component.portalRolesComponent = new MockWorkspaceRolesComponent() as unknown as WorkspaceRolesComponent
    component.selectedIndex = 4

    component.ngOnInit()
    const action = component.actions[3]
    action.actionCallback()

    expect(component.editMode).toBeFalse()
  })

  it('should have prepared action buttons onInit: updatePortal images', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of([portal]))
    component.portalImagesComponent = new MockWorkspaceImagesComponent() as unknown as WorkspaceImagesComponent
    component.selectedIndex = 5

    component.ngOnInit()
    const action = component.actions[3]
    action.actionCallback()

    expect(component.editMode).toBeFalse()
  })

  it('should have prepared action buttons onInit: updatePortal: default', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of([portal]))
    component.selectedIndex = 99
    spyOn(console, 'error')

    component.ngOnInit()
    const action = component.actions[3]
    action.actionCallback()

    expect(console.error).toHaveBeenCalledWith("Couldn't assign tab to component")
  })

  it('should have prepared action buttons onInit: portalDownloadVisible', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of([portal]))

    component.ngOnInit()
    const action = component.actions[4]
    action.actionCallback()

    expect(component.portalDownloadVisible).toBeTrue()
  })

  it('should have prepared action buttons onInit: toggleEditMode', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of([portal]))
    const toggleEditModeSpy = spyOn<any>(component, 'toggleEditMode').and.callThrough()

    component.ngOnInit()
    const action = component.actions[5]
    action.actionCallback()

    expect(toggleEditModeSpy).toHaveBeenCalled()
  })

  it('should have prepared action buttons onInit: portalDeleteVisible', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of([portal]))

    component.ngOnInit()
    const action = component.actions[6]
    action.actionCallback()

    expect(component.portalDeleteVisible).toBeTrue()
  })

  it('should correctly navigate on manageMenu', () => {
    component.manageMenu()

    expect(mockRouter.navigate).toHaveBeenCalledWith(['./menu'], { relativeTo: mockActivatedRoute })
  })
})
