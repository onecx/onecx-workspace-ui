import { NO_ERRORS_SCHEMA, SimpleChanges, SimpleChange } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
// import { HttpClient } from '@angular/common/http'
import { FormControl, Validators } from '@angular/forms'
import { HttpClientTestingModule } from '@angular/common/http/testing'
// import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import { PortalMessageService } from '@onecx/portal-integration-angular'
// import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { WorkspaceRolesComponent } from './workspace-roles.component'
import { Workspace, WorkspaceAPIService } from '../../../shared/generated'

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
  const apiServiceSpy = {
    updatePortal: jasmine.createSpy('updatePortal').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceRolesComponent],
      imports: [
        HttpClientTestingModule
        // TranslateModule.forRoot({
        //   loader: {
        //     provide: TranslateLoader,
        //     useFactory: HttpLoaderFactory,
        //     deps: [HttpClient]
        //   }
        // })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.updatePortal.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceRolesComponent)
    component = fixture.componentInstance
    component.portalDetail = portal
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should setFormData onChanges if portalDetail & changes correct', () => {
    spyOn(component, 'setFormData')
    const changes: SimpleChanges = {
      portalDetail: new SimpleChange(null, component.portalDetail, true)
    }

    component.ngOnChanges(changes)

    expect(component.setFormData).toHaveBeenCalled()
  })

  it('should setFormData onChanges if portalDetail & changes correct', () => {
    component.setFormData()

    if (component.portalDetail.workspaceRoles) {
      expect(component.formArray.length).toBe(component.portalDetail.workspaceRoles.length)
    }
  })

  it('should toggleAddDialog', () => {
    component.addDisplay = true

    component.toggleAddDialog()

    expect(component.addDisplay).toBeFalse()
  })

  it('should update roles on addPortalRole', () => {
    apiServiceSpy.updatePortal.and.returnValue(of({}))
    component.newPortalRole = 'new role'

    component.addPortalRole()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_OK' })
  })

  it('should update roles on deleteRole', () => {
    apiServiceSpy.updatePortal.and.returnValue(of({}))

    component.deleteRole(0)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_OK' })
    expect(component.portalDetail.workspaceRoles).toEqual([])
  })

  it('should display error msg if update api call fails', () => {
    apiServiceSpy.updatePortal.and.returnValue(throwError(() => new Error()))

    component.addPortalRole()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'ACTIONS.EDIT.MESSAGE.CHANGE_NOK'
    })
  })

  it('should display error msg if form invalid', () => {
    const newControl = new FormControl('role', Validators.minLength(5))
    component.formArray.push(newControl as never)

    component.onSubmit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.FORM_VALIDATION'
    })
  })
})
