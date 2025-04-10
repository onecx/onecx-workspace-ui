import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import { ImportResponseStatus, WorkspaceAPIService } from 'src/app/shared/generated'

import { WorkspaceImportComponent } from './workspace-import.component'
import { ConfirmComponent } from './confirm/confirm.component'
import { PreviewComponent } from './preview/preview.component'

class MockRouter {
  navigate = jasmine.createSpy('navigate')
}

class MockConfirmComponent {
  public workspaceName = 'portal name'
  public themeName = 'theme name'
  public baseUrl = 'base url'
  public workspaceNameExists = false
  public themeNameExists = false
  public baseUrlExists = false
  public baseUrlIsMissing = false
  public hasPermission = false
}

class MockPreviewComponent {
  public workspaceName = 'portal name'
  public theme = { name: 'theme name' }
  public baseUrl = 'base url'
}

describe('WorkspaceImportComponent', () => {
  let component: WorkspaceImportComponent
  let fixture: ComponentFixture<WorkspaceImportComponent>
  const mockRouter = new MockRouter()
  const mockActivatedRouteSnapshot: Partial<ActivatedRouteSnapshot> = { params: { id: 'mockId' } }
  const mockActivatedRoute: Partial<ActivatedRoute> = {
    snapshot: mockActivatedRouteSnapshot as ActivatedRouteSnapshot
  }

  const mockUserService = jasmine.createSpyObj('UserService', ['hasPermission'])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockWindow: any

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', [
    'success',
    'error',
    'warning'
  ])
  const apiServiceSpy = { importWorkspaces: jasmine.createSpy('importWorkspaces').and.returnValue(of({})) }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceImportComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.warning.calls.reset()
    apiServiceSpy.importWorkspaces.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceImportComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
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

    component.importWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.VALIDATION.WORKSPACE.MISSING' })
  })

  it('should import a workspace successfully', () => {
    const response = {
      id: 'testString1',
      workspaces: { WS1: ImportResponseStatus.Updated },
      menus: { WS1: ImportResponseStatus.Updated }
    }
    apiServiceSpy.importWorkspaces.and.returnValue(of(response))
    const workspaceSnap = { workspaces: { workspace: { name: 'name' } } }
    component.importRequestDTO = workspaceSnap
    component.hasPermission = true
    component.confirmComponent = new MockConfirmComponent() as unknown as ConfirmComponent
    if (component.confirmComponent) {
      component.confirmComponent.workspaceNameExists = false
    }

    component.importWorkspace()

    expect(component.isLoading).toBeFalse()
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.UPDATED' })
  })

  it('should create a workspace', () => {
    const response = {
      id: 'uuid',
      workspaces: { WS1: ImportResponseStatus.Created },
      menus: { WS1: ImportResponseStatus.Skipped }
    }
    apiServiceSpy.importWorkspaces.and.returnValue(of(response))
    component.importRequestDTO = { workspaces: { WS1: { name: 'name' } } }
    component.confirmComponent = new MockConfirmComponent() as unknown as ConfirmComponent
    if (component.confirmComponent) {
      component.confirmComponent.workspaceNameExists = true
    }

    component.importWorkspace()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.CREATED' })
    expect(mockRouter.navigate).toHaveBeenCalledWith(['./', 'name'], { relativeTo: mockActivatedRoute })
  })

  it('should update a portal with new base url', () => {
    const response = {
      id: 'uuid',
      workspaces: { WS1: ImportResponseStatus.Updated },
      menus: { WS1: ImportResponseStatus.Updated }
    }
    apiServiceSpy.importWorkspaces.and.returnValue(of(response))
    const workspaceSnap = {
      workspaces: {
        WS1: {
          name: 'name',
          menu: { menu: { menuItems: [{ name: 'menu' }] } }
        }
      }
    }
    component.importRequestDTO = workspaceSnap
    component.hasPermission = true
    component.confirmComponent = new MockConfirmComponent() as unknown as ConfirmComponent
    if (component.confirmComponent) {
      component.confirmComponent.workspaceNameExists = true
    }
    component.baseUrlOrg = 'http://baseurl'
    component.baseUrl = 'http://newbaseurl'

    component.next()
    component.importWorkspace()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.UPDATED' })
    expect(mockRouter.navigate).toHaveBeenCalledWith(['./', 'name'], { relativeTo: mockActivatedRoute })
  })

  it('should create a workspace', () => {
    const response = {
      id: 'uuid',
      workspaces: { WS1: ImportResponseStatus.Skipped },
      menus: { WS1: ImportResponseStatus.Skipped }
    }
    apiServiceSpy.importWorkspaces.and.returnValue(of(response))
    component.importRequestDTO = { workspaces: { WS1: { name: 'name' } } }
    component.confirmComponent = new MockConfirmComponent() as unknown as ConfirmComponent
    if (component.confirmComponent) {
      component.confirmComponent.workspaceNameExists = true
    }

    component.importWorkspace()

    expect(msgServiceSpy.warning).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.SKIPPED' })
  })

  it('should display error msg if api call fails', () => {
    const errorResponse = { status: 400, statusText: 'Error on import workspaces' }
    component.importRequestDTO = { workspaces: { WS1: { name: 'name' } } }
    apiServiceSpy.importWorkspaces.and.returnValue(throwError(() => errorResponse))
    component.hasPermission = true
    spyOn(console, 'error')

    component.importWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.IMPORT_NOK' })
    expect(console.error).toHaveBeenCalledWith('importWorkspaces', errorResponse)
  })

  it('should display error msg if response status is error', () => {
    const response = {
      id: 'testString1',
      workspaces: { WS1: ImportResponseStatus.Error },
      menus: { WS1: ImportResponseStatus.Updated }
    }
    apiServiceSpy.importWorkspaces.and.returnValue(of(response))
    component.importRequestDTO = { workspaces: { WS1: { name: 'name' } } }
    component.hasPermission = true

    component.importWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.ERROR' })
  })

  describe('next', () => {
    it('should set importRequestDTO on next when activeIndex is 0 (upload), and themeImportData valid', () => {
      const workspaceSnap: any = { workspaces: { workspace: { name: 'name', baseUrl: 'url' } } }
      component.importRequestDTO = workspaceSnap
      component.activeIndex = 0

      component.next(workspaceSnap)

      expect(component.baseUrlOrg).toEqual('url')
    })

    it('should set values from preview component on next when activeIndex is 1 (preview) this.previewComponent values undefined', () => {
      component.previewComponent = new MockPreviewComponent() as unknown as PreviewComponent
      component.activeIndex = 1
      component.hasPermission = true

      component.previewComponent.workspaceName = undefined!
      component.previewComponent.baseUrl = undefined!
      component.next()

      expect(component.workspaceName).toEqual('')
      expect(component.baseUrl).toEqual('')
    })

    it('should set values from preview component on next when activeIndex is 1 (preview)', () => {
      component.previewComponent = new MockPreviewComponent() as unknown as PreviewComponent
      component.activeIndex = 1
      component.hasPermission = true

      component.next()

      expect(component.workspaceName).toEqual(component.previewComponent?.workspaceName)
      expect(component.themeName).toEqual(component.previewComponent?.theme.name)
      expect(component.baseUrl).toEqual(component.previewComponent?.baseUrl)
    })
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
    component.confirmComponent.workspaceName = undefined
    component.confirmComponent.baseUrl = undefined
    component.confirmComponent.themeName = undefined

    component.back()

    expect(component.importRequestDTO.workspaces?.['workspace'].name).toEqual('')
    expect(component.importRequestDTO.workspaces?.['workspace'].baseUrl).toEqual('')
    expect(component.importRequestDTO.workspaces?.['workspace'].theme).toEqual('')
  })
})
