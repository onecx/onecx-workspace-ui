import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

import { AppStateService, createTranslateLoader, PortalMessageService } from '@onecx/portal-integration-angular'
import { WorkspaceRoleDetailComponent } from './workspace-role-detail.component'
// import { Role } from '../workspace-detail/workspace-roles/workspace-roles.component'
// import { Workspace, /* WorkspaceRolesAPIService, RoleAPIService */
// WorkspaceRolePageResult} from 'src/app/shared/generated'
import { of } from 'rxjs'

// const workspace: Workspace = {
//   id: 'id',
//   name: 'name',
//   theme: 'theme',
//   baseUrl: '/some/base/url'
// }

// const wRole: Role = {
//   name: 'role name',
//   id: 'role id',
//   description: 'role descr',
//   isWorkspaceRole: false,
//   isIamRole: false,
//   type: 'WORKSPACE'
// }

// const iamRole: Role = {
//   name: 'role name',
//   id: 'role id',
//   description: 'role descr',
//   isWorkspaceRole: false,
//   isIamRole: true,
//   type: 'IAM'
// }

fdescribe('WorkspaceRoleDetailComponent', () => {
  let component: WorkspaceRoleDetailComponent
  let fixture: ComponentFixture<WorkspaceRoleDetailComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const wRoleServiceSpy = {
    searchWorkspaceRoles: jasmine.createSpy('searchWorkspaceRoles').and.returnValue(of({})),
    createWorkspaceRole: jasmine.createSpy('createWorkspaceRole').and.returnValue(of({})),
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
      providers: [{ provide: PortalMessageService, useValue: msgServiceSpy }]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceRoleDetailComponent)
    component = fixture.componentInstance
    // component.workspace = workspace
    fixture.detectChanges()
    wRoleServiceSpy.searchWorkspaceRoles.calls.reset()
    wRoleServiceSpy.createWorkspaceRole.calls.reset()
    wRoleServiceSpy.deleteWorkspaceRole.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
