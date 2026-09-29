import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { Workspace } from 'src/app/shared/generated'

import { WorkspaceDeleteComponent } from './workspace-delete.component'

describe('WorkspaceDeleteComponent', () => {
  let component: WorkspaceDeleteComponent
  let fixture: ComponentFixture<WorkspaceDeleteComponent>

  const workspace: Workspace = {
    name: 'name',
    displayName: 'displayName',
    theme: 'theme',
    baseUrl: '/some/base/url',
    id: 'id'
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceDeleteComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceDeleteComponent)
    component = fixture.componentInstance
    component.workspace = workspace
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should close the dialog', () => {
    spyOn(component.workspaceDeleteVisibleChange, 'emit')

    component.onClose()

    expect(component.workspaceDeleteVisibleChange.emit).toHaveBeenCalledWith(false)
  })

  it('should emit confirmDelete on onConfirmDeleteWorkspace', () => {
    spyOn(component.confirmDelete, 'emit')

    component.onConfirmDeleteWorkspace()

    expect(component.confirmDelete.emit).toHaveBeenCalled()
  })
})
