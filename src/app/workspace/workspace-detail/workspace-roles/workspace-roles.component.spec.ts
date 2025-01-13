import { NO_ERRORS_SCHEMA, SimpleChanges } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient, HttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import {
  AppStateService,
  createTranslateLoader,
  PortalMessageService,
  UserService
} from '@onecx/portal-integration-angular'
import {
  Role,
  WorkspaceRolesComponent
} from 'src/app/workspace/workspace-detail/workspace-roles/workspace-roles.component'
import {
  Workspace,
  WorkspaceRolesAPIService,
  RoleAPIService,
  WorkspaceRolePageResult,
  IAMRolePageResult
} from 'src/app/shared/generated'
import * as utils from 'src/app/shared/utils'

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

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const wRoleServiceSpy = {
    searchWorkspaceRoles: jasmine.createSpy('searchWorkspaceRoles').and.returnValue(of({})),
    createWorkspaceRole: jasmine.createSpy('createWorkspaceRole').and.returnValue(of({})),
    deleteWorkspaceRole: jasmine.createSpy('deleteWorkspaceRole').and.returnValue(of({}))
  }
  const iamRoleServiceSpy = {
    searchAvailableRoles: jasmine.createSpy('searchAvailableRoles').and.returnValue(of({}))
  }
  const mockUserService = jasmine.createSpyObj('UserService', ['hasPermission'])
  mockUserService.hasPermission.and.callFake((permission: string) => {
    return ['WORKSPACE_ROLE#EDIT', 'WORKSPACE_ROLE#CREATE', 'WORKSPACE_ROLE#DELETE'].includes(permission)
  })

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceRolesComponent],
      imports: [
        TranslateModule.forRoot({
          isolate: true,
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceRolesAPIService, useValue: wRoleServiceSpy },
        { provide: RoleAPIService, useValue: iamRoleServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceRolesComponent)
    component = fixture.componentInstance
    component.workspace = workspace
    fixture.detectChanges()
    // to spy data: reset
    wRoleServiceSpy.searchWorkspaceRoles.calls.reset()
    wRoleServiceSpy.createWorkspaceRole.calls.reset()
    wRoleServiceSpy.deleteWorkspaceRole.calls.reset()
    iamRoleServiceSpy.searchAvailableRoles.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    // to spy data: refill with neutral data
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({}))
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should searchRoles onChanges', () => {
    const changes = {
      ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true }
    }
    spyOn(component as any, 'searchRoles')

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect((component as any).searchRoles).toHaveBeenCalled()
  })

  it('should populate wRoles on search', () => {
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: [{ name: 'role' }] as WorkspaceRolePageResult }))
    const changes = {
      ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true }
    }
    component.quickFilterValue = 'WORKSPACE'

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(component.wRoles).toEqual(['role'])
  })

  it('should populate wRoles on search: empty stream', () => {
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({}))
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    component.quickFilterValue = 'WORKSPACE'

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(component.wRoles).toEqual([])
  })

  it('should populate wRoles on search: empty name', () => {
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: [{}] as WorkspaceRolePageResult }))
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    component.quickFilterValue = 'WORKSPACE'

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(component.wRoles).toEqual([''])
  })

  it('should display error on ws search', () => {
    const errorResponse = { status: 404, statusText: 'Workspace roles not found' }
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    component.quickFilterValue = 'WORKSPACE'

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(console.error).toHaveBeenCalledWith('searchAvailableRoles', errorResponse)
    expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.WS_ROLES')
  })

  it('should populate IAM roles on search', () => {
    iamRoleServiceSpy.searchAvailableRoles.and.returnValue(of({ stream: [{ name: 'role' }] as IAMRolePageResult }))
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    component.quickFilterValue = 'IAM'

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(component.roles[0].name).toEqual('role')
  })

  it('should populate iamRoles on search: change ws role to iam role', () => {
    iamRoleServiceSpy.searchAvailableRoles.and.returnValue(
      of({ stream: [{ name: 'api role', isIamRole: false }] as IAMRolePageResult })
    )
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    component.quickFilterValue = 'IAM'
    wRole.name = 'api role'
    component.roles[0] = wRole
    component.wRoles = ['api role']

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(component.roles[0].name).toEqual('api role')
  })

  it('should populate iamRoles on search: empty stream', () => {
    iamRoleServiceSpy.searchAvailableRoles.and.returnValue(of({}))
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    component.quickFilterValue = 'IAM'

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(component.roles[0]).toBeUndefined()
  })

  it('should display error on IAM search', () => {
    const errorResponse = { status: 404, statusText: 'IAM roles not found' }
    iamRoleServiceSpy.searchAvailableRoles.and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    component.quickFilterValue = 'IAM'

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(console.error).toHaveBeenCalledWith('searchAvailableRoles', errorResponse)
    expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.IAM_ROLES')
  })

  it('should ignore specific 418 error on iam search', () => {
    const errorResponse = { status: 418, statusText: 'IAM not available' }
    iamRoleServiceSpy.searchAvailableRoles.and.returnValue(throwError(() => errorResponse))
    const changes = {
      ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true }
    }
    component.quickFilterValue = 'IAM'

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(component.iamAvailable).toBeFalse()
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
    component.onRoleChanged(true)

    expect(component.role).toBeUndefined()
    expect(component.changeMode).toEqual('VIEW')
    expect(component.showRoleDetailDialog).toBeFalse()
    expect(component.showRoleDeleteDialog).toBeFalse()
  })

  describe('filtering', () => {
    it('should reset filter to default when ALL is selected', () => {
      component.onQuickFilterChange({ value: 'ALL' })

      expect(component.filterBy).toEqual('name,type')
      expect(component.quickFilterValue).toEqual('ALL')
    })

    it('should set filter by specific type', () => {
      component.onQuickFilterChange({ value: 'IAM' })

      expect(component.filterBy).toEqual('type')
      expect(component.quickFilterValue).toEqual('IAM')
    })

    it('should set filterBy to name,type when filter is empty', () => {
      component.onFilterChange('')

      expect(component.filterBy).toEqual('name,type')
    })

    it('should call filter method with "contains" when filter has a value', () => {
      component.dv = jasmine.createSpyObj('DataView', ['filter'])

      component.onFilterChange('testFilter')
    })

    it('should remember on old value if click on filter value again', () => {
      component.onQuickFilterChange({ value: 'ALL' })

      expect(component.filterBy).toEqual('name,type')
      expect(component.quickFilterValue).toEqual('ALL')
      expect(component.quickFilterValue2).toEqual('ALL')

      component.onQuickFilterChange({})

      expect(component.quickFilterValue).toEqual('ALL')
      expect(component.quickFilterValue2).toEqual('ALL')
    })

    it('should quick filter after searching', () => {
      wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(
        of({ stream: [{ name: 'role' }] as WorkspaceRolePageResult })
      )
      iamRoleServiceSpy.searchAvailableRoles.and.returnValue(of({ stream: [{ name: 'role' }] as IAMRolePageResult }))
      const changes = { ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true } }
      component.quickFilterValue = 'ALL' // load all

      component.ngOnChanges(changes as unknown as SimpleChanges)

      expect(component.wRoles.length).toEqual(1)
      expect(component.iamRoleCount).toEqual(1)

      expect(component.onGetQuickFilterCount('IAM')).toEqual('1')
      expect(component.onGetQuickFilterCount('WORKSPACE')).toEqual('1')
      expect(component.onGetQuickFilterCount('ALL')).toEqual('1') // combined role because same name
    })
  })

  describe('sorting', () => {
    it('should set sortField correctly when onSortChange is called', () => {
      const testField = 'name'

      component.onSortChange(testField)

      expect(component.sortField).toBe(testField)
    })

    it('should set sortOrder to -1 when onSortDirChange is called with true', () => {
      component.onSortDirChange(true)

      expect(component.sortOrder).toBe(-1)
    })

    it('should set sortOrder to 1 when onSortDirChange is called with false', () => {
      component.onSortDirChange(false)

      expect(component.sortOrder).toBe(1)
    })
  })

  describe('UI events', () => {
    it('should go to product slots', () => {
      spyOn(utils, 'goToEndpoint')

      component.onGoToPermission()

      expect(utils.goToEndpoint).toHaveBeenCalled()
    })
  })
})
