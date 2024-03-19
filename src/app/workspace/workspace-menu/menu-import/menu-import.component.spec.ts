import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { MenuImportComponent } from './menu-import.component'

describe('MenuImportComponent', () => {
  let component: MenuImportComponent
  let fixture: ComponentFixture<MenuImportComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MenuImportComponent],
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA]
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

  /*   it('should enable menu import onImportMenu', () => {
    component.onImportMenu()

    expect(component.displayMenuImport).toBeTrue()
    expect(component.menuImportError).toBeFalse()
  })

  it('should hide menu import onImportMenuHide', () => {
    component.onImportMenuHide()

    expect(component.displayMenuImport).toBeFalse()
  })

  it('should clear menu import onImportMenuClear', () => {
    component.onImportMenuClear()

    expect(component.menuImportError).toBeFalse()
  })

  it('should import menu from a valid file onImportMenuSelect: success', () => {
    const validJson = JSON.stringify(mockMenuItems)
    const mockFile = new File([validJson], 'test.json', { type: 'application/json' })
    spyOn(mockFile, 'text').and.returnValue(Promise.resolve(validJson))
    const fileList = { 0: mockFile, length: 1, item: () => mockFile }

    component.onImportMenuSelect({ files: fileList })

    expect(component.menuImportError).toBeFalse()
  })

  it('should import menu from a valid file onImportMenuSelect: invalid data', (done) => {
    const validJson = JSON.stringify({ invalid: 'data' })
    const mockFile = new File([validJson], 'test.json', { type: 'application/json' })
    spyOn(mockFile, 'text').and.returnValue(Promise.resolve(validJson))
    const fileList = { 0: mockFile, length: 1, item: () => mockFile }
    spyOn(console, 'error')

    component.onImportMenuSelect({ files: fileList })

    setTimeout(() => {
      expect(component.menuImportError).toBeTrue()
      expect(console.error).toHaveBeenCalledWith('Menu Import Error: Data not valid', jasmine.anything())
      done()
    }, 0)
  })

  it('should import menu from a valid file onImportMenuSelect: parse error', (done) => {
    const invalidJson = 'not json'
    const mockFile = new File([invalidJson], 'test.json', { type: 'application/json' })
    spyOn(mockFile, 'text').and.returnValue(Promise.resolve(invalidJson))
    const fileList = { 0: mockFile, length: 1, item: () => mockFile }
    spyOn(console, 'error')

    component.onImportMenuSelect({ files: fileList })

    setTimeout(() => {
      expect(component.menuImportError).toBeTrue()
      // expect(console.error).toHaveBeenCalledWith(
      //   'Menu Import Parse Error',
      //   new SyntaxError('Unexpected token \'o\', "not json" is not valid JSON')
      // )
      done()
    }, 0)
  })

  it('should handle menu import', () => {
    component.workspaceName = 'name'
    spyOn(component, 'ngOnInit')
    menuApiServiceSpy.importMenuByWorkspaceName.and.returnValue(of({}))

    component.onImportMenu()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.MENU.IMPORT.UPLOAD_OK' })
    expect(component.ngOnInit).toHaveBeenCalled()
  })

  it('should handle menu import error', () => {
    component.workspaceName = 'name'
    menuApiServiceSpy.importMenuByWorkspaceName.and.returnValue(throwError(() => new Error()))

    component.onImportMenu()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.MENU.IMPORT.UPLOAD_NOK' })
  })
 */
})
