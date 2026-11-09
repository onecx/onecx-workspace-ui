import { Location } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { ActivatedRoute } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, BehaviorSubject, throwError } from 'rxjs'

import { PortalMessageService, UserService, WorkspaceService } from '@onecx/angular-integration-interface'

import { Workspace, WorkspaceAPIService } from 'src/app/shared/generated'

import { WorkspaceDetailComponent } from './workspace-detail.component'
import { WorkspaceContactComponent } from './workspace-contact/workspace-contact.component'
import { WorkspacePropsComponent } from './workspace-props/workspace-props.component'
import { WorkspaceInternComponent } from './workspace-intern/workspace-intern.component'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { providePermissionService } from '@onecx/angular-utils'
import { BreadcrumbService } from '@onecx/angular-accelerator'
import { provideAppStateServiceMock } from '@onecx/angular-integration-interface/mocks'

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  displayName: ''
}
type TabData = Partial<Workspace> | undefined

describe('WorkspaceDetailComponent', () => {
  let component: WorkspaceDetailComponent
  let fixture: ComponentFixture<WorkspaceDetailComponent>

  // each tab returns its part of the workspace or undefined if its form is invalid
  function mockTabs(props: TabData, contact: TabData, intern: TabData): void {
    component.workspacePropsComponent = { onSave: () => props } as unknown as WorkspacePropsComponent
    component.workspaceContactComponent = { onSave: () => contact } as unknown as WorkspaceContactComponent
    component.workspaceInternComponent = { onSave: () => intern } as unknown as WorkspaceInternComponent
  }

  function triggerSave(): void {
    let actions: any = []
    component.actions$!.subscribe((act) => (actions = act))
    actions[3].actionCallback()
  }

  function initializeComponent(): void {
    fixture = TestBed.createComponent(WorkspaceDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    getWorkspaceByName: jasmine.createSpy('getWorkspaceByName').and.returnValue(of({})),
    deleteWorkspace: jasmine.createSpy('deleteWorkspace').and.returnValue(of({})),
    exportWorkspaces: jasmine.createSpy('exportWorkspaces').and.returnValue(of({})),
    updateWorkspace: jasmine.createSpy('updateWorkspace').and.returnValue(of({}))
  }
  const locationSpy = jasmine.createSpyObj<Location>('Location', ['back'])
  const mockUserService = {
    lang$: new BehaviorSubject<string>('de'),
    getPermission: jasmine.createSpy('getPermission').and.returnValue(Promise.resolve(true)),
    getPermissions: jasmine
      .createSpy('getPermissions')
      .and.returnValue(
        of([
          'WORKSPACE#EDIT',
          'WORKSPACE#VIEW',
          'WORKSPACE_CONTACT#VIEW',
          'WORKSPACE_INTERNAL#VIEW',
          'WORKSPACE_PRODUCTS#VIEW',
          'WORKSPACE_ROLE#VIEW',
          'WORKSPACE_SLOT#VIEW'
        ])
      ),
    hasPermission: jasmine.createSpy('hasPermission').and.callFake((permission) => {
      return [
        'WORKSPACE#EDIT',
        'WORKSPACE#VIEW',
        'WORKSPACE_CONTACT#VIEW',
        'WORKSPACE_INTERNAL#VIEW',
        'WORKSPACE_ROLE#VIEW',
        'WORKSPACE_SLOT#VIEW',
        'WORKSPACE_PRODUCTS#VIEW'
      ].includes(permission)
    })
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        WorkspaceDetailComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAppStateServiceMock(),
        providePermissionService(),
        provideNoopAnimations(),
        // real child components check endpoints on creation; without a stub they log "Routing not possible"
        { provide: WorkspaceService, useValue: { doesUrlExistFor: () => of(true), getUrl: () => of('/url') } },
        provideRouter([{ path: '', component: WorkspaceDetailComponent }])
      ]
    })
      .overrideComponent(WorkspaceDetailComponent, {
        add: {
          providers: [
            { provide: BreadcrumbService, useValue: {} },
            { provide: UserService, useValue: mockUserService },
            { provide: PortalMessageService, useValue: msgServiceSpy },
            { provide: WorkspaceAPIService, useValue: apiServiceSpy },
            { provide: Location, useValue: locationSpy }
          ]
        }
      })
      .compileComponents()

    // to spy data: reset
    locationSpy.back.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.getWorkspaceByName.calls.reset()
    apiServiceSpy.deleteWorkspace.calls.reset()
    apiServiceSpy.exportWorkspaces.calls.reset()
    apiServiceSpy.updateWorkspace.calls.reset()
    // to spy data: refill with neutral data
    apiServiceSpy.getWorkspaceByName.and.returnValue(of({}))

    // setup router spies based on provided Router instance
    const router = TestBed.inject(Router)
    // fake router navigation
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true))
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true))
  }))

  beforeEach(() => {
    initializeComponent()
  })

  describe('initial setup', () => {
    it('should set English date format', () => {
      mockUserService.lang$.next('en')
      initializeComponent()

      expect(component.dateFormat).toEqual('M/d/yy, hh:mm:ss a')
    })

    describe('onTabChange', () => {
      it('should set selectedTabIndex onChange', (done) => {
        apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
        component.workspaceName = 'name'

        component.getWorkspace(true)

        component.workspace$.subscribe({
          next: (data) => {
            expect(data).toEqual(workspace)
            done()
          },
          error: done.fail
        })

        component.onTabChange('1', component.workspace)
        expect(component.selectedTabIndex).toEqual('1')

        component.onTabChange('3', component.workspace)
        expect(component.workspaceForRoles).toBe(workspace)

        component.onTabChange('4', component.workspace)
        expect(component.workspaceForSlots).toBe(workspace)

        component.onTabChange('5', component.workspace)
        expect(component.workspaceForProducts).toBe(workspace)
      })

      it('should convert a numeric tab value to its string form', () => {
        component.workspace = workspace

        // a number (not a string) tab value exercises the `tabValue.toString()` side of the ternary
        component.onTabChange(1, workspace)

        expect(component.selectedTabIndex).toEqual('1')
      })

      it('should reset selectedTabIndex to 0 when no workspace is provided', () => {
        component.selectedTabIndex = '5'

        // a falsy workspace takes the `else` branch instead of the tab-specific assignments
        component.onTabChange('0')

        expect(component.selectedTabIndex).toEqual('0')
      })
    })
  })

  describe('search workspace Data and go to roles', () => {
    it('should getWorkspaceData onInit', (done) => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
      spyOn(component, 'preparePageActions')
      spyOn(component, 'onTabChange')
      component.workspaceName = 'name'
      component.uriFragment = 'roles'

      component.getWorkspace()

      component.workspace$.subscribe({
        next: (data) => {
          expect(data).toEqual(workspace)
          done()
        },
        error: done.fail
      })
      expect(component.loading).toBeFalsy()
      expect(component.preparePageActions).toHaveBeenCalled()
      expect(component.onTabChange).toHaveBeenCalled()
    })

    it('should display error msg if get api call fails', (done) => {
      const errorResponse = { status: 404, statusText: 'Workspace not found' }
      apiServiceSpy.getWorkspaceByName.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.getWorkspace()

      component.workspace$.subscribe({
        next: () => {
          done()
        },
        error: () => {
          expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.WORKSPACE')
          expect(console.error).toHaveBeenCalledWith('getWorkspaceByName', errorResponse)
          done.fail
        }
      })
    })
  })

  describe('delete   workspace Data', () => {
    it('should delete workspace on onConfirmDeleteWorkspace', () => {
      apiServiceSpy.deleteWorkspace.and.returnValue(of({}))

      component.onConfirmDeleteWorkspace()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.WORKSPACE.MESSAGE.OK' })
    })

    it('should delete workspace on onConfirmDeleteWorkspace: no workspace', () => {
      apiServiceSpy.deleteWorkspace.and.returnValue(of({}))
      component.workspace = undefined

      component.onConfirmDeleteWorkspace()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.WORKSPACE.MESSAGE.OK' })
    })

    it('should display error msg if delete api call fails', () => {
      const errorResponse = { status: 400, statusText: 'Error on deleting a workspace' }
      apiServiceSpy.deleteWorkspace.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onConfirmDeleteWorkspace()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.WORKSPACE.MESSAGE.NOK' })
      expect(console.error).toHaveBeenCalledWith('deleteWorkspace', errorResponse)
    })
  })

  it('should display error if workspaceNotFound on export', () => {
    component.workspace = undefined

    component.onExportWorkspace()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'DIALOG.WORKSPACE.NOT_FOUND'
    })
  })

  it('should open export dialog', () => {
    component.workspace = workspace

    component.onExportWorkspace()

    expect(component.workspaceExportVisible).toBeTrue()
  })

  it('should on product changes', () => {
    component.workspaceForSlots = { name: '', displayName: '' }
    component.workspace = workspace

    component.onProductChanges()

    expect(component.workspaceForSlots).toEqual(workspace)
  })

  describe('get logoUrl', () => {
    it('should return the logoURL on getLogoUrl', () => {
      const result = component.getLogoUrl({ name: 'name', displayName: 'name', logoUrl: 'url' })

      expect(result).toBe('url')
    })
  })

  describe('onUpdateHeaderImageUrl', () => {
    it('should set current logo url', () => {
      component.onUpdateHeaderImageUrl('url')

      expect(component.currentLogoUrl).toBe('url')
    })
  })

  describe('test action buttons', () => {
    it('should have prepared action buttons onInit: close', () => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
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
      apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
      component.editMode = false
      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[2].actionCallback()

      expect(component.editMode).toBeTrue()
    })

    it('should have prepared action buttons onInit: workspaceExportVisible', () => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
      spyOn(component, 'onExportWorkspace')

      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[4].actionCallback()

      expect(actions[4].icon).toEqual('pi pi-download')
      expect(component.onExportWorkspace).toHaveBeenCalled()
    })

    it('should have prepared action buttons onInit: toggleEditMode', () => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
      const toggleEditModeSpy = spyOn<any>(component, 'toggleEditMode').and.callThrough()
      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[5].actionCallback()

      expect(toggleEditModeSpy).toHaveBeenCalled()
    })

    it('should have prepared action buttons onInit: workspaceDeleteVisible', () => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
      component.ngOnInit()
      let actions: any = []
      component.actions$!.subscribe((act) => (actions = act))

      actions[6].actionCallback()

      expect(component.workspaceDeleteVisible).toBeTrue()
    })
  })

  describe('update workspace data', () => {
    const propsData = { displayName: 'props name', baseUrl: '/props', theme: 'props theme' }
    const contactData = { companyName: 'company', address: { city: 'city' } }
    const internData = { mandatory: true, disabled: false }

    beforeEach(() => {
      apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
      apiServiceSpy.updateWorkspace.and.returnValue(of(workspace))
      component.ngOnInit()
      component.workspace = workspace
      component.editMode = true
      spyOn(console, 'error')
    })

    it('should send the combined data of all tabs', () => {
      mockTabs(propsData, contactData, internData)

      triggerSave()

      expect(apiServiceSpy.updateWorkspace).toHaveBeenCalledWith({
        id: workspace.id,
        updateWorkspaceRequest: {
          resource: {
            id: workspace.id,
            name: workspace.name,
            ...propsData,
            ...contactData,
            ...internData,
            logoUrl: undefined,
            smallLogoUrl: undefined
          }
        }
      })
    })

    it('should send undefined logo urls when they are empty', () => {
      mockTabs({ ...propsData, logoUrl: '', smallLogoUrl: '' }, contactData, internData)

      triggerSave()

      const resource = apiServiceSpy.updateWorkspace.calls.mostRecent().args[0].updateWorkspaceRequest.resource
      expect(resource.logoUrl).toBeUndefined()
      expect(resource.smallLogoUrl).toBeUndefined()
    })

    it('should keep logo urls when they are set', () => {
      mockTabs({ ...propsData, logoUrl: 'https://logo', smallLogoUrl: 'https://small' }, contactData, internData)

      triggerSave()

      const resource = apiServiceSpy.updateWorkspace.calls.mostRecent().args[0].updateWorkspaceRequest.resource
      expect(resource.logoUrl).toBe('https://logo')
      expect(resource.smallLogoUrl).toBe('https://small')
    })

    it('should display message, leave edit mode and take over the response when update succeeds', (done) => {
      const saved = { ...workspace, displayName: 'saved' }
      apiServiceSpy.updateWorkspace.and.returnValue(of(saved))
      mockTabs(propsData, contactData, internData)

      triggerSave()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.WORKSPACE.OK' })
      expect(component.editMode).toBeFalse()
      expect(component.workspace).toBe(saved)
      component.workspace$.subscribe((data) => {
        expect(data).toEqual(saved)
        done()
      })
    })

    it('should display error when update fails', () => {
      const errorResponse = { status: 400, statusText: 'Error on updating a workspace' }
      apiServiceSpy.updateWorkspace.and.returnValue(throwError(() => errorResponse))
      mockTabs(propsData, contactData, internData)

      triggerSave()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.WORKSPACE.NOK' })
      expect(console.error).toHaveBeenCalledWith('updateWorkspace', errorResponse)
      expect(component.editMode).toBeTrue()
    })

    it('should not update when the props tab is invalid', () => {
      mockTabs(undefined, contactData, internData)

      triggerSave()

      expect(apiServiceSpy.updateWorkspace).not.toHaveBeenCalled()
      expect(component.editMode).toBeTrue()
    })

    it('should not update when the contact tab is invalid', () => {
      mockTabs(propsData, undefined, internData)

      triggerSave()

      expect(apiServiceSpy.updateWorkspace).not.toHaveBeenCalled()
      expect(component.editMode).toBeTrue()
    })

    it('should not update when the intern tab is invalid', () => {
      mockTabs(propsData, contactData, undefined)

      triggerSave()

      expect(apiServiceSpy.updateWorkspace).not.toHaveBeenCalled()
      expect(component.editMode).toBeTrue()
    })

    it('should not update when no workspace is loaded', () => {
      component.workspace = undefined
      mockTabs(propsData, contactData, internData)

      triggerSave()

      expect(apiServiceSpy.updateWorkspace).not.toHaveBeenCalled()
    })

    it('should not update when the workspace has no id', () => {
      component.workspace = { ...workspace, id: undefined }
      mockTabs(propsData, contactData, internData)

      triggerSave()

      expect(apiServiceSpy.updateWorkspace).not.toHaveBeenCalled()
    })
  })

  describe('test navigation', () => {
    it('should correctly navigate on onGoToMenu', () => {
      const router = TestBed.inject(Router)
      const route = TestBed.inject(ActivatedRoute)
      component.onGoToMenu()

      expect(router.navigate).toHaveBeenCalledWith(['./menu'], { relativeTo: route })
    })
  })
})
