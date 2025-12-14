import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import { ImportResponseStatus, WorkspaceAPIService } from 'src/app/shared/generated'
import { WorkspaceImportComponent } from './workspace-import.component'

class MockRouter {
  navigate = jasmine.createSpy('navigate')
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

  describe('model changes', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })
  })

  describe('close and reset', () => {
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
  })

  it('should set formValid on handleFormValidation', () => {
    component.handleFormValidation(true)

    expect(component.isFormValid).toBeTrue()
  })

  it('should set isLoading on handleIsLoading', () => {
    component.handleIsLoading(true)

    expect(component.isLoading).toBeTrue()
  })

  describe('successful saving', () => {
    it('should display error msg if no importRequestDTO', () => {
      component.importRequestDTO = undefined

      component.saveWorkspace()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.VALIDATION.WORKSPACE.MISSING' })
    })

    it('should save a workspace successfully - same name', () => {
      const workspace1 = {
        name: 'ws1',
        displayName: 'display name',
        menu: { menu: { menuItems: [{ name: 'menu' }] } }
      }
      const workspace2 = { ...workspace1, displayName: 'display nameith change' }
      const workspaceDTO = { workspaces: workspace1 }
      const response = {
        id: 'testString1',
        workspaces: { ws1: ImportResponseStatus.Updated },
        menus: { ws1: ImportResponseStatus.Updated }
      }
      apiServiceSpy.importWorkspaces.and.returnValue(of(response))

      component.importRequestDTO = workspaceDTO // read from file
      component.importWorkspaceOrg = workspace1
      component.importWorkspace = workspace2
      component.hasPermission = true

      component.saveWorkspace()

      expect(component.isLoading).toBeFalse()
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.UPDATED' })
    })

    it('should save a workspace successfully - different name', () => {
      const workspace1 = {
        name: 'ws1',
        displayName: 'display name',
        menu: { menu: { menuItems: [{ name: 'menu' }] } }
      }
      const workspace2 = { ...workspace1, name: 'ws2', displayName: 'display name with change' }
      const workspaceDTO = { workspaces: workspace1 }
      const response = {
        id: 'testString1',
        workspaces: { ws2: ImportResponseStatus.Created },
        menus: { ws1: ImportResponseStatus.Updated }
      }
      apiServiceSpy.importWorkspaces.and.returnValue(of(response))

      component.importRequestDTO = workspaceDTO // read from file
      component.importWorkspaceOrg = workspace1
      component.importWorkspace = workspace2
      component.hasPermission = true

      component.saveWorkspace()

      expect(component.isLoading).toBeFalse()
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.CREATED' })
      expect(mockRouter.navigate).toHaveBeenCalledWith(['./', 'ws2'], { relativeTo: mockActivatedRoute })
    })
  })

  describe('failed saving', () => {
    beforeEach(() => {
      const workspace1 = {
        name: 'ws1',
        displayName: 'display name',
        menu: { menu: { menuItems: [{ name: 'menu' }] } }
      }
      const workspace2 = { ...workspace1, name: 'ws2', displayName: 'display nameith change' }
      const workspaceDTO = { workspaces: workspace1 }
      component.importRequestDTO = workspaceDTO // read from file
      component.importWorkspaceOrg = workspace1
      component.importWorkspace = workspace2
      component.hasPermission = true
    })

    it('should display error msg if api call fails', () => {
      const errorResponse = { status: 400, statusText: 'Error on import workspaces' }
      apiServiceSpy.importWorkspaces.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.saveWorkspace()

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

      component.saveWorkspace()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.ERROR' })
    })

    it('should create a workspace', () => {
      const response = {
        id: 'uuid',
        workspaces: { WS1: ImportResponseStatus.Skipped },
        menus: { WS1: ImportResponseStatus.Skipped }
      }
      apiServiceSpy.importWorkspaces.and.returnValue(of(response))
      component.importRequestDTO = { workspaces: { WS1: { name: 'name' } } }

      component.saveWorkspace()

      expect(msgServiceSpy.warning).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.SKIPPED' })
    })
  })

  describe('next', () => {
    it('should read file content when activeIndex is 0 (upload)', () => {
      const importDTO: any = { workspaces: { wsp1: { baseUrl: 'url', theme: 'theme' } } }
      component.activeIndex = 0

      component.next(importDTO)

      expect(component.activeIndex).toBe(1)
      expect(component.importWorkspace?.name).toBe('wsp1')
      expect(component.importWorkspace?.baseUrl).toBe('url')
    })

    it('should increment index only', () => {
      component.activeIndex = 1

      component.next()

      expect(component.activeIndex).toBe(2)
    })
  })

  it('should decrement activeIndex on back', () => {
    component.activeIndex = 2
    component.back()

    expect(component.activeIndex).toBe(1)
  })
})
