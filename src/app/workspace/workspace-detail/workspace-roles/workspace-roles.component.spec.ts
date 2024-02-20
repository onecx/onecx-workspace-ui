import { NO_ERRORS_SCHEMA, SimpleChanges, SimpleChange } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { FormControl, Validators } from '@angular/forms'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

import { AppStateService, createTranslateLoader, PortalMessageService } from '@onecx/portal-integration-angular'
import { WorkspaceRolesComponent } from './workspace-roles.component'
import { Workspace } from '../../../shared/generated'

const portal: Workspace = {
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  id: 'id',
  workspaceRoles: ['role']
}

describe('WorkspaceRolesComponent', () => {
  let component: WorkspaceRolesComponent
  let fixture: ComponentFixture<WorkspaceRolesComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])

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
      providers: [{ provide: PortalMessageService, useValue: msgServiceSpy }]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceRolesComponent)
    component = fixture.componentInstance
    component.workspaceDetail = portal
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should setFormData onChanges if workspaceDetail & changes correct', () => {
    spyOn(component, 'setFormData')
    const changes: SimpleChanges = {
      workspaceDetail: new SimpleChange(null, component.workspaceDetail, true)
    }

    component.ngOnChanges(changes)

    expect(component.setFormData).toHaveBeenCalled()
  })

  it('should setFormData onChanges if workspaceDetail & changes correct', () => {
    component.setFormData()

    if (component.workspaceDetail.workspaceRoles) {
      expect(component.formArray.length).toBe(component.workspaceDetail.workspaceRoles.length)
    }
  })

  it('should toggleAddDialog', () => {
    component.addDisplay = true

    component.toggleAddDialog()

    expect(component.addDisplay).toBeFalse()
  })

  // it('should update roles on addPortalRole', () => {
  //   component.newWorkspaceRole = 'new role'

  //   component.addPortalRole()

  //   expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_OK' })
  // })

  it('should update roles on deleteRole', () => {
    component.deleteRole(0)

    expect(component.workspaceDetail.workspaceRoles).toEqual([])
  })

  it('should display error msg if form invalid', () => {
    const newControl = new FormControl('role', Validators.minLength(5))
    component.formArray.push(newControl as never)

    component.updateRoles()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.FORM_VALIDATION'
    })
  })
})
