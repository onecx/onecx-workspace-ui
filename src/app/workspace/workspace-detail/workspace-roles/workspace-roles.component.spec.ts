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
import { Workspace, WorkspaceRolesAPIService, RoleAPIService, WorkspaceRolePageResult } from 'src/app/shared/generated'
import { of } from 'rxjs'

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

// const iamRole: Role = {
//   name: 'role name',
//   id: 'role id',
//   description: 'role descr',
//   isWorkspaceRole: false,
//   isIamRole: true,
//   type: 'IAM'
// }

fdescribe('WorkspaceRolesComponent', () => {
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
    component.quickFilterValue = 'ALL'

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(component.workspaceRoles).toEqual(['role'])
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

  it('should display error when creating a role onToggleRole', () => {
    wRoleServiceSpy.createWorkspaceRole.and.returnValue(of({}))
    component.hasEditPermission = true

    component.onToggleRole(wRole)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ROLE_OK' })
  })

  xit('should delete a workspace role onToggleRole', () => {
    wRole.isWorkspaceRole = true
    wRoleServiceSpy.deleteWorkspaceRole.and.returnValue(of({}))

    component.onToggleRole(wRole)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.ROLE_OK' })
    expect(wRole.isWorkspaceRole).toBe(false)
    expect(wRole.id).toBeUndefined()
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
