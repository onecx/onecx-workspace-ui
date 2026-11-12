import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { WorkspaceExportComponent } from './workspace-export.component'

describe('WorkspaceExportComponent', () => {
  let component: WorkspaceExportComponent
  let fixture: ComponentFixture<WorkspaceExportComponent>

  // Both WorkspaceAPIService and PortalMessageService are providedIn 'any', so the component
  // injects its own instances and root-level providers would be shadowed - spy on the actual
  // instances the component holds.
  let msgServiceSpy: { success: jasmine.Spy; error: jasmine.Spy }
  let apiServiceSpy: { exportWorkspaces: jasmine.Spy }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        WorkspaceExportComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()]
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

    msgServiceSpy = {
      success: spyOn(component['msgService'], 'success'),
      error: spyOn(component['msgService'], 'error')
    }
    apiServiceSpy = {
      exportWorkspaces: spyOn(component['workspaceApi'], 'exportWorkspaces')
    }
    // default return value - overridden per-test where needed
    apiServiceSpy.exportWorkspaces.and.returnValue(of({}))
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
      const errorResponse = { status: 400, statusText: 'Error on import menu items' }
      apiServiceSpy.exportWorkspaces.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onConfirmExportWorkspace()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EXPORT.MESSAGE.NOK' })
      expect(console.error).toHaveBeenCalledWith('exportWorkspaces', errorResponse)
    })
  })

  it('should close the dialog', () => {
    spyOn(component.workspaceExportVisibleChange, 'emit')

    component.onClose()

    expect(component.workspaceExportVisibleChange.emit).toHaveBeenCalledWith(false)
  })
})
