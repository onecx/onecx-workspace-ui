import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateService } from '@ngx-translate/core'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of } from 'rxjs'
import { FileSelectEvent } from 'primeng/fileupload'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { ChooseFileComponent } from './choose-file.component'
import { WorkspaceAPIService } from 'src/app/shared/generated'

const snapshot: any = {
  workspaces: {
    workspace: {
      name: 'name',
      displayName: 'dName',
      baseUrl: 'url',
      theme: 'theme'
    }
  }
}

describe('ChooseFileComponent', () => {
  let component: ChooseFileComponent
  let fixture: ComponentFixture<ChooseFileComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    portalImportRequest: jasmine.createSpy('portalImportRequest').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ChooseFileComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClientTesting(),
        provideHttpClient(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.portalImportRequest.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ChooseFileComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should call toggleImportDialogEvent onClose', () => {
    spyOn(component.importFileSelected, 'emit')

    component.importWorkspace = snapshot

    component.uploadHandler()

    expect(component.importFileSelected.emit).toHaveBeenCalledOnceWith(component.importWorkspace)
  })

  it('should select a file, get translations and set importWorkspace', async () => {
    const validJson = JSON.stringify(snapshot)
    const mockFile = new File([validJson], 'test.json', { type: 'application/json' })
    spyOn(mockFile, 'text').and.returnValue(Promise.resolve(validJson))
    const fileList = { 0: mockFile, length: 1, item: () => mockFile }

    const translateService = TestBed.inject(TranslateService)
    spyOn(translateService, 'get').and.returnValue(of({}))

    component.onFileSelect({ files: fileList } as unknown as FileSelectEvent)
    await fixture.whenStable()

    expect(mockFile.text).toHaveBeenCalled()
    expect(component.importWorkspace).toEqual(snapshot)
    expect(component.importError).toBeFalse()
    expect(component.validationErrorCause).toBeUndefined()
  })

  it('should set an import error when the file content is not valid JSON', async () => {
    const invalidJson = '{not valid json'
    const mockFile = new File([invalidJson], 'test.json', { type: 'application/json' })
    spyOn(mockFile, 'text').and.returnValue(Promise.resolve(invalidJson))
    const fileList = { 0: mockFile, length: 1, item: () => mockFile }

    const translateService = TestBed.inject(TranslateService)
    spyOn(translateService, 'get').and.returnValue(
      of({
        'WORKSPACE_IMPORT.VALIDATION.RESULT': 'Validation failed: ',
        'WORKSPACE_IMPORT.VALIDATION.JSON_ERROR': 'Invalid JSON file'
      })
    )
    spyOn(console, 'error')

    component.onFileSelect({ files: fileList } as unknown as FileSelectEvent)
    await fixture.whenStable()

    expect(component.importError).toBeTrue()
    expect(console.error).toHaveBeenCalled()
    expect(component.validationErrorCause).toBe('Validation failed: Invalid JSON file')
  })

  it('should behave correctly onClear', () => {
    component.onClear()

    expect(component.importWorkspace).toBeNull()
    expect(component.importError).toBeFalse()
    expect(component.validationErrorCause).toBeUndefined()
  })

  describe('isWorkspaceImportValid', () => {
    let mockData: any
    beforeEach(() => {
      mockData = {
        'WORKSPACE_IMPORT.VALIDATION.WORKSPACE.MISSING': 'Workspace missing',
        'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_KEY_MISSING': 'Menu item key missing',
        'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_NAME_MISSING': 'Menu item name missing',
        'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_POSITION': 'Invalid menu item position',
        'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_DISABLED': 'Invalid menu item disabled state',
        'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_WORKSPACEEXIT': 'Invalid menu item external state',
        'WORKSPACE_IMPORT.VALIDATION.RESULT': 'Validation failed: '
      }
    })

    it('should return false when workspaces is missing', () => {
      const obj = {}
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeFalse()
      expect(component.validationErrorCause).toContain('Workspace missing')
    })

    it('should return false when there is no workspace', () => {
      const obj = { workspaces: {} }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeFalse()
      expect(component.validationErrorCause).toContain('Workspace missing')
    })

    it('should return true when workspace name is missing', () => {
      const obj = { workspaces: { key1: {} } }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeTrue()
    })

    it('should return true when workspace theme is missing', () => {
      const obj = { workspaces: { key1: { name: 'Name', displayName: 'Name Display' } } }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeTrue()
    })

    it('should return true for a valid workspace object', () => {
      const obj = {
        workspaces: {
          key1: {
            name: 'Name',
            displayName: 'Name Display',
            theme: 'theme',
            baseUrl: '/url',
            menu: {
              menu: {
                menuItems: [{ key: 'item1', name: 'Item 1', position: 0, disabled: false, external: false }]
              }
            }
          }
        }
      }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeTrue()
      expect(component.validationErrorCause).toBeUndefined()
    })

    it('should return false when a menu item is missing a key', () => {
      const obj = {
        workspaces: {
          key1: {
            name: 'Name',
            displayName: 'Name Display',
            theme: 'theme',
            baseUrl: '/url',
            menu: {
              menu: {
                menuItems: [{ name: 'Item 1', position: 0, disabled: false, external: false }]
              }
            }
          }
        }
      }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeFalse()
      expect(component.validationErrorCause).toContain('Menu item key missing')
    })

    it('should return false when a menu item is missing a name', () => {
      const obj = {
        workspaces: {
          key1: {
            name: 'Name',
            displayName: 'Name Display',
            theme: 'theme',
            baseUrl: '/url',
            menu: {
              menu: {
                menuItems: [{ key: 'Key 1', position: 0, disabled: false, external: false }]
              }
            }
          }
        }
      }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeFalse()
      expect(component.validationErrorCause).toContain('Menu item name missing')
    })

    it('should return false when a menu item has an invalid position', () => {
      const obj = {
        workspaces: {
          key1: {
            name: 'Name',
            displayName: 'Name Display',
            theme: 'theme',
            baseUrl: '/url',
            menu: {
              menu: {
                menuItems: [{ key: 'item1', name: 'Item 1', position: '0', disabled: false, external: false }]
              }
            }
          }
        }
      }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeFalse()
      expect(component.validationErrorCause).toContain('Invalid menu item position')
    })

    it('should return false when a menu item has an invalid disabled state', () => {
      const obj = {
        workspaces: {
          key1: {
            name: 'Name',
            displayName: 'Name Display',
            theme: 'theme',
            baseUrl: '/url',
            menu: {
              menu: {
                menuItems: [{ key: 'item1', name: 'Item 1', position: 0, disabled: 'false', external: false }]
              }
            }
          }
        }
      }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeFalse()
      expect(component.validationErrorCause).toContain('Invalid menu item disabled state')
    })

    it('should return false when a menu item has an invalid external state', () => {
      const obj = {
        workspaces: {
          key1: {
            name: 'Name',
            displayName: 'Name Display',
            theme: 'theme',
            baseUrl: '/url',
            menu: {
              menu: {
                menuItems: [{ key: 'item1', name: 'Item 1', position: 0, disabled: false, external: 'false' }]
              }
            }
          }
        }
      }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeFalse()
      expect(component.validationErrorCause).toContain('Invalid menu item external state')
    })
  })
})
