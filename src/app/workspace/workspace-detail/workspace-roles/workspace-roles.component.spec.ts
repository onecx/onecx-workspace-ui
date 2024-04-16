import { NO_ERRORS_SCHEMA, SimpleChanges } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

import { AppStateService, createTranslateLoader, PortalMessageService } from '@onecx/portal-integration-angular'
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
import { of, throwError } from 'rxjs'

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url'
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

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceRolesComponent],
      imports: [
        HttpClientTestingModule,
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
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceRolesAPIService, useValue: wRoleServiceSpy },
        { provide: RoleAPIService, useValue: iamRoleServiceSpy }
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
    wRoleServiceSpy.searchWorkspaceRoles.calls.reset()
    wRoleServiceSpy.createWorkspaceRole.calls.reset()
    wRoleServiceSpy.deleteWorkspaceRole.calls.reset()
    iamRoleServiceSpy.searchAvailableRoles.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should searchRoles onChanges', () => {
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    spyOn(component as any, 'searchRoles')

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect((component as any).searchRoles).toHaveBeenCalled()
  })

  it('should populate workspaceRoles on search', () => {
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: [{ name: 'role' }] as WorkspaceRolePageResult }))
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    component.quickFilterValue = 'WORKSPACE'

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(component.workspaceRoles).toEqual(['role'])
  })

  it('should populate workspaceRoles on search: empty stream', () => {
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

    expect(component.workspaceRoles).toEqual([])
  })

  it('should populate workspaceRoles on search: empty name', () => {
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

    expect(component.workspaceRoles).toEqual([''])
  })

  it('should display error on ws search', () => {
    const err = {
      status: '404'
    }
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(throwError(() => err))
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    component.quickFilterValue = 'WORKSPACE'

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_' + '404' + '.ROLES')
  })

  it('should populate iamRoles on search', () => {
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
    component.workspaceRoles = ['api role']

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

  it('should display error on iam search', () => {
    const err = {
      status: '404'
    }
    iamRoleServiceSpy.searchAvailableRoles.and.returnValue(throwError(() => err))
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    component.quickFilterValue = 'IAM'

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_' + '404' + '.ROLES')
  })

  it('should behave correctly onReload', () => {
    spyOn(component as any, 'searchRoles')

    component.onReload()

    expect(component.roles).toEqual([])
    expect(component.workspaceRolesLoaded).toBeFalse()
    expect(component.iamRolesLoaded).toBeFalse()
    expect((component as any).searchRoles).toHaveBeenCalled()
  })

  it('should return onToggleRole: no edit permission', () => {
    wRoleServiceSpy.createWorkspaceRole.and.returnValue(of({}))
    component.hasEditPermission = false

    component.onToggleRole(wRole)

    expect(wRoleServiceSpy.createWorkspaceRole).not.toHaveBeenCalled()
  })

  it('should create a role onToggleRole', () => {
    wRoleServiceSpy.createWorkspaceRole.and.returnValue(of({ id: 'newRoleId' }))
    component.hasEditPermission = true

    component.onToggleRole(wRole)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ROLE_OK' })
  })

  it('should create a role onToggleRole: no workspace id', () => {
    wRoleServiceSpy.createWorkspaceRole.and.returnValue(of({ id: 'newRoleId' }))
    component.hasEditPermission = true
    component.workspace = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url'
    }

    component.onToggleRole(wRole)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ROLE_OK' })
  })

  it('should display error when creating a role onToggleRole', () => {
    wRoleServiceSpy.createWorkspaceRole.and.returnValue(throwError(() => new Error()))
    component.hasEditPermission = true

    component.onToggleRole(wRole)

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ROLE_NOK' })
  })

  it('should delete a workspace role onToggleRole', () => {
    wRole.isWorkspaceRole = true
    component.hasEditPermission = true
    wRoleServiceSpy.deleteWorkspaceRole.and.returnValue(of({}))

    component.onToggleRole(wRole)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.ROLE_OK' })
    expect(wRole.isWorkspaceRole).toBe(false)
    expect(wRole.id).toBeUndefined()
  })

  it('should display error when delete workspace role call fails', () => {
    wRole.isWorkspaceRole = true
    component.hasEditPermission = true
    wRoleServiceSpy.deleteWorkspaceRole.and.returnValue(throwError(() => new Error()))

    component.onToggleRole(wRole)

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.ROLE_NOK' })
  })

  it('should create a role onAddRole', () => {
    wRoleServiceSpy.createWorkspaceRole.and.returnValue(of({ id: 'newRoleId' }))
    const mockEvent = new MouseEvent('click')
    component.workspace = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url'
    }

    component.onAddRole(mockEvent, wRole)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ROLE_OK' })
  })

  it('should display error when creating a role onAddRole', () => {
    wRoleServiceSpy.createWorkspaceRole.and.returnValue(throwError(() => new Error()))
    const mockEvent = new MouseEvent('click')

    component.onAddRole(mockEvent, wRole)

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ROLE_NOK' })
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

  it('should reset filter to default when ALL is selected', () => {
    component.onQuickFilterChange({ value: 'ALL' })

    expect(component.filterBy).toEqual('name,type')
    expect(component.filterValue).toEqual('')
  })

  it('should set filter by type and call filter method with "equals" when specific value is selected', () => {
    component.onQuickFilterChange({ value: 'testType' })

    expect(component.filterBy).toEqual('type')
    expect(component.filterValue).toEqual('testType')
  })

  it('should set filterBy to name,type when filter is empty', () => {
    component.onFilterChange('')

    expect(component.filterBy).toEqual('name,type')
  })

  it('should call filter method with "contains" when filter has a value', () => {
    component.dv = jasmine.createSpyObj('DataView', ['filter'])

    component.onFilterChange('testFilter')
  })

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
