import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { Router } from '@angular/router'
import { ActivatedRoute } from '@angular/router'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import {
  AUTH_SERVICE,
  AppStateService,
  createTranslateLoader,
  PortalMessageService
} from '@onecx/portal-integration-angular'
import { WorkspaceImportComponent } from 'src/app/workspace/workspace-import/workspace-import.component'
import { ConfirmComponent } from 'src/app/workspace/workspace-import/confirm/confirm.component'
import { WorkspaceAPIService, EximWorkspaceMenuItem, WorkspaceSnapshot } from 'src/app/shared/generated'
import { PreviewComponent } from 'src/app/workspace/workspace-import/preview/preview.component'

class MockRouter {
  navigate = jasmine.createSpy('navigate')
}

class MockConfirmComponent {
  public workspaceName = 'portal name'
  public themeName = 'theme name'
  public baseUrl = 'base url'
  public tenantId = 'tenant id'
  public workspaceNameExists = false
  public themeNameExists = false
  public baseUrlExists = false
  public baseUrlIsMissing = false
  public portalTenantExists = false
  public importThemeCheckbox = false
  public hasPermission = false
}

class MockPreviewComponent {
  public workspaceName = 'portal name'
  public themeName = 'theme name'
  public baseUrl = 'base url'
  public tenantId = 'tenant id'
}

describe('WorkspaceImportComponent', () => {
  let component: WorkspaceImportComponent
  let fixture: ComponentFixture<WorkspaceImportComponent>
  let httpTestingController: HttpTestingController
  let mockActivatedRoute: ActivatedRoute
  let mockRouter = new MockRouter()
  const mockAuthService = jasmine.createSpyObj('IAuthService', ['hasPermission'])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockWindow: any

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    importWorkspaces: jasmine.createSpy('importWorkspaces').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceImportComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy },
        { provide: AUTH_SERVICE, useValue: mockAuthService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.importWorkspaces.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceImportComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    httpTestingController = TestBed.inject(HttpTestingController)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should call reset OnChanges', () => {
    spyOn(component, 'reset')

    component.ngOnChanges()

    expect(component.reset).toHaveBeenCalled()
  })

  it('should call toggleImportDialogEvent onClose', () => {
    spyOn(component.toggleImportDialogEvent, 'emit')

    component.onClose()

    expect(component.toggleImportDialogEvent.emit).toHaveBeenCalledOnceWith(true)
  })

  it('should set formValid on handleFormValidation', () => {
    component.handleFormValidation(true)

    expect(component.isFormValid).toBeTrue()
  })

  it('should set isLoading on handleIsLoading', () => {
    component.handleIsLoading(true)

    expect(component.isLoading).toBeTrue()
  })

  it('should display error msg if no importRequestDTO', () => {
    component.importRequestDTO = undefined

    component.importPortal()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'PORTAL_IMPORT.PORTAL_IMPORT_ERROR' })
  })

  it('should import a portal', () => {
    apiServiceSpy.importWorkspaces.and.returnValue(of({}))
    const workspaceSnap = {
      workspaces: {
        workspace: {
          name: 'name'
        }
      }
    }
    component.importRequestDTO = workspaceSnap
    component.hasPermission = true
    component.tenantId = 'id'
    component.importThemeCheckbox = false
    component.confirmComponent = new MockConfirmComponent() as unknown as ConfirmComponent
    if (component.confirmComponent) {
      component.confirmComponent.workspaceNameExists = false
    }

    component.importPortal()

    // const req = httpTestingController.expectOne(`http://localhost/v1/importWorkspaces`)
    // expect(req.request.method).toEqual('POST')
    // req.flush({})

    expect(component.isLoading).toBeFalse()
    // expect(component.importRequestDTO.portal.microfrontendRegistrations).toEqual(jasmine.any(Array))
    // portal.portal.microfrontendRegistrations.forEach((mfe) => {
    //   expect(component.importRequestDTO?.portal.microfrontendRegistrations).toContain(mfe)
    // })
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'PORTAL_IMPORT.PORTAL_IMPORT_CREATE_SUCCESS' })
  })

  xit('should import a portal with theme if checkbox enabled', () => {
    apiServiceSpy.importWorkspaces.and.returnValue(of({}))
    const workspaceSnap = {
      workspaces: {
        workspace: {
          name: 'name'
        }
      }
    }
    component.importRequestDTO = workspaceSnap
    component.hasPermission = true
    component.tenantId = 'id'
    component.importThemeCheckbox = true
    component.confirmComponent = new MockConfirmComponent() as unknown as ConfirmComponent
    if (component.confirmComponent) {
      component.confirmComponent.workspaceNameExists = false
    }
    component.themeName = 'new name'

    component.importPortal()

    const req = httpTestingController.expectOne(`http://localhost/v1/importWorkspaces`)
    expect(req.request.method).toEqual('POST')
    req.flush({})

    // expect(component.importRequestDTO.portal.themeName).toEqual('new name')
    // expect(component.importRequestDTO.themeImportData?.name).toEqual('new name')
  })

  it('should update a portal', () => {
    apiServiceSpy.importWorkspaces.and.returnValue(of({}))
    const workspaceSnap = {
      workspaces: {
        workspace: {
          name: 'name'
        }
      }
    }
    component.importRequestDTO = workspaceSnap
    component.hasPermission = true
    component.tenantId = 'id'
    component.importThemeCheckbox = false
    component.confirmComponent = new MockConfirmComponent() as unknown as ConfirmComponent
    if (component.confirmComponent) {
      component.confirmComponent.workspaceNameExists = true
    }

    component.importPortal()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'PORTAL_IMPORT.PORTAL_IMPORT_UPDATE_SUCCESS' })
  })

  it('should update a portal with new base url', () => {
    apiServiceSpy.importWorkspaces.and.returnValue(of({}))
    const workspaceSnap = {
      workspaces: {
        workspace: {
          name: 'name',
          menu: {
            menu: {
              menuItems: [
                {
                  name: 'menu'
                }
              ]
            }
          }
        }
      }
    }
    component.importRequestDTO = workspaceSnap
    component.hasPermission = true
    component.tenantId = 'id'
    component.importThemeCheckbox = false
    component.confirmComponent = new MockConfirmComponent() as unknown as ConfirmComponent
    if (component.confirmComponent) {
      component.confirmComponent.workspaceNameExists = true
    }
    component.baseUrlOrg = 'http://baseurl'
    component.baseUrl = 'http://newbaseurl'

    component.next()
    component.importPortal()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'PORTAL_IMPORT.PORTAL_IMPORT_UPDATE_SUCCESS' })
  })

  it('should display error msg if api call fails', () => {
    const workspaceSnap = {
      workspaces: {
        workspace: {
          name: 'name'
        }
      }
    }
    component.importRequestDTO = workspaceSnap
    apiServiceSpy.importWorkspaces.and.returnValue(throwError(() => new Error()))
    component.hasPermission = true
    component.tenantId = 'id'
    component.importThemeCheckbox = false

    component.importPortal()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'PORTAL_IMPORT.PORTAL_IMPORT_ERROR' })
  })

  it('should alignMenuItemsBaseUrl', () => {
    const menuItems: EximWorkspaceMenuItem[] = [
      { url: 'http://baseurlorg/path1', children: [] },
      { url: 'http://baseurlorg/path2', children: [{ url: 'http://baseurlorg/path2/child', children: [] }] },
      { url: 'http://otherurl/path3', children: [] }
    ]

    component.baseUrlOrg = 'http://baseurl'
    component.baseUrl = 'http://newbaseurl'

    component.alignMenuItemsBaseUrl(menuItems)

    expect(menuItems[0].url).toEqual('http://newbaseurlorg/path1')
    expect(menuItems[1].url).toEqual('http://newbaseurlorg/path2')
    if (menuItems[1].children) {
      expect(menuItems[1].children[0].url).toEqual('http://newbaseurlorg/path2/child')
    }
    expect(menuItems[2].url).toEqual('http://otherurl/path3')
  })

  it('should set importRequestDTO on next when activeIndex is 0 (upload), and themeImportData valid', () => {
    const workspaceSnap: WorkspaceSnapshot = {
      workspaces: {
        workspace: {
          name: 'name',
          baseUrl: 'url'
        }
      }
    }
    component.importRequestDTO = workspaceSnap
    component.activeIndex = 0

    component.next(workspaceSnap)

    expect(component.baseUrlOrg).toEqual('url')
  })

  it('should set values from preview component on next when activeIndex is 1 (preview)', () => {
    component.previewComponent = new MockPreviewComponent() as unknown as PreviewComponent
    component.activeIndex = 1
    component.hasPermission = true

    component.next()

    expect(component.workspaceName).toEqual(component.previewComponent?.workspaceName)
    expect(component.themeName).toEqual(component.previewComponent?.themeName)
    expect(component.baseUrl).toEqual(component.previewComponent?.baseUrl)
    expect(component.tenantId).toEqual(component.previewComponent?.tenantId)
  })

  it('should set values from confirm component on back when activeIndex is 2 (confirm)', () => {
    component.confirmComponent = new MockConfirmComponent() as unknown as ConfirmComponent
    component.activeIndex = 2
    component.hasPermission = true
    const workspaceSnap = {
      workspaces: {
        workspace: {
          name: 'name',
          menu: {
            menu: {
              menuItems: [
                {
                  name: 'menuName'
                }
              ]
            }
          }
        }
      }
    }
    component.importRequestDTO = workspaceSnap

    component.back()

    if (component.confirmComponent.workspaceName) {
      expect(component.importRequestDTO.workspaces?.['workspace'].name).toEqual(
        component.confirmComponent.workspaceName
      )
    }
    // if (component.confirmComponent.themeName) {
    //   expect(component.importRequestDTO.workspaces.['workspace']themeImportData?.name).toEqual(component.confirmComponent.themeName)
    // }
    if (component.confirmComponent.baseUrl) {
      expect(component.importRequestDTO.workspaces?.['workspace'].baseUrl).toEqual(component.confirmComponent.baseUrl)
    }
  })
})

//         tenantId: 'id'
//       },
//       themeImportData: {
//         name: 'themeName'
//       }
//     }
//     component.importRequestDTO = importRequestDTO

//     component.back()

//     if (component.confirmComponent.portalName) {
//       expect(component.importRequestDTO.portal.portalName).toEqual(component.confirmComponent.portalName)
//     }
//     if (component.confirmComponent.themeName) {
//       expect(component.importRequestDTO.themeImportData?.name).toEqual(component.confirmComponent.themeName)
//     }
//     if (component.confirmComponent.baseUrl) {
//       expect(component.importRequestDTO.portal.baseUrl).toEqual(component.confirmComponent.baseUrl)
//     }
//     if (component.confirmComponent.tenantId) {
//       expect(component.importRequestDTO.portal.tenantId).toEqual(component.confirmComponent.tenantId)
//     }
//   })
// })
