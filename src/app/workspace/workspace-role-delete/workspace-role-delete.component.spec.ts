import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { WorkspaceRolesAPIService } from 'src/app/shared/generated'
import { Role } from '../workspace-detail/workspace-roles/workspace-roles.component'
import { WorkspaceRoleDeleteComponent } from './workspace-role-delete.component'

const wRole: Role = {
  name: 'role name',
  id: 'role id',
  description: 'role descr',
  isWorkspaceRole: true,
  isIamRole: false,
  origin: ['WORKSPACE']
}

describe('WorkspaceRoleDeleteComponent', () => {
  let component: WorkspaceRoleDeleteComponent
  let fixture: ComponentFixture<WorkspaceRoleDeleteComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const wRoleServiceSpy = {
    deleteWorkspaceRole: jasmine.createSpy('deleteWorkspaceRole').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        WorkspaceRoleDeleteComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    })
      .overrideComponent(WorkspaceRoleDeleteComponent, {
        add: {
          providers: [
            { provide: PortalMessageService, useValue: msgServiceSpy },
            { provide: WorkspaceRolesAPIService, useValue: wRoleServiceSpy }
          ]
        }
      })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceRoleDeleteComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    wRoleServiceSpy.deleteWorkspaceRole.calls.reset()
    wRoleServiceSpy.deleteWorkspaceRole.and.returnValue(of({}))
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('showDialog', () => {
    it('should be false when dialog is not requested', () => {
      fixture.componentRef.setInput('role', wRole)
      fixture.componentRef.setInput('displayDeleteDialog', false)

      expect(component.showDialog()).toBeFalse()
    })

    it('should be false when no role is given', () => {
      fixture.componentRef.setInput('displayDeleteDialog', true)

      expect(component.showDialog()).toBeFalse()
    })

    it('should be true when dialog is requested and role is given', () => {
      fixture.componentRef.setInput('role', wRole)
      fixture.componentRef.setInput('displayDeleteDialog', true)

      expect(component.showDialog()).toBeTrue()
    })
  })

  it('should emit dataChanged with false when closing', () => {
    spyOn(component.dataChanged, 'emit')

    component.onClose()

    expect(component.dataChanged.emit).toHaveBeenCalledWith(false)
  })

  it('should delete the role and emit dataChanged with true when deletion succeeds', () => {
    fixture.componentRef.setInput('role', wRole)
    spyOn(component.dataChanged, 'emit')

    component.onDeleteRoleConfirmation()

    expect(wRoleServiceSpy.deleteWorkspaceRole).toHaveBeenCalledWith({ id: 'role id' })
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.ROLE.MESSAGE.OK' })
    expect(component.dataChanged.emit).toHaveBeenCalledWith(true)
  })

  it('should use an empty id when role has no id', () => {
    fixture.componentRef.setInput('role', undefined)

    component.onDeleteRoleConfirmation()

    expect(wRoleServiceSpy.deleteWorkspaceRole).toHaveBeenCalledWith({ id: '' })
  })

  it('should display error message when delete api call fails', () => {
    const errorResponse = { status: 400, statusText: 'error on deleting a role' }
    wRoleServiceSpy.deleteWorkspaceRole.and.returnValue(throwError(() => errorResponse))
    fixture.componentRef.setInput('role', wRole)
    spyOn(console, 'error')

    component.onDeleteRoleConfirmation()

    expect(console.error).toHaveBeenCalledWith('deleteWorkspaceRole', errorResponse)
    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.ROLE.MESSAGE.NOK' })
  })
})
