import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

import { AppStateService, createTranslateLoader, PortalMessageService } from '@onecx/portal-integration-angular'
import { WorkspaceRoleDetailComponent } from './workspace-role-detail.component'
import { Role } from '../workspace-detail/workspace-roles/workspace-roles.component'
import { Workspace, WorkspaceRolesAPIService } from 'src/app/shared/generated'
import { of, throwError } from 'rxjs'

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  displayName: 'name'
}

const wRole: Role = {
  name: 'role name',
  id: 'role id',
  description: 'role descr',
  isWorkspaceRole: false,
  isIamRole: false,
  type: 'WORKSPACE'
}

describe('WorkspaceRoleDetailComponent', () => {
  let component: WorkspaceRoleDetailComponent
  let fixture: ComponentFixture<WorkspaceRoleDetailComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const wRoleServiceSpy = {
    createWorkspaceRole: jasmine.createSpy('createWorkspaceRole').and.returnValue(of({})),
    updateWorkspaceRole: jasmine.createSpy('updateWorkspaceRole').and.returnValue(of({})),
    deleteWorkspaceRole: jasmine.createSpy('deleteWorkspaceRole').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceRoleDetailComponent],
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
        { provide: WorkspaceRolesAPIService, useValue: wRoleServiceSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceRoleDetailComponent)
    component = fixture.componentInstance
    component.workspace = workspace
    fixture.detectChanges()
    wRoleServiceSpy.createWorkspaceRole.calls.reset()
    wRoleServiceSpy.updateWorkspaceRole.calls.reset()
    wRoleServiceSpy.deleteWorkspaceRole.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('fill formGroup fields with role values and disable it in VIEW mode', () => {
    component.changeMode = 'VIEW'
    component.role = wRole

    component.ngOnChanges()

    expect(component.formGroupRole.controls['name'].value).toBe(wRole.name)
    expect(component.formGroupRole.controls['description'].value).toBe(wRole.description)
    expect(component.formGroupRole.disabled).toBeTrue()
  })

  it('fill formGroup fields with role values and disable it in EDIT mode', () => {
    component.changeMode = 'EDIT'
    component.role = wRole

    component.ngOnChanges()

    expect(component.formGroupRole.controls['name'].value).toBe(wRole.name)
    expect(component.formGroupRole.controls['description'].value).toBe(wRole.description)
    expect(component.formGroupRole.enabled).toBeTrue()
  })

  it('should emit dataChanged emit event onClose', () => {
    spyOn(component.dataChanged, 'emit')

    component.onClose()

    expect(component.dataChanged.emit).toHaveBeenCalledWith(false)
  })

  it('should return if formGroup invalid')

  it('should delete a workspace role and display success message', () => {
    wRoleServiceSpy.deleteWorkspaceRole.and.returnValue(of({}))
    spyOn(component.dataChanged, 'emit')

    component.onDeleteRoleConfirmation()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.ROLE_OK' })
    expect(component.dataChanged.emit).toHaveBeenCalledWith(true)
  })

  it('should not proceed onSaveRole if form is invalid', () => {
    component.formGroupRole = { valid: false } as any
    spyOn(console, 'info')

    component.onSaveRole()

    expect(console.info).toHaveBeenCalledWith('form not valid')
  })

  it('should not create/update role onSaveRole if it already exists', () => {
    component.formGroupRole = {
      valid: true,
      controls: {
        name: { value: 'role name' },
        description: { value: 'role description' }
      }
    } as any
    component.roles = [wRole]
    component.changeMode = 'EDIT'
    component.role = {
      id: 'role id',
      name: 'role name',
      description: 'role descr',
      isWorkspaceRole: false,
      isIamRole: false,
      type: 'WORKSPACE'
    }

    component.onSaveRole()

    expect(msgServiceSpy.error).toHaveBeenCalled()
  })

  it('should create a new role successfully', () => {
    component.formGroupRole = {
      valid: true,
      controls: {
        name: { value: 'new role name' },
        description: { value: 'new description' }
      }
    } as any
    component.roles = []
    component.changeMode = 'CREATE'

    component.onSaveRole()

    expect(wRoleServiceSpy.createWorkspaceRole).toHaveBeenCalled()
    expect(msgServiceSpy.success).toHaveBeenCalled()
  })

  it('should create a new role successfully: no ws id', () => {
    component.formGroupRole = {
      valid: true,
      controls: {
        name: { value: 'new role name' },
        description: { value: 'new description' }
      }
    } as any
    component.roles = []
    component.changeMode = 'CREATE'
    component.workspace = {
      name: 'name',
      displayName: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url'
    }

    component.onSaveRole()

    expect(wRoleServiceSpy.createWorkspaceRole).toHaveBeenCalled()
    expect(msgServiceSpy.success).toHaveBeenCalled()
  })

  it('should display error if create role fails', () => {
    wRoleServiceSpy.createWorkspaceRole.and.returnValue(throwError(() => new Error()))
    component.formGroupRole = {
      valid: true,
      controls: {
        name: { value: 'new role name' },
        description: { value: 'new description' }
      }
    } as any
    component.roles = []
    component.changeMode = 'CREATE'

    component.onSaveRole()

    expect(wRoleServiceSpy.createWorkspaceRole).toHaveBeenCalled()
    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.ROLE_NOK' })
  })

  it('should update the role successfully', () => {
    component.formGroupRole = {
      valid: true,
      controls: {
        name: { value: 'updated role name' },
        description: { value: 'updated description' }
      }
    } as any
    component.roles = [wRole]
    component.role = { ...wRole, id: 'role id' }
    component.changeMode = 'EDIT'

    component.onSaveRole()

    expect(wRoleServiceSpy.updateWorkspaceRole).toHaveBeenCalled()
    expect(msgServiceSpy.success).toHaveBeenCalled()
  })

  it('should update the role successfully: no role id', () => {
    component.formGroupRole = {
      valid: true,
      controls: {
        name: { value: 'updated role name' },
        description: { value: 'updated description' }
      }
    } as any
    component.roles = [wRole]
    component.role = { ...wRole, id: 'role id' }
    component.changeMode = 'EDIT'
    component.role = {
      name: 'name',
      description: 'role descr',
      isWorkspaceRole: false,
      isIamRole: false,
      type: 'WORKSPACE'
    }

    component.onSaveRole()

    expect(wRoleServiceSpy.updateWorkspaceRole).toHaveBeenCalled()
    expect(msgServiceSpy.success).toHaveBeenCalled()
  })

  it('should update the role successfully', () => {
    wRoleServiceSpy.updateWorkspaceRole.and.returnValue(throwError(() => new Error()))
    component.formGroupRole = {
      valid: true,
      controls: {
        name: { value: 'updated role name' },
        description: { value: 'updated description' }
      }
    } as any
    component.roles = [wRole]
    component.role = { ...wRole, id: 'role id' }
    component.changeMode = 'EDIT'

    component.onSaveRole()

    expect(wRoleServiceSpy.updateWorkspaceRole).toHaveBeenCalled()
    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.ROLE_NOK' })
  })

  it('should display error message if delete api call fails', () => {
    wRoleServiceSpy.deleteWorkspaceRole.and.returnValue(throwError(() => new Error()))

    component.onDeleteRoleConfirmation()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.ROLE_NOK' })
  })
})
