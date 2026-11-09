import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { BehaviorSubject, EMPTY, of, throwError } from 'rxjs'

import { provideUserServiceMock } from '@onecx/angular-integration-interface/mocks'

import { ImportResponseStatus } from 'src/app/shared/generated'
import { WorkspaceImportComponent } from './workspace-import.component'
import { UserService } from '@onecx/angular-integration-interface'

describe('WorkspaceImportComponent', () => {
  let component: WorkspaceImportComponent
  let fixture: ComponentFixture<WorkspaceImportComponent>

  function initializeComponent(): void {
    fixture = TestBed.createComponent(WorkspaceImportComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  // p-steps subscribes to router.events when the dialog is rendered
  const mockRouter = { navigate: jasmine.createSpy('navigate'), events: EMPTY }
  const mockActivatedRouteSnapshot: Partial<ActivatedRouteSnapshot> = { params: { id: 'mockId' } }
  const mockActivatedRoute: Partial<ActivatedRoute> = {
    snapshot: mockActivatedRouteSnapshot as ActivatedRouteSnapshot
  }
  const mockUserService = {
    lang$: new BehaviorSubject<string>('de'),
    getPermission: jasmine.createSpy('getPermission').and.returnValue(Promise.resolve(true)),
    hasPermission: jasmine.createSpy('hasPermission').and.callFake((permission) => {
      return ['WORKSPACE#IMPORT'].includes(permission)
    })
  }

  // WorkspaceAPIService and PortalMessageService are providedIn: 'any', so the component holds its
  // own instance and a root-level provider would be shadowed - spy on the actual instance it holds.
  let apiServiceSpy: { importWorkspaces: jasmine.Spy }
  let msgServiceSpy: { success: jasmine.Spy; error: jasmine.Spy; warning: jasmine.Spy }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        WorkspaceImportComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideUserServiceMock(),
        { provide: UserService, useValue: mockUserService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents()

    initializeComponent()

    apiServiceSpy = {
      importWorkspaces: spyOn(component['workspaceApi'], 'importWorkspaces') as jasmine.Spy
    }
    msgServiceSpy = {
      success: spyOn(component['msgService'], 'success'),
      error: spyOn(component['msgService'], 'error'),
      warning: spyOn(component['msgService'], 'warning')
    }
  })

  describe('model changes', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })

    it('should log error when checking hasPermission rejects', async () => {
      spyOn(console, 'error')
      mockUserService.hasPermission.and.returnValue(Promise.reject(new Error('perm failed')))

      initializeComponent()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(console.error).toHaveBeenCalled()

      // restore neutral behaviour for subsequent tests
      mockUserService.hasPermission.and.callFake((permission) => ['WORKSPACE#IMPORT'].includes(permission))
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
      component.importRequestDTO = {}

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
      const workspaceDTO = { workspaces: { [workspace1.name]: workspace1 } }
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
      const workspaceDTO = { workspaces: { [workspace1.name]: workspace1 } }
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
      mockRouter.navigate.calls.reset()
      const workspace1 = {
        name: 'ws1',
        displayName: 'display name',
        menu: { menu: { menuItems: [{ name: 'menu' }] } }
      }
      const workspace2 = { ...workspace1, name: 'ws2', displayName: 'display nameith change' }
      const workspaceDTO = { workspaces: { [workspace1.name]: workspace1 } }
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
      component.importRequestDTO = { workspaces: { WS1: { name: 'name', displayName: 'name' } } }
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
      component.importRequestDTO = { workspaces: { WS1: { name: 'name', displayName: 'name' } } }

      component.saveWorkspace()

      expect(msgServiceSpy.warning).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.SKIPPED' })
    })

    it('should reset isLoading when api call fails', () => {
      apiServiceSpy.importWorkspaces.and.returnValue(throwError(() => ({ status: 500 })))
      spyOn(console, 'error')

      component.saveWorkspace()

      expect(component.isLoading).toBeFalse()
    })

    it('should not start loading when there is nothing to import', () => {
      component.importWorkspaceOrg = undefined

      component.saveWorkspace()

      expect(component.isLoading).toBeFalse()
      expect(apiServiceSpy.importWorkspaces).not.toHaveBeenCalled()
    })

    it('should not start loading when the import request has no workspaces', () => {
      component.importRequestDTO = {}

      component.saveWorkspace()

      expect(component.isLoading).toBeFalse()
      expect(apiServiceSpy.importWorkspaces).not.toHaveBeenCalled()
    })

    it('should display error msg and keep the result if response has no workspaces', () => {
      apiServiceSpy.importWorkspaces.and.returnValue(of({ id: 'uuid' }))

      component.saveWorkspace()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.ERROR' })
      expect(component.importResponse).toEqual({ workspace: ImportResponseStatus.Error })
    })

    it('should display error msg if response contains an empty workspace result', () => {
      apiServiceSpy.importWorkspaces.and.returnValue(of({ id: 'uuid', workspaces: {}, menus: {} }))

      component.saveWorkspace()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.ERROR' })
      expect(mockRouter.navigate).not.toHaveBeenCalled()
    })

    it('should keep the result for the confirm step if response status is skipped', () => {
      apiServiceSpy.importWorkspaces.and.returnValue(
        of({ id: 'uuid', workspaces: { ws2: ImportResponseStatus.Skipped } })
      )

      component.saveWorkspace()

      expect(component.importResponse).toEqual({ workspace: ImportResponseStatus.Skipped })
    })
  })

  describe('import result handling', () => {
    beforeEach(() => {
      mockRouter.navigate.calls.reset()
      component.importRequestDTO = { workspaces: { ws1: { name: 'ws1', displayName: 'ws1' } } }
      component.importWorkspaceOrg = { name: 'ws1', displayName: 'ws1' }
      component.importWorkspace = { name: 'ws1', displayName: 'ws1' }
    })

    it('should clear a previous result and navigate when workspace is created', () => {
      component.importResponse = { workspace: ImportResponseStatus.Error }
      apiServiceSpy.importWorkspaces.and.returnValue(
        of({
          id: 'uuid',
          workspaces: { ws1: ImportResponseStatus.Created },
          menus: { ws1: ImportResponseStatus.Created }
        })
      )

      component.saveWorkspace()

      expect(component.importResponse).toBeUndefined()
      expect(msgServiceSpy.error).not.toHaveBeenCalled()
      expect(mockRouter.navigate).toHaveBeenCalledWith(['./', 'ws1'], { relativeTo: mockActivatedRoute })
    })

    it('should not report a menu error when the response has no menu result', () => {
      apiServiceSpy.importWorkspaces.and.returnValue(
        of({ id: 'uuid', workspaces: { ws1: ImportResponseStatus.Updated } })
      )

      component.saveWorkspace()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.UPDATED' })
      expect(msgServiceSpy.error).not.toHaveBeenCalled()
    })

    it('should report a menu error but still navigate when workspace is imported and menu failed', () => {
      apiServiceSpy.importWorkspaces.and.returnValue(
        of({
          id: 'uuid',
          workspaces: { ws1: ImportResponseStatus.Updated },
          menus: { ws1: ImportResponseStatus.Error }
        })
      )

      component.saveWorkspace()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.UPDATED' })
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'WORKSPACE_IMPORT.RESPONSE.MENU_ERROR' })
      expect(mockRouter.navigate).toHaveBeenCalledWith(['./', 'ws1'], { relativeTo: mockActivatedRoute })
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

  // The dialog body lives inside `@if (displayDialog)`; the default fixture has it closed, so the
  // step navigation and button states are only reachable by actually opening the dialog. p-dialog
  // has no appendTo here, so its content stays inside fixture.nativeElement and is addressable by id.
  describe('dialog / template rendering', () => {
    const VALID_WS = { name: 'wsp1', displayName: 'Wsp One', theme: 'theme', baseUrl: '/url' } as any

    function button(id: string): HTMLButtonElement {
      const host = fixture.nativeElement.querySelector(`#${id}`)
      if (!host) throw new Error(`host #${id} is not rendered`)
      const inner = host.querySelector('button')
      if (!inner) throw new Error(`inner <button> of #${id} not found`)
      return inner
    }

    function clickButton(id: string): void {
      button(id).click()
    }

    // the component is OnPush: plain property changes are only rendered after it is marked dirty
    function refresh(): void {
      component['cdr'].markForCheck()
      fixture.detectChanges()
    }

    function open(): void {
      fixture.componentRef.setInput('displayDialog', true)
      fixture.detectChanges()
    }

    it('should not render the dialog while it is closed', () => {
      expect(fixture.nativeElement.querySelector('#ws_import_action_close')).toBeNull()
      expect(fixture.nativeElement.querySelector('#ws_import_choose_file_upload')).toBeNull()
    })

    it('should show the choose-file step and hide all navigation buttons', () => {
      open()

      expect(fixture.nativeElement.querySelector('#ws_import_choose_file_upload')).toBeTruthy()
      expect(button('ws_import_action_close').disabled).toBeFalse()
      expect(fixture.nativeElement.querySelector('#ws_import_action_restart')).toBeNull()
      expect(fixture.nativeElement.querySelector('#ws_import_action_back')).toBeNull()
      expect(fixture.nativeElement.querySelector('#ws_import_action_next')).toBeNull()
      expect(fixture.nativeElement.querySelector('#ws_import_action_import')).toBeNull()
    })

    it('should show the preview step and keep NEXT disabled while the form is invalid', () => {
      open()
      // missing displayName => the preview form is invalid
      component.importWorkspace = { name: 'wsp1', baseUrl: '/url' } as any
      component.activeIndex = 1
      refresh()

      expect(fixture.nativeElement.querySelector('#ws_import_preview_workspace_name')).toBeTruthy()
      expect(component.isFormValid).toBeFalse()
      expect(button('ws_import_action_restart').disabled).toBeFalse()
      expect(button('ws_import_action_back').disabled).toBeFalse()
      expect(button('ws_import_action_next').disabled).toBeTrue()
      expect(fixture.nativeElement.querySelector('#ws_import_action_import')).toBeNull()
    })

    it('should enable NEXT once the preview form is valid', () => {
      open()
      component.importWorkspace = VALID_WS
      component.activeIndex = 1
      refresh()

      expect(component.isFormValid).toBeTrue()
      expect(button('ws_import_action_next').disabled).toBeFalse()
    })

    it('should gate the IMPORT button on form validity, permission and loading', () => {
      open()
      component.importWorkspace = VALID_WS
      component.activeIndex = 2
      component.hasPermission = false
      refresh()

      expect(fixture.nativeElement.querySelector('#ws_import_confirm_workspace_name')).toBeTruthy()
      expect(fixture.nativeElement.querySelector('#ws_import_action_next')).toBeNull()
      expect(button('ws_import_action_import').disabled).toBeTrue()

      component.hasPermission = true
      refresh()
      expect(button('ws_import_action_import').disabled).toBeFalse()

      component.handleIsLoading(true)
      refresh()
      expect(button('ws_import_action_import').disabled).toBeTrue()
    })

    it('should reset to the first step when the restart button is clicked', () => {
      open()
      component.importWorkspace = VALID_WS
      component.activeIndex = 2
      refresh()

      clickButton('ws_import_action_restart')
      fixture.detectChanges()

      expect(component.activeIndex).toBe(0)
      expect(fixture.nativeElement.querySelector('#ws_import_choose_file_upload')).toBeTruthy()
    })

    it('should advance one step when the NEXT button is clicked', () => {
      open()
      component.importWorkspace = VALID_WS
      component.activeIndex = 1
      refresh()
      expect(button('ws_import_action_next').disabled).toBeFalse()

      clickButton('ws_import_action_next')

      expect(component.activeIndex).toBe(2)
    })

    it('should go back one step when the BACK button is clicked', () => {
      open()
      component.activeIndex = 2
      refresh()

      clickButton('ws_import_action_back')

      expect(component.activeIndex).toBe(1)
    })

    it('should emit true from the CLOSE button', () => {
      spyOn(component.toggleImportDialogEvent, 'emit')
      open()

      clickButton('ws_import_action_close')

      expect(component.toggleImportDialogEvent.emit).toHaveBeenCalledOnceWith(true)
    })
  })
})
