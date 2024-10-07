import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, tick, waitForAsync, fakeAsync } from '@angular/core/testing'
// import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
// import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import { AppStateService, PortalMessageService, createTranslateLoader } from '@onecx/portal-integration-angular'
// import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { ChooseFileComponent } from './choose-file.component'
import { WorkspaceAPIService, WorkspaceSnapshot } from 'src/app/shared/generated'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { HttpClient } from '@angular/common/http'
import { FileSelectEvent } from 'primeng/fileupload'

const snapshot: WorkspaceSnapshot = {
  workspaces: {
    workspace: {
      name: 'name',
      displayName: 'dName',
      baseUrl: 'url',
      theme: 'theme'
    }
  }
}

fdescribe('ChooseFileComponent', () => {
  let component: ChooseFileComponent
  let fixture: ComponentFixture<ChooseFileComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    portalImportRequest: jasmine.createSpy('portalImportRequest').and.returnValue(of({}))
  }
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['get'])

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ChooseFileComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.portalImportRequest.calls.reset()
    translateServiceSpy.get.calls.reset()
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

  it('should select a file onSelect, get translations and set importDTO', (done) => {
    translateServiceSpy.get.and.returnValue(of({}))
    const file = new File(['file content'], 'test.txt', { type: 'text/plain' })
    const fileList: FileList = {
      0: file,
      length: 1,
      item: (index: number) => file
    }
    spyOn(file, 'text').and.returnValue(
      Promise.resolve(
        '{"portal": {"portalName": "name", "portalRoles": ["role"], "tenantId": "id",\
        "microfrontendRegistrations": [{"version": "1"}]},\
        "menuItems": [{"name": "menu", "key": "key", "position": 1, "disabled": true, "portalExit": true}]}'
      )
    )
    const event = { files: fileList }
    component.importWorkspace = snapshot

    component.onSelect(event as any as FileSelectEvent)

    setTimeout(() => {
      expect(file.text).toHaveBeenCalled()
      done()
    })
    expect(component.importWorkspace).toEqual(snapshot)
  })

  it('should catch an import error', fakeAsync(() => {
    translateServiceSpy.get.and.returnValue(throwError(() => new Error()))

    const file = new File(['file content'], 'test.txt', { type: 'text/plain' })
    const fileList: FileList = {
      0: file,
      length: 1,
      item: (index: number) => file
    }
    spyOn(file, 'text').and.returnValue(Promise.resolve('{"portal"}'))
    const event = { files: fileList }

    component.onSelect(event as any as FileSelectEvent)

    tick()

    expect(component.importError).toBeTrue()
  }))

  it('should behave correctly onClear', () => {
    component.onClear()

    expect(component.importWorkspace).toBeNull()
    expect(component.importError).toBeFalse()
    expect(component.validationErrorCause).toEqual('')
  })

  describe('isWorkspaceImportValid', () => {
    let mockData: any
    beforeEach(() => {
      mockData = {
        'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_MISSING': 'Workspace missing',
        'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_NAME_MISSING': 'Workspace name missing',
        'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_DISPLAY_NAME_MISSING': 'Workspace display name missing',
        'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_THEME_MISSING': 'Workspace theme missing',
        'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_URL_MISSING': 'Workspace URL missing',
        'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_KEY_MISSING': 'Menu item key missing',
        'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_NAME_MISSING': 'Menu item name missing',
        'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_POSITION': 'Invalid menu item position',
        'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_DISABLED': 'Invalid menu item disabled state',
        'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_WORKSPACEEXIT': 'Invalid menu item external state',
        'WORKSPACE_IMPORT.VALIDATION_RESULT': 'Validation failed: '
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

    it('should return false when workspace name is missing', () => {
      const obj = { workspaces: { key1: {} } }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeFalse()
      expect(component.validationErrorCause).toContain('Workspace name missing')
    })

    it('should return false when workspace display name is missing', () => {
      const obj = { workspaces: { key1: { name: 'Name' } } }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeFalse()
      expect(component.validationErrorCause).toContain('Workspace display name missing')
    })

    it('should return false when workspace theme is missing', () => {
      const obj = { workspaces: { key1: { name: 'Name', displayName: 'Name Display' } } }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeFalse()
      expect(component.validationErrorCause).toContain('Workspace theme missing')
    })

    it('should return false when workspace baseUrl is missing', () => {
      const obj = { workspaces: { key1: { name: 'Name', displayName: 'Name Display', theme: 'theme' } } }
      expect(component.isWorkspaceImportValid(obj, mockData)).toBeFalse()
      expect(component.validationErrorCause).toContain('Workspace URL missing')
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
      expect(component.validationErrorCause).toBe('')
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

    it('should validate a request DTO: menu absent error', () => {})
  })
})
