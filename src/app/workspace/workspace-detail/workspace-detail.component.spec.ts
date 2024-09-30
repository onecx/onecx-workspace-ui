import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { Location } from '@angular/common'
import { Router } from '@angular/router'
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { RouterTestingModule } from '@angular/router/testing'

import { of, BehaviorSubject, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import { Workspace, WorkspaceAPIService } from 'src/app/shared/generated'

import { WorkspaceDetailComponent } from './workspace-detail.component'
import { WorkspaceContactComponent } from './workspace-contact/workspace-contact.component'
import { WorkspacePropsComponent } from './workspace-props/workspace-props.component'

class MockRouter {
  navigate = jasmine.createSpy('navigate')
}

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  displayName: ''
}

class MockWorkspacePropsComponent {
  public onSave(): void {}
}

class MockWorkspaceContactComponent {
  public onSave(): void {}
}

describe('WorkspaceDetailComponent', () => {
  let component: WorkspaceDetailComponent
  let fixture: ComponentFixture<WorkspaceDetailComponent>
  const mockRouter = new MockRouter()
  let mockUserService: any

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    getWorkspaceByName: jasmine.createSpy('getWorkspaceByName').and.returnValue(of({})),
    deleteWorkspace: jasmine.createSpy('deleteWorkspace').and.returnValue(of({})),
    exportWorkspaces: jasmine.createSpy('exportWorkspaces').and.returnValue(of({})),
    updateWorkspace: jasmine.createSpy('updateWorkspace').and.returnValue(of({}))
  }

  const locationSpy = jasmine.createSpyObj<Location>('Location', ['back'])

  const mockActivatedRouteSnapshot: Partial<ActivatedRouteSnapshot> = {
    params: {
      id: 'mockId'
    }
  }
  const mockActivatedRoute: Partial<ActivatedRoute> = {
    snapshot: mockActivatedRouteSnapshot as ActivatedRouteSnapshot
  }

  beforeEach(waitForAsync(() => {
    mockUserService = { lang$: new BehaviorSubject('de') }
    TestBed.configureTestingModule({
      declarations: [WorkspaceDetailComponent],
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy },
        { provide: Location, useValue: locationSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.getWorkspaceByName.calls.reset()
    apiServiceSpy.deleteWorkspace.calls.reset()
    apiServiceSpy.exportWorkspaces.calls.reset()
    apiServiceSpy.updateWorkspace.calls.reset()
    locationSpy.back.calls.reset()
  }))

  function initializeComponent(): void {
    fixture = TestBed.createComponent(WorkspaceDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(() => {
    initializeComponent()
  })

  describe('initial setup', () => {
    it('should set English date format', () => {
      mockUserService.lang$.next('en')
      initializeComponent()

      expect(component.dateFormat).toEqual('medium')
    })

    describe('onTabChange', () => {
      it('should set selectedTabIndex onChange', (done) => {
        const event = {
          index: 1
        }
        apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
        component.workspaceName = 'name'

        component.getWorkspace()

        component.workspace$.subscribe({
          next: (data) => {
            expect(data.resource).toEqual(workspace)
            done()
          },
          error: done.fail
        })

        component.onTabChange(event, component.workspace)

        expect(component.selectedTabIndex).toEqual(1)
      })

      it('should set workspace for roles', () => {
        const event = {
          index: 3
        }

        component.onTabChange(event, component.workspace)

        expect(component.workspaceForRoles).toBe(workspace)
      })

      it('should set workspace for slots', () => {
        const event = {
          index: 4
        }

        component.onTabChange(event, component.workspace)

        expect(component.workspaceForSlots).toBe(workspace)
      })

      it('should set workspace for products', () => {
        const event = {
          index: 5
        }

        component.onTabChange(event, component.workspace)

        expect(component.workspaceForProducts).toBe(workspace)
      })
    })
  })

  describe('search workspace Data', () => {
    it('should getWorkspaceData onInit', (done) => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
      spyOn(component, 'prepareActionButtons')
      component.workspaceName = 'name'

      component.getWorkspace()

      component.workspace$.subscribe({
        next: (data) => {
          expect(data.resource).toEqual(workspace)
          done()
        },
        error: done.fail
      })
      expect(component.isLoading).toBeFalsy()
      expect(component.prepareActionButtons).toHaveBeenCalled()
    })

    it('should display error msg if get api call fails', (done) => {
      const err = {
        status: '404'
      }
      apiServiceSpy.getWorkspaceByName.and.returnValue(throwError(() => err))

      component.getWorkspace()

      component.workspace$.subscribe({
        next: () => {
          done()
        },
        error: done.fail
      })

      expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_' + err.status + '.WORKSPACE')
    })
  })

  describe('delete   workspace Data', () => {
    it('should delete workspace on onConfirmDeleteWorkspace', () => {
      apiServiceSpy.deleteWorkspace.and.returnValue(of({}))

      component.onConfirmDeleteWorkspace()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE_OK' })
    })

    it('should delete workspace on onConfirmDeleteWorkspace: no workspace', () => {
      apiServiceSpy.deleteWorkspace.and.returnValue(of({}))
      component.workspace = undefined

      component.onConfirmDeleteWorkspace()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE_OK' })
    })

    it('should display error msg if delete api call fails', () => {
      apiServiceSpy.deleteWorkspace.and.returnValue(throwError(() => new Error()))

      component.onConfirmDeleteWorkspace()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({
        summaryKey: 'ACTIONS.DELETE.MESSAGE_NOK'
      })
    })
  })

  it('should display error if portalNotFound on export', () => {
    component.workspace = undefined

    component.onExportWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'DIALOG.WORKSPACE.NOT_FOUND'
    })
  })

  describe('get logoUrl', () => {
    it('should return the logoURL on getLogoUrl', () => {
      const result = component.getLogoUrl({ name: 'name', displayName: 'name', logoUrl: 'url' })

      expect(result).toBe('url')
    })
  })

  describe('onUpdateLogoUrl', () => {
    it('should set current logo url', () => {
      component.onUpdateLogoUrl('url')

      expect(component.currentLogoUrl).toBe('url')
    })
  })

  describe('test action buttons', () => {
    it('should have prepared action buttons onInit: close', () => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[0].actionCallback()

      expect(locationSpy.back).toHaveBeenCalled()
    })

    it('should have prepared action buttons onInit: onGoToMenu', () => {
      component.workspace = workspace
      spyOn(component, 'onGoToMenu')

      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))
      component.editMode = false

      actions[1].actionCallback()

      expect(component.onGoToMenu).toHaveBeenCalled()
    })

    it('should have prepared action buttons onInit: toggleEditMode', () => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
      component.editMode = false
      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[2].actionCallback()

      expect(component.editMode).toBeTrue()
    })

    it('should have prepared action buttons onInit: update workspace props', () => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
      component.workspacePropsComponent = new MockWorkspacePropsComponent() as unknown as WorkspacePropsComponent
      component.selectedTabIndex = 0
      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[3].actionCallback()

      expect(component.editMode).toBeFalse()
    })

    it('should have prepared action buttons onInit: update workspace contact', () => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
      component.workspaceContactComponent = new MockWorkspaceContactComponent() as unknown as WorkspaceContactComponent
      component.selectedTabIndex = 1
      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[3].actionCallback()

      expect(component.editMode).toBeFalse()
    })

    it('should have prepared action buttons onInit: update workspace: default', () => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
      component.selectedTabIndex = 99
      spyOn(console, 'error')
      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[3].actionCallback()

      expect(console.error).toHaveBeenCalledWith("Couldn't assign tab to component")
    })

    it('should have prepared action buttons onInit: workspaceExportVisible', () => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
      spyOn(component, 'onExportWorkspace')

      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[4].actionCallback()

      expect(component.onExportWorkspace).toHaveBeenCalled()
    })

    it('should have prepared action buttons onInit: toggleEditMode', () => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
      const toggleEditModeSpy = spyOn<any>(component, 'toggleEditMode').and.callThrough()
      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[5].actionCallback()

      expect(toggleEditModeSpy).toHaveBeenCalled()
    })

    it('should have prepared action buttons onInit: workspaceDeleteVisible', () => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[6].actionCallback()

      expect(component.workspaceDeleteVisible).toBeTrue()
    })
  })

  describe('update workspace data', () => {
    it('it should display error on update workspace', (done) => {
      apiServiceSpy.updateWorkspace.and.returnValue(of(workspace))
      component.selectedTabIndex = 99
      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[3].actionCallback()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_OK' })
      component.workspace$.subscribe((data) => {
        expect(data).toEqual({ resource: workspace })
        done()
      })
    })

    it('it should display error on update workspace', () => {
      apiServiceSpy.updateWorkspace.and.returnValue(throwError(() => new Error()))
      component.selectedTabIndex = 99
      spyOn(console, 'error')
      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[3].actionCallback()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_NOK' })
    })
  })

  describe('test navigation', () => {
    it('should correctly navigate on onGoToMenu', () => {
      component.onGoToMenu()

      expect(mockRouter.navigate).toHaveBeenCalledWith(['./menu'], { relativeTo: mockActivatedRoute })
    })
  })
})
