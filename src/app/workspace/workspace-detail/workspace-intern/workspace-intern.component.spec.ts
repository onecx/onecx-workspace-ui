import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { provideNoopAnimations } from '@angular/platform-browser/animations'

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
      imports: [
        WorkspaceInternComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [provideHttpClientTesting(), provideHttpClient(), provideNoopAnimations()]
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
    it('should not overwrite form values when workspace is undefined', () => {
      component.formGroup.get('operator')?.setValue(true)
      component.workspace = undefined

      component.ngOnChanges()

      expect(component.formGroup.controls['operator'].value).toBeTrue()
    })
    it('should default missing workspace fields to false', () => {
      // a workspace without operator/mandatory/disabled exercises the `?? false` fallbacks in setFormData
      component.formGroup.get('operator')?.setValue(true)
      component.formGroup.get('mandatory')?.setValue(true)
      component.formGroup.get('disabled')?.setValue(true)
      component.workspace = { id: 'id', name: 'name', displayName: 'name' }

      component.ngOnChanges()

      expect(component.formGroup.controls['operator'].value).toBeFalse()
      expect(component.formGroup.controls['mandatory'].value).toBeFalse()
      expect(component.formGroup.controls['disabled'].value).toBeFalse()
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
      expect(component.workspace?.mandatory).toBeTrue()
      expect(component.workspace?.disabled).toBeTrue()
      expect(component.editMode).toBeFalse()
    })
    it('should default null form values to false on save', () => {
      // null control values exercise the `?? false` fallbacks in onSave
      component.workspace = { id: 'id', name: 'name', displayName: 'name' }
      component.formGroup.setValue({ operator: null, mandatory: null, disabled: null })

      component.onSave()

      expect(component.workspace?.mandatory).toBeFalse()
      expect(component.workspace?.disabled).toBeFalse()
    })
  })
})
