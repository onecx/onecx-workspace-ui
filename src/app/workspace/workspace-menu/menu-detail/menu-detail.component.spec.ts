// import { NO_ERRORS_SCHEMA, Component } from '@angular/core'
// import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
// import { /* HttpClient, */ HttpErrorResponse } from '@angular/common/http'
// import { FormsModule /*, FormControl, FormGroup */ } from '@angular/forms'
// import { Location } from '@angular/common'
// import { HttpClientTestingModule } from '@angular/common/http/testing'
// import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router'
// import { of, throwError } from 'rxjs'
// import FileSaver from 'file-saver'

// import { PortalMessageService, ConfigurationService, AUTH_SERVICE } from '@onecx/portal-integration-angular'

// import { MenuStateService, MenuState } from './services/menu-state.service'
// import { MenuComponent } from './menu.component'

/* it('should save a menu: create', () => {
  menuApiServiceSpy.addMenuItemForPortal.and.returnValue(of({}))
  component.formGroup = form
  component.menuItem = mockItem
  component.changeMode = 'CREATE'
  component.languagesDisplayed = [{ label: 'English', value: 'en', data: 'data' }]

  component.onMenuSave()

  expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.MENU_CREATE_OK' })
})

it('should display error message on save menu: create', () => {
  menuApiServiceSpy.addMenuItemForPortal.and.returnValue(throwError(() => new Error()))
  component.formGroup = form
  component.menuItem = mockItem
  component.changeMode = 'CREATE'

  component.onMenuSave()

  expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.MENU_CREATE_NOK' })
})

it('should save a menu: edit', () => {
  menuApiServiceSpy.patchMenuItem.and.returnValue(of(mockItem))
  component.formGroup = form
  component.menuItem = {
    key: '1-1',
    id: 'id1',
    parentItemId: '1',
    disabled: true,
    name: 'name',
    position: 1,
    url: 'url',
    badge: 'badge',
    scope: Scope.Workspace,
    description: 'description'
  }
  component.menuItems = mockMenuItems
  component.menuNodes = [
    { key: 'key', children: [{ key: 'key', data: { i18n: { en: 'en' } } }], data: { i18n: { en: 'en' } } }
  ]
  component.changeMode = 'EDIT'
  component.displayMenuDetail = true

  component.onMenuSave()

  expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_OK' })
})

it('should display error message on save menu: edit', () => {
  menuApiServiceSpy.patchMenuItem.and.returnValue(throwError(() => new Error()))
  component.formGroup = form
  component.menuItem = {
    key: '1-1',
    id: 'id1',
    parentItemId: '1',
    disabled: true,
    name: 'name',
    position: 1,
    url: 'url',
    badge: 'badge',
    scope: Scope.Workspace,
    description: 'description'
  }
  component.changeMode = 'EDIT'

  component.onMenuSave()

  expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_NOK' })
}) */

// it('should set item onDeleteMenuItem', () => {
//   const event: MouseEvent = new MouseEvent('type')
//   const item = {
//     key: '1-1',
//     id: 'id1',
//     positionPath: '1-1',
//     regMfeAligned: true,
//     parentItemName: '1',
//     first: true,
//     last: false,
//     prevId: undefined
//   }
//   spyOn(event, 'stopPropagation')

//   component.onDeleteMenuItem(event, item)

//   expect(event.stopPropagation).toHaveBeenCalled()
//   expect(component.menuItem).toEqual(item)
//   expect(component.displayDeleteConfirmation).toBeTrue()
// })

// it('should delete menu item', () => {
//   menuApiServiceSpy.deleteMenuItemById({ portalId: 'id', menuItemId: 'menu id' })
//   component.menuNodes = [{ key: '1', data: { id: 'id1' }, children: [{ key: '1-1', data: { id: 'id1-1' } }] }]
//   component.menuItem = {
//     key: '1-1',
//     id: 'id1',
//     position: 1.1,
//     parentItemId: '1'
//   }

//   component.onMenuDelete()

//   expect(component.menuNodes.length).toBe(1)
//   expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MENU_DELETE_OK' })
// })

// it('should display error message on delete menu item', () => {
//   menuApiServiceSpy.deleteMenuItemById.and.returnValue(throwError(() => new Error()))

//   component.onMenuDelete()

//   expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MENU_DELETE_NOK' })
// })

// it('should update tabIndex onTabPanelChange', () => {
//   let mockEvent = { index: 3 }

//   component.onTabPanelChange(mockEvent)

//   expect(component.tabIndex).toBe(mockEvent.index)
// })

// it('should update properties onCloseDetailDialog', () => {
//   component.onCloseDetailDialog()

//   expect(component.menuItem).toBeUndefined()
//   expect(component.displayMenuDetail).toBeFalse()
// })

// it('should remove language from languagesDisplayed, add it to languagesAvailable', () => {
//   component.languagesDisplayed = [{ label: 'English', value: 'en', data: 'Data' }]
//   component.languagesAvailable = [{ label: 'German', value: 'de', data: '' }]

//   component.onRemoveLanguage('en')

//   expect(component.languagesDisplayed.length).toBe(0)
//   expect(component.languagesAvailable).toEqual(jasmine.arrayContaining([{ label: 'English', value: 'en', data: '' }]))
// })

// it('should add language to languagesDisplayed from languagesAvailable', () => {
//   component.languagesDisplayed = []
//   component.languagesAvailable = [{ label: 'English', value: 'en', data: '' }]

//   component.onAddLanguage2({ option: { value: 'en' } })

//   expect(component.languagesDisplayed).toEqual(jasmine.arrayContaining([{ label: 'English', value: 'en', data: '' }]))
//   expect(component.languagesAvailable.length).toBe(0)
// })

// it('should add language to languagesDisplayed from languagesAvailable using string value', () => {
//   component.languagesDisplayed = []
//   component.languagesAvailable = [{ label: 'English', value: 'en', data: '' }]

//   component.onAddLanguage('en')

//   expect(component.languagesDisplayed).toEqual(jasmine.arrayContaining([{ label: 'English', value: 'en', data: '' }]))
//   expect(component.languagesAvailable.length).toBe(0)
// })

// it('should return label of language if in languagesDisplayed', () => {
//   component.languagesDisplayed = [{ label: 'English', value: 'en', data: '' }]

//   const label = component.getLanguageLabel('en')

//   expect(label).toBe('English')
// })

// it('if not in languagesDisplayed: return undefined on getLanguageLabel', () => {
//   component.languagesDisplayed = []

//   const label = component.getLanguageLabel('en')

//   expect(label).toBeUndefined()
// })

// it('should return true if language not in languagesDisplayed', () => {
//   component.languagesDisplayed = [{ label: 'English', value: 'en', data: '' }]

//   expect(component.displayLanguageField('de')).toBeTrue()
//   expect(component.displayLanguageField('en')).toBeFalse()
// })

// /* Test modification of built-in Angular class registerOnChange at top of the file  */
// @Component({
//   template: `<input type="text" [(ngModel)]="value" />`
// })
// class TestComponent {
//   value = ''
// }

// describe('DefaultValueAccessor prototype modification', () => {
//   let component: TestComponent
//   let fixture: ComponentFixture<TestComponent>
//   let inputElement: HTMLInputElement

//   beforeEach(async () => {
//     await TestBed.configureTestingModule({
//       declarations: [TestComponent],
//       imports: [FormsModule]
//     }).compileComponents()

//     fixture = TestBed.createComponent(TestComponent)
//     component = fixture.componentInstance
//     fixture.detectChanges()

//     inputElement = fixture.nativeElement.querySelector('input')
//   })

//   it('should trim the value on model change', () => {
//     inputElement.value = '  test  '
//     inputElement.dispatchEvent(new Event('input'))
//     fixture.detectChanges()

//     expect(component.value).toBe('test')
//   })

// })
