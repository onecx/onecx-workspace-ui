import { NO_ERRORS_SCHEMA, SimpleChanges } from '@angular/core'
import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateService } from '@ngx-translate/core'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { SlotService } from '@onecx/angular-remote-components'
import { PortalMessageService, UserService, WorkspaceService } from '@onecx/angular-integration-interface'

import { Workspace, WorkspaceRole, WorkspaceRolesAPIService, WorkspaceRolePageResult } from 'src/app/shared/generated'

import { IAMRole, Role, slotInitializer, WorkspaceRolesComponent } from './workspace-roles.component'

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  displayName: ''
}

const wRole: Role = {
  name: 'role name',
  id: 'role id',
  description: 'role descr',
  isWorkspaceRole: false,
  isIamRole: false,
  type: 'WORKSPACE'
}

describe('WorkspaceRolesComponent', () => {
  let component: WorkspaceRolesComponent
  let fixture: ComponentFixture<WorkspaceRolesComponent>

  function initTestComponent(): void {
    fixture = TestBed.createComponent(WorkspaceRolesComponent)
    component = fixture.componentInstance
    component.workspace = workspace
    fixture.detectChanges()
  }

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const wRoleServiceSpy = {
    searchWorkspaceRoles: jasmine.createSpy('searchWorkspaceRoles').and.returnValue(of({})),
    createWorkspaceRole: jasmine.createSpy('createWorkspaceRole').and.returnValue(of({})),
    deleteWorkspaceRole: jasmine.createSpy('deleteWorkspaceRole').and.returnValue(of({}))
  }
  const iamRoleServiceSpy = {
    searchAvailableRoles: jasmine.createSpy('searchAvailableRoles').and.returnValue(of({}))
  }
  const slotServiceSpy = {
    isSomeComponentDefinedForSlot: jasmine.createSpy('isSomeComponentDefinedForSlot').and.returnValue(of(true))
  }
  const workspaceServiceSpy = jasmine.createSpyObj<WorkspaceService>('WorkspaceService', ['doesUrlExistFor', 'getUrl'])
  const mockUserService = jasmine.createSpyObj('UserService', ['hasPermission'])
  mockUserService.hasPermission.and.callFake((permission: string) => {
    return ['WORKSPACE_ROLE#EDIT', 'WORKSPACE_ROLE#CREATE', 'WORKSPACE_ROLE#DELETE'].includes(permission)
  })

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceRolesComponent],
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
        { provide: SlotService, useValue: slotServiceSpy },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceRolesAPIService, useValue: wRoleServiceSpy },
        { provide: WorkspaceService, useValue: workspaceServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    initTestComponent()

    // to spy data: reset
    slotServiceSpy.isSomeComponentDefinedForSlot.calls.reset()
    wRoleServiceSpy.searchWorkspaceRoles.calls.reset()
    wRoleServiceSpy.createWorkspaceRole.calls.reset()
    wRoleServiceSpy.deleteWorkspaceRole.calls.reset()
    iamRoleServiceSpy.searchAvailableRoles.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    // to spy data: refill with neutral data
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({}))
    // used in ngOnChanges
    workspaceServiceSpy.doesUrlExistFor.and.returnValue(of(true))
  })

  describe('initialize', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })
  })

  describe('slotInitializer', () => {
    let slotService: jasmine.SpyObj<SlotService>

    beforeEach(() => {
      slotService = jasmine.createSpyObj('SlotService', ['init'])
    })

    it('should call SlotService.init', () => {
      const initializer = slotInitializer(slotService)
      initializer()

      expect(slotService.init).toHaveBeenCalled()
    })
  })

  describe('search WORKSPACE roles', () => {
    it('should populate wRoles on search', fakeAsync(() => {
      const wRoles: WorkspaceRole[] = [{ name: 'role' }]
      wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: wRoles as WorkspaceRolePageResult }))
      const changes = { ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true } }
      component.quickFilterValue = 'WORKSPACE'

      component.ngOnChanges(changes as unknown as SimpleChanges)

      expect(component.wRoles).toEqual(wRoles)
      expect(component.roles.length).toEqual(wRoles.length)

      component.loadingIamRoles = true
      tick(5000)
      fixture.detectChanges()
      expect(component.loadingIamRoles).toEqual(false)
    }))

    it('should populate wRoles on search: empty stream', () => {
      wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({}))
      const changes = { ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true } }
      component.quickFilterValue = 'WORKSPACE'

      component.ngOnChanges(changes as unknown as SimpleChanges)

      expect(component.wRoles).toEqual([])
    })

    it('should populate wRoles on search: empty array', () => {
      wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: [] as WorkspaceRolePageResult }))
      const changes = { ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true } }
      component.quickFilterValue = 'WORKSPACE'

      component.ngOnChanges(changes as unknown as SimpleChanges)

      expect(component.wRoles).toEqual([])
    })

    it('should display error', () => {
      const errorResponse = { status: 404, statusText: 'Workspace roles not found' }
      wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(throwError(() => errorResponse))
      const changes = { ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true } }
      component.quickFilterValue = 'WORKSPACE'
      spyOn(console, 'error')

      component.ngOnChanges(changes as unknown as SimpleChanges)

      expect(console.error).toHaveBeenCalledWith('searchAvailableRoles', errorResponse)
      expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.WS_ROLES')
    })
  })

  describe('search IAM roles', () => {
    it('should init slot and emitter', () => {
      const changes = { ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true } }
      const iamRoles: IAMRole[] = [{ name: 'role1' }, { name: 'role2' }]
      component.quickFilterValue = 'IAM'
      component.isComponentDefined = false
      slotServiceSpy.isSomeComponentDefinedForSlot.and.returnValue(of(true))

      component.ngOnChanges(changes as unknown as SimpleChanges)
      component.roleListEmitter.emit(iamRoles)

      expect(component.roles[0].name).toEqual(iamRoles[0].name)
      expect(component.iamRoles.length).toBe(2)
      expect(component.iamRoles[0]).toEqual(iamRoles[0])
      expect(component.iamRoles[1]).toEqual(iamRoles[1])
    })
  })

  describe('search ALL roles', () => {
    it('should combine roles', () => {
      const changes = { ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true } }
      const wRoles: WorkspaceRole[] = [{ name: 'role1', description: 'desc' }, { description: 'desc' }]
      wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: wRoles as WorkspaceRolePageResult }))
      const iamRoles: IAMRole[] = [
        { name: 'role1' },
        { name: 'role2' },
        { description: 'desc3' },
        { description: 'desc4' }
      ]
      component.quickFilterValue = 'ALL'
      component.isComponentDefined = false
      slotServiceSpy.isSomeComponentDefinedForSlot.and.returnValue(of(true))

      component.ngOnChanges(changes as unknown as SimpleChanges)
      component.roleListEmitter.emit(iamRoles)

      expect(component.wRoles).toEqual(wRoles)
      expect(component.iamRoles.length).toBe(4)
      expect(component.iamRoles[0]).toEqual(iamRoles[0])
      expect(component.iamRoles[1]).toEqual(iamRoles[1])
    })
  })

  it('should behave correctly onReload', () => {
    spyOn(component as any, 'searchRoles')

    component.quickFilterValue = 'ALL'
    component.onReload()

    expect(component.roles).toEqual([])
    expect(component.wRolesLoaded).toBeFalse()
    expect(component.iamRolesLoaded).toBeFalse()
    expect((component as any).searchRoles).toHaveBeenCalled()
  })

  describe('manage role', () => {
    it('should create a role onAddRole', () => {
      wRoleServiceSpy.createWorkspaceRole.and.returnValue(of({ id: 'newRoleId' }))
      const mockEvent = new MouseEvent('click')
      component.workspace = {
        name: 'name',
        displayName: 'name',
        theme: 'theme',
        baseUrl: '/some/base/url'
      }

      component.onAddRole(mockEvent, wRole)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ROLE_OK' })
    })

    it('should display error when creating a role onAddRole', () => {
      const errorResponse = { status: 400, statusText: 'Error on creating a workspace role' }
      wRoleServiceSpy.createWorkspaceRole.and.returnValue(throwError(() => errorResponse))
      const mockEvent = new MouseEvent('click')
      spyOn(console, 'error')

      component.onAddRole(mockEvent, wRole)

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ROLE_NOK' })
      expect(console.error).toHaveBeenCalledWith('createWorkspaceRole', errorResponse)
    })

    it('should set properties for creating a new role', () => {
      const eventMock: MouseEvent = new MouseEvent('click')
      spyOn(eventMock, 'stopPropagation')

      component.onCreateRole(eventMock)

      expect(eventMock.stopPropagation).toHaveBeenCalled()
      expect(component.role).toBeUndefined()
      expect(component.changeMode).toEqual('CREATE')
      expect(component.showRoleDetailDialog).toBeTrue()
    })

    it('should set properties for editing an existing role: is ws role', () => {
      wRole.isWorkspaceRole = true
      const eventMock = new Event('click')
      spyOn(eventMock, 'stopPropagation')
      component.hasEditPermission = true

      component.onEditRole(eventMock, wRole)

      expect(eventMock.stopPropagation).toHaveBeenCalled()
      expect(component.role).toEqual(wRole)
      expect(component.changeMode).toEqual('EDIT')
      expect(component.showRoleDetailDialog).toBeTrue()
    })

    it('should set properties for editing an existing role: is not ws role', () => {
      wRole.isWorkspaceRole = false
      const eventMock = new Event('click')
      spyOn(eventMock, 'stopPropagation')
      component.hasEditPermission = true

      component.onEditRole(eventMock, wRole)

      expect(eventMock.stopPropagation).toHaveBeenCalled()
      expect(component.role).toEqual(wRole)
      expect(component.changeMode).toEqual('VIEW')
      expect(component.showRoleDetailDialog).toBeTrue()
    })

    it('should set properties for deleting a role: edit permission', () => {
      const eventMock = new Event('click')
      spyOn(eventMock, 'stopPropagation')
      component.hasEditPermission = true

      component.onDeleteRole(eventMock, wRole)

      expect(eventMock.stopPropagation).toHaveBeenCalled()
      expect(component.role).toEqual(wRole)
      expect(component.changeMode).toEqual('DELETE')
      expect(component.showRoleDeleteDialog).toBeTrue()
    })

    it('should set properties for deleting a role: no edit permission', () => {
      const eventMock = new Event('click')
      component.hasEditPermission = false

      component.onDeleteRole(eventMock, wRole)

      expect(component.changeMode).not.toEqual('DELETE')
    })

    it('should reset properties and optionally trigger role search on role change', () => {
      component.wRoles$ = of([])

      component.onRoleChanged(true)

      expect(component.role).toBeUndefined()
      expect(component.changeMode).toEqual('VIEW')
      expect(component.showRoleDetailDialog).toBeFalse()
      expect(component.showRoleDeleteDialog).toBeFalse()
    })
  })

  describe('filtering', () => {
    it('should reset filter to default when ALL is selected', () => {
      const dv = jasmine.createSpyObj('DataView', ['filter'])
      component.onQuickFilterChange({ value: 'ALL' }, dv)

      expect(component.filterBy).toEqual('name,type')
      expect(component.quickFilterValue).toEqual('ALL')
    })

    it('should set filter by specific type', () => {
      const dv = jasmine.createSpyObj('DataView', ['filter'])
      component.onQuickFilterChange({ value: 'IAM' }, dv)

      expect(component.filterBy).toEqual('type')
      expect(component.quickFilterValue).toEqual('IAM')
    })

    it('should set filterBy to name,type when filter is empty', () => {
      const dv = jasmine.createSpyObj('DataView', ['filter'])
      component.onFilterChange('', dv)

      expect(component.filterBy).toEqual('name,type')
    })

    it('should call filter method with "contains" when filter has a value', () => {
      const dv = jasmine.createSpyObj('DataView', ['filter'])

      component.onFilterChange('testFilter', dv)
    })

    it('should quick filter after searching', () => {
      const wRoles: WorkspaceRole[] = [{ name: 'role1', description: 'desc' }]
      wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: wRoles as WorkspaceRolePageResult }))
      const changes = { ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true } }
      component.quickFilterValue = 'ALL' // load all

      component.ngOnChanges(changes as unknown as SimpleChanges)

      expect(component.wRoles.length).toEqual(1)
      expect(component.iamRoles.length).toEqual(0)

      expect(component.onGetQuickFilterCount('IAM')).toEqual('0')
      expect(component.onGetQuickFilterCount('WORKSPACE')).toEqual('1')
      expect(component.onGetQuickFilterCount('ALL')).toEqual('1') // combined role
    })
  })

  describe('Test translations', () => {
    it('dataview translations', (done) => {
      const translationData = {
        'DIALOG.DATAVIEW.FILTER': 'filter',
        'DIALOG.DATAVIEW.FILTER_OF': 'filterOf',
        'DIALOG.DATAVIEW.SORT_BY': 'sortBy'
      }
      const translateService = TestBed.inject(TranslateService)
      spyOn(translateService, 'get').and.returnValue(of(translationData))

      component.ngOnInit()

      component.dataViewControlsTranslations$?.subscribe({
        next: (data) => {
          if (data) {
            expect(data.sortDropdownTooltip).toEqual('sortBy')
          }
          done()
        },
        error: done.fail
      })
    })

    it('should translate quick filter items', () => {
      component.prepareQuickFilter()

      let items: any = []
      component.quickFilterOptions$!.subscribe((data) => (items = data))

      items[0].value

      expect(items[0].value).toEqual('ALL')
    })
  })

  describe('getPermisionEndpointUrl', () => {
    beforeEach(() => {
      component.workspace = workspace
    })

    it('should permissionEndpointExist - exist', (done) => {
      component.permissionEndpointExist$ = of(true)
      workspaceServiceSpy.getUrl.and.returnValue(of('/url'))

      const eu$ = component.getPermisionEndpointUrl$('name', true)

      eu$.subscribe({
        next: (data) => {
          if (data) {
            expect(data).toBe('/url')
          }
          done()
        },
        error: done.fail
      })
    })

    it('should permissionEndpointExist - not exist', (done) => {
      component.permissionEndpointExist$ = of(false)
      const errorResponse = { status: 400, statusText: 'Error on check endpoint' }
      workspaceServiceSpy.getUrl.and.returnValue(throwError(() => errorResponse))

      const eu$ = component.getPermisionEndpointUrl$('name', false)

      eu$.subscribe({
        next: (data) => {
          if (data) {
            expect(data).toBeFalse()
          }
          done()
        },
        error: done.fail
      })
    })
  })
})
