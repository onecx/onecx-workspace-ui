import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { FileSelectEvent } from 'primeng/fileupload'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { MenuItemAPIService, MenuSnapshot } from 'src/app/shared/generated'
import { MenuImportComponent } from './menu-import.component'

const menuSnapshot: MenuSnapshot = {
  menu: {
    menuItems: [
      {
        key: 'menu key',
        name: 'menuName'
      }
    ]
  }
}

describe('MenuImportComponent', () => {
  let component: MenuImportComponent
  let fixture: ComponentFixture<MenuImportComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const menuApiServiceSpy = {
    importMenuByWorkspaceName: jasmine.createSpy('importMenuByWorkspaceName').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MenuImportComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', component: MenuImportComponent }]),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: MenuItemAPIService, useValue: menuApiServiceSpy }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuImportComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should clear menu import onImportMenuClear', () => {
    component.onImportMenuClear()

    expect(component.menuImportError).toBeFalse()
  })

  it('should close import dialog and inform parent component if menu was imported', () => {
    spyOn(component.importEmitter, 'emit')
    spyOn(component.hideDialog, 'emit')

    component.onClose(true)

    expect(component.importEmitter.emit).toHaveBeenCalled()
    expect(component.hideDialog.emit).toHaveBeenCalled()
  })

  it('should close import dialog and not inform parent component if menu was not imported', () => {
    spyOn(component.importEmitter, 'emit')
    spyOn(component.hideDialog, 'emit')

    component.onClose()

    expect(component.importEmitter.emit).not.toHaveBeenCalled()
    expect(component.hideDialog.emit).toHaveBeenCalled()
  })

  it('should prepare menu import from a valid file onImportMenuSelect: success', () => {
    const validJson = JSON.stringify(menuSnapshot)
    const mockFile = new File([validJson], 'test.json', { type: 'application/json' })
    spyOn(mockFile, 'text').and.returnValue(Promise.resolve(validJson))
    const fileList = { 0: mockFile, length: 1, item: () => mockFile }

    component.onImportMenuSelect({ files: fileList } as any as FileSelectEvent)

    expect(component.menuImportError).toBeFalse()
  })

  it('should prepare menu import from a valid file onImportMenuSelect: invalid data', (done) => {
    const validJson = JSON.stringify({ invalid: 'data' })
    const mockFile = new File([validJson], 'test.json', { type: 'application/json' })
    spyOn(mockFile, 'text').and.returnValue(Promise.resolve(validJson))
    const fileList = { 0: mockFile, length: 1, item: () => mockFile }
    spyOn(console, 'error')

    component.onImportMenuSelect({ files: fileList } as any as FileSelectEvent)

    setTimeout(() => {
      expect(component.menuImportError).toBeTrue()
      expect(console.error).toHaveBeenCalledWith('imported menu parse error', Object({ invalid: 'data' }))
      done()
    }, 0)
  })

  it('should prepare menu import from a valid file onImportMenuSelect: not json', (done) => {
    const invalidJson = 'bla'
    const mockFile = new File([invalidJson], 'test.json', { type: 'application/json' })
    spyOn(mockFile, 'text').and.returnValue(Promise.resolve(invalidJson))
    const fileList = { 0: mockFile, length: 1, item: () => mockFile }
    spyOn(console, 'error')

    component.onImportMenuSelect({ files: fileList } as any as FileSelectEvent)

    setTimeout(() => {
      expect(component.menuImportError).toBeTrue()
      expect(console.error).toHaveBeenCalled()
      done()
    }, 0)
  })

  it('should import a menu and close the dialog', () => {
    menuApiServiceSpy.importMenuByWorkspaceName.and.returnValue(of({}))
    spyOn(component.importEmitter, 'emit')
    spyOn(component, 'onClose')
    component.workspaceName = 'wsName'
    component['menuItemStructure'] = menuSnapshot

    component.onImportMenuConfirmation()

    expect(component.importEmitter.emit).toHaveBeenCalled()
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.MENU.IMPORT.UPLOAD_OK' })
    expect(component.onClose).toHaveBeenCalledWith(true)
  })

  it('should display error if import api call fails', () => {
    const errorResponse = { status: 400, statusText: 'Error on import menu items' }
    menuApiServiceSpy.importMenuByWorkspaceName.and.returnValue(throwError(() => errorResponse))
    spyOn(component.importEmitter, 'emit')
    spyOn(console, 'error')
    component.workspaceName = 'wsName'
    component['menuItemStructure'] = menuSnapshot

    component.onImportMenuConfirmation()

    expect(component.importEmitter.emit).toHaveBeenCalled()
    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.MENU.IMPORT.UPLOAD_NOK' })
    expect(console.error).toHaveBeenCalledWith('importMenuByWorkspaceName', errorResponse)
  })
})
