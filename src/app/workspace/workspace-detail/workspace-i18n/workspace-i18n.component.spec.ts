import { NO_ERRORS_SCHEMA, SimpleChanges } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { ReactiveFormsModule } from '@angular/forms'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { Workspace, WorkspaceAPIService } from 'src/app/shared/generated'

import { WorkspaceI18nComponent } from './workspace-i18n.component'

const workspace: Workspace = {
  id: 'ws-id',
  name: 'ws-name',
  displayName: 'WS Display Name',
  baseUrl: '/ws',
  i18n: {
    displayName: {
      de: 'WS Anzeigename',
      en: 'WS Display Name'
    }
  }
}

function makeChanges(partial: Partial<{ workspaceI18nVisible: boolean; propertyName: string }>): SimpleChanges {
  const changes: SimpleChanges = {}
  if ('workspaceI18nVisible' in partial) {
    changes['workspaceI18nVisible'] = {
      currentValue: partial.workspaceI18nVisible,
      previousValue: false,
      firstChange: true,
      isFirstChange: () => true
    }
  }
  if ('propertyName' in partial) {
    changes['propertyName'] = {
      currentValue: partial.propertyName,
      previousValue: undefined,
      firstChange: true,
      isFirstChange: () => true
    }
  }
  return changes
}

describe('WorkspaceI18nComponent', () => {
  let component: WorkspaceI18nComponent
  let fixture: ComponentFixture<WorkspaceI18nComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    updateWorkspace: jasmine.createSpy('updateWorkspace').and.returnValue(of({}))
  }

  function initTestComponent(): void {
    fixture = TestBed.createComponent(WorkspaceI18nComponent)
    component = fixture.componentInstance
    component.workspace = { ...workspace, i18n: { displayName: { de: 'WS Anzeigename', en: 'WS Display Name' } } }
    component.propertyName = 'displayName'
    component.workspaceI18nVisible = true
    fixture.detectChanges()
    component.ngOnChanges(makeChanges({ workspaceI18nVisible: true }))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceI18nComponent],
      imports: [
        ReactiveFormsModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA],
      teardown: { destroyAfterEach: false }
    }).compileComponents()
  }))

  beforeEach(() => {
    initTestComponent()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.updateWorkspace.calls.reset()
  })

  describe('initialize', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })

    it('should have an empty form before dialog is opened', () => {
      fixture = TestBed.createComponent(WorkspaceI18nComponent)
      component = fixture.componentInstance
      component.workspace = { ...workspace }
      component.workspaceI18nVisible = false
      fixture.detectChanges()

      expect(component.translationsForm.length).toBe(0)
    })
  })

  describe('ngOnChanges', () => {
    it('should init form when workspaceI18nVisible becomes true and propertyName is set', () => {
      component.ngOnChanges(makeChanges({ workspaceI18nVisible: true }))

      expect(component.translationsForm.length).toBe(2)
    })

    it('should init form when propertyName changes and dialog is already visible', () => {
      component.ngOnChanges(makeChanges({ propertyName: 'displayName' }))

      expect(component.translationsForm.length).toBe(2)
    })

    it('should NOT init form when dialog is not visible', () => {
      component.workspaceI18nVisible = false
      component.translationsForm.clear()

      component.ngOnChanges(makeChanges({ workspaceI18nVisible: false }))

      expect(component.translationsForm.length).toBe(0)
    })

    it('should NOT init form when propertyName is not set', () => {
      component.propertyName = undefined
      component.translationsForm.clear()

      component.ngOnChanges(makeChanges({ workspaceI18nVisible: true }))

      expect(component.translationsForm.length).toBe(0)
    })

    it('should init with empty form when workspace has no i18n data for the property', () => {
      component.workspace = { ...workspace, i18n: {} }

      component.ngOnChanges(makeChanges({ workspaceI18nVisible: true }))

      expect(component.translationsForm.length).toBe(0)
    })

    it('should init with empty form when workspace has no i18n at all', () => {
      component.workspace = { ...workspace, i18n: undefined }

      component.ngOnChanges(makeChanges({ workspaceI18nVisible: true }))

      expect(component.translationsForm.length).toBe(0)
    })
  })

  describe('hasChanges', () => {
    it('should be false initially after opening the dialog', () => {
      expect(component.hasChanges).toBeFalse()
    })

    it('should be true after editing an existing translation value', () => {
      component.translationsForm.controls[0].get('value')?.setValue('Neuer Wert')

      expect(component.hasChanges).toBeTrue()
    })

    it('should be true after adding a new translation', () => {
      component.newLanguage = 'fr'
      component.newValue = 'Nom affiché'
      component.onAddLanguage()

      expect(component.hasChanges).toBeTrue()
    })

    it('should be true after removing a translation', () => {
      component.onRemoveTranslation(0)

      expect(component.hasChanges).toBeTrue()
    })

    it('should be false after adding and then removing the same entry (no net change)', () => {
      component.newLanguage = 'fr'
      component.newValue = 'Nom affiché'
      component.onAddLanguage()
      const frIndex = component.translationsForm.controls.findIndex((c) => c.get('language')?.value === 'fr')
      component.onRemoveTranslation(frIndex)

      expect(component.hasChanges).toBeFalse()
    })

    it('should treat null language and value as empty strings in snapshot (line 150 branches)', () => {
      component.translationsForm.push(component['fb'].group({ language: [null], value: [null] }))

      expect(() => component.hasChanges).not.toThrow()
    })
  })

  describe('availableLanguages', () => {
    it('should exclude already-used languages', () => {
      const used = component.translationsForm.controls.map((c) => c.get('language')?.value)
      const available = component.availableLanguages.map((l) => l.value)

      used.forEach((lang) => expect(available).not.toContain(lang))
    })

    it('should return all languages when no translations exist', () => {
      component.workspace = { ...workspace, i18n: {} }
      component.ngOnChanges(makeChanges({ workspaceI18nVisible: true }))

      expect(component.availableLanguages.length).toBe(component.allLanguages.length)
    })
  })

  describe('getLangLabel', () => {
    it('should return the label for a known language code', () => {
      expect(component.getLangLabel('de')).toBe('German (de)')
    })

    it('should return the code itself for an unknown language code', () => {
      expect(component.getLangLabel('xx')).toBe('xx')
    })
  })

  describe('getPropertyValue', () => {
    it('should return the property value from the object', () => {
      expect(component.getPropertyValue(workspace, 'displayName')).toBe('WS Display Name')
    })

    it('should return empty string when prop is undefined', () => {
      expect(component.getPropertyValue(workspace, undefined)).toBe('')
    })

    it('should return empty string when object is undefined', () => {
      expect(component.getPropertyValue(undefined, 'displayName')).toBe('')
    })
  })

  describe('onShowAddRow', () => {
    it('should show the add row and reset new entry fields', () => {
      component.newLanguage = 'de'
      component.newValue = 'some value'

      component.onShowAddRow()

      expect(component.showAddRow).toBeTrue()
      expect(component.newLanguage).toBeUndefined()
      expect(component.newValue).toBe('')
    })
  })

  describe('onAddLanguage', () => {
    it('should add a new translation row and hide the add row', () => {
      component.showAddRow = true
      component.newLanguage = 'fr'
      component.newValue = 'Nom affiché'

      component.onAddLanguage()

      const addedControl = component.translationsForm.controls.find((c) => c.get('language')?.value === 'fr')
      expect(addedControl).toBeTruthy()
      expect(addedControl?.get('value')?.value).toBe('Nom affiché')
      expect(component.showAddRow).toBeFalse()
      expect(component.newLanguage).toBeUndefined()
      expect(component.newValue).toBe('')
    })

    it('should do nothing when newLanguage is undefined', () => {
      const initialLength = component.translationsForm.length
      component.newLanguage = undefined

      component.onAddLanguage()

      expect(component.translationsForm.length).toBe(initialLength)
    })
  })

  describe('onCancelAdd', () => {
    it('should hide the add row and reset new entry fields', () => {
      component.showAddRow = true
      component.newLanguage = 'fr'
      component.newValue = 'test'

      component.onCancelAdd()

      expect(component.showAddRow).toBeFalse()
      expect(component.newLanguage).toBeUndefined()
      expect(component.newValue).toBe('')
    })
  })

  describe('onRemoveTranslation', () => {
    it('should remove the translation at the given index', () => {
      const initialLength = component.translationsForm.length
      const langToRemove = component.translationsForm.controls[0].get('language')?.value

      component.onRemoveTranslation(0)

      expect(component.translationsForm.length).toBe(initialLength - 1)
      const remaining = component.translationsForm.controls.map((c) => c.get('language')?.value)
      expect(remaining).not.toContain(langToRemove)
    })
  })

  describe('onClose', () => {
    it('should emit false on workspaceI18nVisibleChange', () => {
      spyOn(component.workspaceI18nVisibleChange, 'emit')

      component.onClose()

      expect(component.workspaceI18nVisibleChange.emit).toHaveBeenCalledWith(false)
    })
  })

  describe('onSave', () => {
    it('should call updateWorkspace with the current translations', () => {
      apiServiceSpy.updateWorkspace.and.returnValue(of({}))
      spyOn(component.workspaceI18nVisibleChange, 'emit')

      component.onSave()

      expect(apiServiceSpy.updateWorkspace).toHaveBeenCalledWith(
        jasmine.objectContaining({
          id: 'ws-id',
          updateWorkspaceRequest: jasmine.objectContaining({
            resource: jasmine.objectContaining({
              i18n: jasmine.objectContaining({
                displayName: jasmine.objectContaining({ de: 'WS Anzeigename', en: 'WS Display Name' })
              })
            })
          })
        })
      )
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.WORKSPACE.I18N.OK' })
      expect(component.workspaceI18nVisibleChange.emit).toHaveBeenCalledWith(false)
    })

    it('should create i18n object on workspace if it does not exist', () => {
      component.workspace = { ...workspace, i18n: undefined }
      component.ngOnChanges(makeChanges({ workspaceI18nVisible: true }))
      component.newLanguage = 'fr'
      component.newValue = 'Nom'
      component.onAddLanguage()
      const updatedWorkspace = { ...component.workspace, i18n: { displayName: { fr: 'Nom' } } }
      apiServiceSpy.updateWorkspace.and.returnValue(of(updatedWorkspace))

      component.onSave()

      expect(component.workspace.i18n).toBeTruthy()
      expect(component.workspace).toBe(updatedWorkspace)
      expect(apiServiceSpy.updateWorkspace).toHaveBeenCalled()
    })

    it('should show error message when updateWorkspace fails', () => {
      apiServiceSpy.updateWorkspace.and.returnValue(throwError(() => ({ status: 500 })))

      component.onSave()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.WORKSPACE.I18N.NOK' })
    })

    it('should do nothing when propertyName is undefined', () => {
      component.propertyName = undefined

      component.onSave()

      expect(apiServiceSpy.updateWorkspace).not.toHaveBeenCalled()
    })

    it('should use empty string for value when a translation row has no value set (line 128 branch)', () => {
      component.translationsForm.push(component['fb'].group({ language: ['fr'], value: [null] }))
      apiServiceSpy.updateWorkspace.and.returnValue(of({}))

      component.onSave()

      const saved = apiServiceSpy.updateWorkspace.calls.mostRecent().args[0]
      expect(saved.updateWorkspaceRequest.resource.i18n['displayName']['fr']).toBe('')
    })

    it('should skip translation rows where language is falsy (line 129 branch)', () => {
      component.translationsForm.push(component['fb'].group({ language: [null], value: ['some value'] }))
      apiServiceSpy.updateWorkspace.and.returnValue(of({}))

      component.onSave()

      const saved = apiServiceSpy.updateWorkspace.calls.mostRecent().args[0]
      const resultKeys = Object.keys(saved.updateWorkspaceRequest.resource.i18n['displayName'])
      expect(resultKeys).not.toContain('null')
      expect(resultKeys).not.toContain('')
    })
  })
})
