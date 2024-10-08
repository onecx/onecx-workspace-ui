import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { HttpClient, provideHttpClient } from '@angular/common/http'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import { AppStateService, createTranslateLoader, PortalMessageService } from '@onecx/portal-integration-angular'
import { WorkspaceExportComponent } from './workspace-export.component'
import { WorkspaceAPIService } from 'src/app/shared/generated'

describe('WorkspaceExportComponent', () => {
  let component: WorkspaceExportComponent
  let fixture: ComponentFixture<WorkspaceExportComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    getWorkspaceByName: jasmine.createSpy('getWorkspaceByName').and.returnValue(of({})),
    deleteWorkspace: jasmine.createSpy('deleteWorkspace').and.returnValue(of({})),
    exportWorkspaces: jasmine.createSpy('exportWorkspaces').and.returnValue(of({})),
    updateWorkspace: jasmine.createSpy('updateWorkspace').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceExportComponent],
      imports: [
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        })
      ],
      providers: [
        provideHttpClientTesting(),
        provideHttpClient(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceExportComponent)
    component = fixture.componentInstance

    component.workspace = {
      name: 'name',
      displayName: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url',
      id: 'id'
    }
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('onConfirmExportWorkspace', () => {
    it('should export a workspace', () => {
      apiServiceSpy.exportWorkspaces.and.returnValue(of({}))
      component.exportMenu = true
      component.onConfirmExportWorkspace()

      expect(apiServiceSpy.exportWorkspaces).toHaveBeenCalled()
    })

    it('should enter error branch if exportWorkspaces call fails', () => {
      apiServiceSpy.exportWorkspaces.and.returnValue(throwError(() => new Error()))

      component.onConfirmExportWorkspace()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EXPORT.MESSAGE.NOK' })
    })
  })

  it('should close the dialog', () => {
    spyOn(component.workspaceExportVisibleChange, 'emit')

    component.onClose()

    expect(component.workspaceExportVisibleChange.emit).toHaveBeenCalledWith(false)
  })
})
