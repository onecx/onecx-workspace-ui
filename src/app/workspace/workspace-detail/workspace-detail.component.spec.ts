import { NO_ERRORS_SCHEMA /*, Component*/ } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { Location } from '@angular/common'
import { Router } from '@angular/router'
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router'
//import { TranslateService } from '@ngx-translate/core'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { RouterTestingModule } from '@angular/router/testing'

import { of /*, throwError*/ } from 'rxjs'

import { PortalMessageService } from '@onecx/portal-integration-angular'
import { Workspace, WorkspaceAPIService } from 'src/app/shared/generated'

import { WorkspaceDetailComponent } from './workspace-detail.component'
//import { WorkspaceContactComponent } from './workspace-contact/workspace-contact.component'
//import { WorkspacePropsComponent } from './workspace-props/workspace-props.component'

class MockRouter {
  navigate = jasmine.createSpy('navigate')
}

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url'
}

/* 
@Component({ template: '' })
class MockMenuComponent {}
*/
/* 
class MockWorkspacePropsComponent {
  public onSubmit(): void {}
}

class MockWorkspaceContactComponent {
  public onSubmit(): void {}
}
*/
fdescribe('WorkspaceDetailComponent', () => {
  let component: WorkspaceDetailComponent
  let fixture: ComponentFixture<WorkspaceDetailComponent>
  let mockActivatedRoute: Partial<ActivatedRoute>
  let mockRouter = new MockRouter()

  //const translateServiceSpy = jasmine.createSpyObj<TranslateService>('TranslateService', ['get'])
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    getWorkspaceByName: jasmine.createSpy('getWorkspaceByName').and.returnValue(of({})),
    deleteWorkspace: jasmine.createSpy('deleteWorkspace').and.returnValue(of({}))
  }
  /*
  const configServiceSpy = {
    getProperty: jasmine.createSpy('getProperty').and.returnValue('123'),
    lang: 'en'
  }
 */
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
        //{ provide: TranslateService, useValue: translateServiceSpy },
        { provide: Location, useValue: locationSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.getWorkspaceByName.calls.reset()
    apiServiceSpy.deleteWorkspace.calls.reset()
    //translateServiceSpy.get.calls.reset()
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

  it('should create', () => {
    component.workspaceName = 'name'
    expect(component).toBeTruthy()
  })
  /* 
  it('should set German date format', () => {
    configServiceSpy.lang = 'de'

    initializeComponent()

    expect(component.dateFormat).toEqual('dd.MM.yyyy HH:mm:ss')
  })

  it('should set selectedTabIndex onChange', () => {
    const event = {
      index: 1
    }

    component.onTabChange(event)

    expect(component.selectedTabIndex).toEqual(1)
  })
*/
  it('should getWorkspaceData onInit', (done) => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
    spyOn(component, 'prepareDialog')
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
    expect(component.prepareDialog).toHaveBeenCalled()
  })
  /*
  it('should display error msg if get api call fails', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(throwError(() => new Error()))

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'ACTIONS.SEARCH.ERROR',
      detailKey: 'DIALOG.WORKSPACE.NOT_FOUND'
    })
  })

  it('should delete workspace on onConfirmDeleteWorkspace', () => {
    apiServiceSpy.deleteWorkspace.and.returnValue(of({}))
    component.workspaceExportVisible = true

    component.onConfirmDeleteWorkspace()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE_OK' })
    expect(component.workspaceExportVisible).toBeFalse()
  })

  it('should display error msg if delete api call fails', () => {
    apiServiceSpy.deleteWorkspace.and.returnValue(throwError(() => new Error()))

    component.onConfirmDeleteWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'ACTIONS.DELETE.MESSAGE_NOK'
    })
  })

  it('should export a workspace', () => {
    component.workspace = workspace
    component.exportMenu = true
    component.onExportWorkspace()

    expect(component.workspaceExportVisible).toBeFalse()
  })

  it('should display error if portalNotFound on export', () => {
    component.workspace = undefined

    component.onExportWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'DETAIL.WORKSPACE_NOT_FOUND'
    })
  })

  it('should have prepared action buttons onInit: close', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
    component.ngOnInit()
    let actions: any = []
    component.actions$!.subscribe((act) => (actions = act))

    actions[0].actionCallback()

    expect(locationSpy.back).toHaveBeenCalled()
  })

  it('should have prepared action buttons onInit: onGoToMenu', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
    spyOn(component, 'onGoToMenu')
    component.ngOnInit()
    let actions: any = []
    component.actions$!.subscribe((act) => (actions = act))

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

  it('should have prepared action buttons onInit: updatePortal props', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
    component.workspacePropsComponent = new MockWorkspacePropsComponent() as unknown as WorkspacePropsComponent
    component.selectedTabIndex = 0
    component.ngOnInit()
    let actions: any = []
    component.actions$!.subscribe((act) => (actions = act))

    actions[3].actionCallback()

    expect(component.editMode).toBeFalse()
  })

  it('should have prepared action buttons onInit: updatePortal contact', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of([workspace]))
    component.workspaceContactComponent = new MockWorkspaceContactComponent() as unknown as WorkspaceContactComponent
    component.selectedTabIndex = 1
    component.ngOnInit()
    let actions: any = []
    component.actions$!.subscribe((act) => (actions = act))

    actions[3].actionCallback()

    expect(component.editMode).toBeFalse()
  })

  it('should have prepared action buttons onInit: updateworkspace: default', () => {
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
    component.ngOnInit()
    let actions: any = []
    component.actions$!.subscribe((act) => (actions = act))

    actions[4].actionCallback()

    expect(component.workspaceExportVisible).toBeTrue()
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

  it('should correctly navigate on onGoToMenu', () => {
    component.onGoToMenu()

    expect(mockRouter.navigate).toHaveBeenCalledWith(['./menu'], { relativeTo: mockActivatedRoute })
  })
 */
})
