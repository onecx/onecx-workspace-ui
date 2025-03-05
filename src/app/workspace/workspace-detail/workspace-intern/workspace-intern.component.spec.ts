import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { WorkspaceInternComponent } from './workspace-intern.component'

const workspace = {
  id: 'id',
  operator: true,
  mandatory: false,
  disabled: false,
  name: 'name',
  displayName: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url'
}

describe('WorkspaceInternComponent', () => {
  let component: WorkspaceInternComponent
  let fixture: ComponentFixture<WorkspaceInternComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceInternComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [provideHttpClientTesting(), provideHttpClient()],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceInternComponent)
    component = fixture.componentInstance
    component.workspace = workspace
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnChanges', () => {
    it('should disable form and filled', () => {
      component.editMode = false

      component.ngOnChanges()

      expect(component.formGroup.enabled).toBeFalse()
      expect(component.formGroup.controls['operator'].value).toBeTrue()
      expect(component.formGroup.controls['mandatory'].value).toBeFalse()
    })
    it('should enable form and filled', () => {
      component.editMode = true

      component.ngOnChanges()

      expect(component.formGroup.enabled).toBeTrue()
      expect(component.formGroup.controls['operator'].value).toBeTrue()
      expect(component.formGroup.controls['mandatory'].value).toBeFalse()
    })
  })

  describe('save', () => {
    it('should refill workspace from form', () => {
      component.editMode = true
      component.ngOnChanges()
      component.formGroup.setValue({
        operator: true,
        mandatory: true,
        disabled: true
      })
      component.onSave()

      expect(component.formGroup.valid).toBeTrue()
      expect(component.workspace.mandatory).toBeTrue()
      expect(component.workspace.disabled).toBeTrue()
      expect(component.editMode).toBeFalse()
    })
  })
})
