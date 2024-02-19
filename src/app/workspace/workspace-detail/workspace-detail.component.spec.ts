import { NO_ERRORS_SCHEMA, Component } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { Location } from '@angular/common'
import { /* HttpClient, */ HttpEventType, HttpHeaders, HttpResponse } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { Router } from '@angular/router'
import { RouterTestingModule } from '@angular/router/testing'
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router'
// import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
// import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import { PortalMessageService, ConfigurationService, AUTH_SERVICE } from '@onecx/portal-integration-angular'
// import { HttpLoaderFactory } from 'src/app/shared/shared.module'
// import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { WorkspaceDetailComponent } from './workspace-detail.component'
import { WorkspacePropsComponent } from './workspace-props/workspace-props.component'
import { WorkspaceContactComponent } from './workspace-contact/workspace-contact.component'
import { WorkspaceRolesComponent } from './workspace-roles/workspace-roles.component'
// import { WorkspaceImagesComponent } from './workspace-images/workspace-images.component'
import { Workspace, MenuItem, WorkspaceAPIService, MenuItemAPIService } from '../../shared/generated'

class MockRouter {
  navigate = jasmine.createSpy('navigate')
}

const workspace: Workspace = {
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  id: 'id'
}

const mockMenuItems: MenuItem[] = [
  {
    name: 'menu name',
    id: 'id',
    key: 'key',
    i18n: { ['en']: 'en' },
    children: [{ name: 'child name', key: 'key', id: 'id' }]
  },
  {
    name: 'menu2 name',
    id: 'id',
    key: 'key',
    i18n: { ['en']: 'en' },
    children: [{ name: 'child name', key: 'key', id: 'id' }]
  },
  {
    name: 'menu2 name',
    id: 'id',
    key: 'key',
    i18n: { ['en']: 'en' }
  }
]

const menuHttpResponse: HttpResponse<MenuItem[]> = {
  body: mockMenuItems,
  status: 200,
  statusText: 'OK',
  headers: new HttpHeaders(),
  url: 'mock-url',
  ok: true,
  type: HttpEventType.Response,
  clone: () => menuHttpResponse
}

// const themeHttpResponse: HttpResponse<ThemeDTO> = {
//   body: { name: 'theme' },
//   status: 200,
//   statusText: 'OK',
//   headers: new HttpHeaders(),
//   url: 'mock-url',
//   ok: true,
//   type: HttpEventType.Response,
//   clone: () => themeHttpResponse
// }
// const themeHttpResponse: HttpResponse<ThemeDTO> = {
//   body: { name: 'theme' },
//   status: 200,
//   statusText: 'OK',
//   headers: new HttpHeaders(),
//   url: 'mock-url',
//   ok: true,
//   type: HttpEventType.Response,
//   clone: () => themeHttpResponse
// }

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

// class MockWorkspaceImagesComponent {
//   public onSubmit(): void {}
// }

describe('WorkspaceDetailComponent', () => {
  let component: WorkspaceDetailComponent
  let fixture: ComponentFixture<WorkspaceDetailComponent>
  let mockActivatedRoute: Partial<ActivatedRoute>
  let mockRouter = new MockRouter()
  const mockAuthService = jasmine.createSpyObj('IAuthService', ['hasPermission'])

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    getWorkspaceByName: jasmine.createSpy('getWorkspaceByName').and.returnValue(of({})),
    deletePortal: jasmine.createSpy('deletePortal').and.returnValue(of({}))
  }
  const menuApiServiceSpy = {
    getMenuStructureForPortalId: jasmine.createSpy('getMenuStructureForPortalId').and.returnValue(of(mockMenuItems))
  }
  // const themeApiServiceSpy = jasmine.createSpyObj<ThemesAPIService>('ThemesAPIService', ['getThemeById'])
  // const themeApiServiceSpy = jasmine.createSpyObj<ThemesAPIService>('ThemesAPIService', ['getThemeById'])
  const configServiceSpy = {
    getProperty: jasmine.createSpy('getProperty').and.returnValue('123'),
    getPortal: jasmine.createSpy('getPortal').and.returnValue({
      themeId: '1234',
      name: 'test',
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
        // TranslateModule.forRoot({
        //   loader: {
        //     provide: TranslateLoader,
        //     useFactory: HttpLoaderFactory,
        //     deps: [HttpClient]
        //   }
        // }),
        // TranslateModule.forRoot({
        //   loader: {
        //     provide: TranslateLoader,
        //     useFactory: HttpLoaderFactory,
        //     deps: [HttpClient]
        //   }
        // }),
        RouterTestingModule.withRoutes([{ path: 'menu', component: MockMenuComponent }])
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy },
        { provide: ConfigurationService, useValue: configServiceSpy },
        { provide: MenuItemAPIService, useValue: menuApiServiceSpy },
        // { provide: ThemesAPIService, useValue: themeApiServiceSpy },
        { provide: MenuItemAPIService, useValue: menuApiServiceSpy },
        // { provide: ThemesAPIService, useValue: themeApiServiceSpy },
        { provide: AUTH_SERVICE, useValue: mockAuthService },
        { provide: Location, useValue: locationSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.getWorkspaceByName.calls.reset()
    apiServiceSpy.deletePortal.calls.reset()
    menuApiServiceSpy.getMenuStructureForPortalId.calls.reset()
    // themeApiServiceSpy.getThemeById.calls.reset()
    // themeApiServiceSpy.getThemeById.calls.reset()
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

  it('should getWorkspaceData onInit', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
    spyOn(component, 'onWorkspaceData')

    component.ngOnInit()

    expect(component.onWorkspaceData).toHaveBeenCalled()
  })

  it('should display error msg if get api call fails', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(throwError(() => new Error()))

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'SEARCH.ERROR',
      detailKey: 'PORTAL.NOT_EXIST_MESSAGE'
    })
  })

  it('should delete portal on confirmDeleteWorkspace', () => {
    apiServiceSpy.deletePortal.and.returnValue(of({}))
    component.workspaceDownloadVisible = true

    component.confirmDeleteWorkspace()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE_OK' })
    expect(component.workspaceDownloadVisible).toBeFalse()
  })

  it('should display error msg if delete api call fails', () => {
    apiServiceSpy.deletePortal.and.returnValue(throwError(() => new Error()))

    component.confirmDeleteWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'ACTIONS.DELETE.MESSAGE_NOK'
    })
  })

  it('should export a portal', () => {
    component.workspaceDetail = workspace
    component.importThemeCheckbox = true
    menuApiServiceSpy.getMenuStructureForPortalId.and.returnValue(of(mockMenuItems))
    // themeApiServiceSpy.getThemeById.and.returnValue(of(themeHttpResponse))
    // themeApiServiceSpy.getThemeById.and.returnValue(of(themeHttpResponse))

    component.onExportWorkspace()

    expect(component.workspaceDownloadVisible).toBeFalse()
  })

  it('should display error if themeNotSpecified on export', () => {
    component.workspaceDetail = workspace
    if (component.workspaceDetail) {
      component.workspaceDetail.theme = ''
    }
    component.importThemeCheckbox = true
    menuApiServiceSpy.getMenuStructureForPortalId.and.returnValue(of(mockMenuItems))
    // themeApiServiceSpy.getThemeById.and.returnValue(throwError(() => new Error()))
    // themeApiServiceSpy.getThemeById.and.returnValue(throwError(() => new Error()))

    component.onExportWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'DETAIL.THEME_NOT_SPECIFIED_MESSAGE'
    })
  })

  it('should display error if portalNotFound on export', () => {
    component.workspaceDetail = undefined

    component.onExportWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'DETAIL.PORTAL_NOT_FOUND'
    })
  })

  it('should have prepared action buttons onInit: close', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))

    component.ngOnInit()
    const action = component.actions[0]
    action.actionCallback()

    expect(locationSpy.back).toHaveBeenCalled()
  })

  it('should have prepared action buttons onInit: manageMenu', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
    spyOn(component, 'manageMenu')

    component.ngOnInit()
    const action = component.actions[1]
    action.actionCallback()

    expect(component.manageMenu).toHaveBeenCalled()
  })

  it('should have prepared action buttons onInit: toggleEditMode', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))

    component.editMode = false
    component.ngOnInit()
    const action = component.actions[2]
    action.actionCallback()

    expect(component.editMode).toBeTrue()
  })

  it('should have prepared action buttons onInit: updatePortal props', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
    component.workspacePropsComponent = new MockWorkspacePropsComponent() as unknown as WorkspacePropsComponent
    component.selectedIndex = 0

    component.ngOnInit()
    const action = component.actions[3]
    action.actionCallback()

    expect(component.editMode).toBeFalse()
  })

  it('should have prepared action buttons onInit: updatePortal contact', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
    component.workspaceContactComponent = new MockWorkspaceContactComponent() as unknown as WorkspaceContactComponent
    component.selectedIndex = 1

    component.ngOnInit()
    const action = component.actions[3]
    action.actionCallback()

    expect(component.editMode).toBeFalse()
  })

  it('should have prepared action buttons onInit: updateworkspace roles', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
    component.workspaceRolesComponent = new MockWorkspaceRolesComponent() as unknown as WorkspaceRolesComponent
    component.selectedIndex = 4

    component.ngOnInit()
    const action = component.actions[3]
    action.actionCallback()

    expect(component.editMode).toBeFalse()
  })

  // it('should have prepared action buttons onInit: updateworkspace images', () => {
  //   apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
  //   component.workspaceImagesComponent = new MockWorkspaceImagesComponent() as unknown as WorkspaceImagesComponent
  //   component.selectedIndex = 5

  //   component.ngOnInit()
  //   const action = component.actions[3]
  //   action.actionCallback()

  //   expect(component.editMode).toBeFalse()
  // })

  it('should have prepared action buttons onInit: updateworkspace: default', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
    component.selectedIndex = 99
    spyOn(console, 'error')

    component.ngOnInit()
    const action = component.actions[3]
    action.actionCallback()

    expect(console.error).toHaveBeenCalledWith("Couldn't assign tab to component")
  })

  it('should have prepared action buttons onInit: workspaceDownloadVisible', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))

    component.ngOnInit()
    const action = component.actions[4]
    action.actionCallback()

    expect(component.workspaceDownloadVisible).toBeTrue()
  })

  it('should have prepared action buttons onInit: toggleEditMode', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
    const toggleEditModeSpy = spyOn<any>(component, 'toggleEditMode').and.callThrough()

    component.ngOnInit()
    const action = component.actions[5]
    action.actionCallback()

    expect(toggleEditModeSpy).toHaveBeenCalled()
  })

  it('should have prepared action buttons onInit: workspaceDeleteVisible', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))

    component.ngOnInit()
    const action = component.actions[6]
    action.actionCallback()

    expect(component.workspaceDeleteVisible).toBeTrue()
  })

  it('should correctly navigate on manageMenu', () => {
    component.manageMenu()

    expect(mockRouter.navigate).toHaveBeenCalledWith(['./menu'], { relativeTo: mockActivatedRoute })
  })
})
