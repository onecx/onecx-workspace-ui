import { NO_ERRORS_SCHEMA, Component } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
// import { HttpErrorResponse } from '@angular/common/http'
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms'
import { Location } from '@angular/common'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router'
import { BehaviorSubject, of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'

import { MenuDetailComponent } from './menu-detail.component'
import { TranslateTestingModule } from 'ngx-translate-testing'
import {
  WorkspaceProductAPIService,
  MenuItemAPIService,
  MenuItem,
  Product,
  Microfrontend,
  Scope
} from 'src/app/shared/generated'
import { TabView } from 'primeng/tabview'
import { DropDownChangeEvent } from 'src/app/shared/utils'

const form = new FormGroup({
  parentItemId: new FormControl('some parent id'),
  key: new FormControl('key', Validators.minLength(2)),
  name: new FormControl('name'),
  position: new FormControl('1'),
  disabled: new FormControl<boolean>(false),
  external: new FormControl<boolean>(false),
  url: new FormControl('url'),
  badge: new FormControl('badge'),
  scope: new FormControl('scope'),
  description: new FormControl('description')
})

const mockMenuItems: MenuItem[] = [
  {
    id: 'id',
    modificationCount: 0,
    parentItemId: 'parentId',
    key: 'key',
    name: 'menu name',
    position: 0,
    external: false,
    disabled: false,
    badge: 'badge',
    scope: Scope.App,
    description: 'description'
  },
  {
    id: 'id2',
    parentItemId: 'parentId',
    key: 'key2',
    name: 'menu2 name',
    i18n: { ['es']: 'es' },
    url: '/workspace',
    modificationCount: 0
  }
]

const microfrontend: Microfrontend = {
  id: 'id',
  appId: 'appId',
  basePath: 'path'
}

const product: Product = {
  id: 'prod id',
  productName: 'prod name',
  displayName: 'display name',
  description: 'description',
  microfrontends: [microfrontend],
  modificationCount: 1
}

fdescribe('MenuDetailComponent', () => {
  let component: MenuDetailComponent
  let fixture: ComponentFixture<MenuDetailComponent>
  let mockActivatedRoute: Partial<ActivatedRoute>
  let mockUserService: any

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const wProductApiServiceSpy = {
    getProductsForWorkspaceId: jasmine.createSpy('getProductsForWorkspaceId').and.returnValue(of({}))
  }
  const menuApiServiceSpy = {
    getMenuStructure: jasmine.createSpy('getMenuStructure').and.returnValue(of(mockMenuItems)),
    getMenuItemById: jasmine.createSpy('getMenuItemById').and.returnValue(of(mockMenuItems)),
    createMenuItemForWorkspace: jasmine.createSpy('createMenuItemForWorkspace').and.returnValue(of(mockMenuItems)),
    updateMenuItem: jasmine.createSpy('updateMenuItem').and.returnValue(of(mockMenuItems)),
    deleteMenuItemById: jasmine.createSpy('deleteMenuItemById').and.returnValue(of({})),
    exportMenuByWorkspaceName: jasmine.createSpy('exportMenuByWorkspaceName').and.returnValue(of({}))
  }
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['get'])
  const locationSpy = jasmine.createSpyObj<Location>('Location', ['back'])

  const mockActivatedRouteSnapshot: Partial<ActivatedRouteSnapshot> = {
    params: {
      id: 'mockId'
    }
  }
  mockActivatedRoute = {
    snapshot: mockActivatedRouteSnapshot as ActivatedRouteSnapshot
  }

  beforeEach(waitForAsync(() => {
    mockUserService = { lang$: new BehaviorSubject('de') }
    TestBed.configureTestingModule({
      declarations: [MenuDetailComponent],
      imports: [
        HttpClientTestingModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceProductAPIService, useValue: wProductApiServiceSpy },
        { provide: MenuItemAPIService, useValue: menuApiServiceSpy },
        { provide: Location, useValue: locationSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    wProductApiServiceSpy.getProductsForWorkspaceId.calls.reset()
    menuApiServiceSpy.getMenuItemById.calls.reset()
    menuApiServiceSpy.getMenuStructure.calls.reset()
    menuApiServiceSpy.deleteMenuItemById.calls.reset()
    menuApiServiceSpy.createMenuItemForWorkspace.calls.reset()
    menuApiServiceSpy.updateMenuItem.calls.reset()
    translateServiceSpy.get.calls.reset()
  }))

  function initializeComponent(): void {
    fixture = TestBed.createComponent(MenuDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(() => {
    initializeComponent()
    component.formGroup = form
  })

  fit('should create', () => {
    expect(component).toBeTruthy()
  })

  fit('should set German date format', () => {
    mockUserService.lang$.next('de')
    initializeComponent()

    expect(component.dateFormat).toEqual('dd.MM.yyyy HH:mm')
  })

  fit('should set English date format', () => {
    mockUserService.lang$.next('en')
    initializeComponent()

    expect(component.dateFormat).toEqual('short')
  })

  fit('should init menuItem and set formGroup in create mode onChanges', () => {
    component.changeMode = 'CREATE'
    spyOn(component.formGroup, 'reset')
    component.menuItemId = 'menuItemId'

    component.ngOnChanges()

    expect(component.formGroup.reset).toHaveBeenCalled()
    expect(component.menuItem?.parentItemId).toBe('menuItemId')
    expect(component.formGroup.controls['parentItemId'].value).toBe('menuItemId')
  })

  fit('should call getMenu in view mode onChanges and fetch menuItem', () => {
    menuApiServiceSpy.getMenuItemById.and.returnValue(of(mockMenuItems[0]))
    component.changeMode = 'VIEW'
    component.menuItemId = 'menuItemId'

    component.ngOnChanges()

    expect(component.menuItem).toBe(mockMenuItems[0])
  })

  fit('should call getMenu in view mode onChanges and fetch menuItem', () => {
    menuApiServiceSpy.getMenuItemById.and.returnValue(of(mockMenuItems[0]))
    wProductApiServiceSpy.getProductsForWorkspaceId.and.returnValue(of([product]))
    component.changeMode = 'VIEW'
    component.menuItemId = 'menuItemId'
    component.displayDetailDialog = true
    spyOn(component as any, 'loadMfeUrls')
    spyOn(component as any, 'preparePanelHeight')

    component.ngOnChanges()

    expect(component.menuItem).toBe(mockMenuItems[0])
    expect((component as any).loadMfeUrls).toHaveBeenCalled()
    expect((component as any).preparePanelHeight).toHaveBeenCalled()
  })

  fit('should call getMenu in view mode onChanges and fetch undefined menuItem', () => {
    menuApiServiceSpy.getMenuItemById.and.returnValue(of(undefined))
    component.changeMode = 'VIEW'
    component.menuItemId = 'menuItemId'

    component.ngOnChanges()

    expect(component.menuItem).toBe(undefined)
  })

  fit('should call getMenu in view mode onChanges and catch error if api call fails', () => {
    menuApiServiceSpy.getMenuItemById.and.returnValue(throwError(() => new Error('test error')))
    component.changeMode = 'VIEW'
    component.menuItemId = 'menuItemId'

    component.ngOnChanges()

    expect(component.menuItem).not.toBe(mockMenuItems[0])
  })

  fit('should call getMenu in view mode onChanges and fetch menuItem', () => {
    menuApiServiceSpy.getMenuItemById.and.returnValue(of(mockMenuItems[0]))
    wProductApiServiceSpy.getProductsForWorkspaceId.and.returnValue(of([product]))
    component.changeMode = 'VIEW'
    component.menuItemId = 'menuItemId'
    component.displayDetailDialog = true
    spyOn(component as any, 'loadMfeUrls')
    spyOn(component as any, 'preparePanelHeight')

    component.ngOnChanges()

    expect(component.menuItem).toBe(mockMenuItems[0])
    expect((component as any).loadMfeUrls).toHaveBeenCalled()
    expect((component as any).preparePanelHeight).toHaveBeenCalled()
  })

  /**
   * LOAD Microfrontends from registered products
   **/

  xit('should loadMfeUrls', () => {
    menuApiServiceSpy.getMenuItemById.and.returnValue(of(mockMenuItems[0]))
    wProductApiServiceSpy.getProductsForWorkspaceId.and.returnValue(of([product]))
    component.changeMode = 'VIEW'
    component.menuItemId = 'menuItemId'
    component.displayDetailDialog = true
    spyOn(component as any, 'preparePanelHeight')

    component.ngOnChanges()

    expect(component.mfeItems).toBe([microfrontend])
    expect((component as any).preparePanelHeight).toHaveBeenCalled()
  })

  xit('should loadMfeUrls: no product display name', () => {
    const productWithoutDisplayName: Product = {
      id: 'prod id',
      productName: 'prod name',
      description: 'description',
      microfrontends: [microfrontend],
      modificationCount: 1
    }
    menuApiServiceSpy.getMenuItemById.and.returnValue(of(mockMenuItems[0]))
    wProductApiServiceSpy.getProductsForWorkspaceId.and.returnValue(of([productWithoutDisplayName]))
    component.changeMode = 'VIEW'
    component.menuItemId = 'menuItemId'
    component.displayDetailDialog = true
    spyOn(component as any, 'preparePanelHeight')

    component.ngOnChanges()

    expect(component.mfeItems).toBe([{ ...microfrontend, product: 'display name' }])
    expect((component as any).preparePanelHeight).toHaveBeenCalled()
  })

  fit('should emit false when onCloseDetailDialog is called', () => {
    spyOn(component.dataChanged, 'emit')

    component.onCloseDetailDialog()

    expect(component.dataChanged.emit).toHaveBeenCalledWith(false)
  })

  fit('should emit false when onCloseDeleteDialog is called', () => {
    spyOn(component.dataChanged, 'emit')

    component.onCloseDeleteDialog()

    expect(component.dataChanged.emit).toHaveBeenCalledWith(false)
  })

  /***************************************************************************
   * SAVE => CREATE + UPDATE
   **************************************************************************/

  fit('should log error and return if form invalid onMenuSave', () => {
    const form = new FormGroup({
      parentItemId: new FormControl('some parent id'),
      key: new FormControl('key', Validators.minLength(2))
    })
    form.controls['key'].setValue('')
    form.controls['key'].setErrors({ minLength: true })
    component.formGroup = form
    spyOn(console, 'error')

    component.onMenuSave()

    expect(console.error).toHaveBeenCalledWith('non valid form', component.formGroup)
  })

  fit('should retrieve basePath from url form control if it is an object onMenuSave', () => {
    const form = new FormGroup({
      parentItemId: new FormControl('some parent id'),
      key: new FormControl('key', Validators.minLength(2)),
      name: new FormControl('name'),
      position: new FormControl('1'),
      disabled: new FormControl<boolean>(false),
      external: new FormControl<boolean>(false),
      url: new FormControl({
        basePath: 'url basePath'
      }),
      badge: new FormControl('badge'),
      scope: new FormControl('scope'),
      description: new FormControl('description')
    })
    component.formGroup = form
    component.menuItem = mockMenuItems[0]

    component.onMenuSave()

    expect(component.menuItem.url).toBe('url basePath')
  })

  fit('should save a menu: create', () => {
    menuApiServiceSpy.createMenuItemForWorkspace.and.returnValue(of({}))
    component.formGroup = form
    component.menuItem = mockMenuItems[0]
    component.changeMode = 'CREATE'
    component.languagesDisplayed = [{ label: 'English', value: 'en', data: 'data' }]

    component.onMenuSave()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.MENU_CREATE_OK' })
  })

  fit('should display error message on save menu: create', () => {
    menuApiServiceSpy.createMenuItemForWorkspace.and.returnValue(throwError(() => new Error()))
    component.formGroup = form
    component.menuItem = mockMenuItems[0]
    component.changeMode = 'CREATE'

    component.onMenuSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.MENU_CREATE_NOK' })
  })

  fit('should save a menu: edit', () => {
    menuApiServiceSpy.updateMenuItem.and.returnValue(of(mockMenuItems))
    component.formGroup = form
    component.menuItem = mockMenuItems[0]
    component.menuItems = mockMenuItems
    component.menuItemId = 'id'
    component.changeMode = 'EDIT'

    component.onMenuSave()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_OK' })
  })

  fit('should display error message on save menu: edit', () => {
    menuApiServiceSpy.updateMenuItem.and.returnValue(throwError(() => new Error()))
    component.formGroup = form
    component.menuItem = mockMenuItems[0]
    component.changeMode = 'EDIT'
    component.menuItemId = 'id'

    component.onMenuSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_NOK' })
  })

  /**
   * DELETE
   */

  fit('should delete menu item', () => {
    menuApiServiceSpy.deleteMenuItemById({ menuItemId: 'id' })
    component.menuItem = mockMenuItems[0]

    component.onMenuDelete()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MENU_OK' })
  })

  fit('should display error message on delete menu item', () => {
    menuApiServiceSpy.deleteMenuItemById.and.returnValue(throwError(() => new Error()))

    component.onMenuDelete()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MENU_NOK' })
  })

  fit('should update tabIndex onTabPanelChange', () => {
    let mockEvent = { index: 3 }
    spyOn(component as any, 'preparePanelHeight')

    component.onTabPanelChange(mockEvent)

    expect(component.tabIndex).toBe(mockEvent.index)
    expect((component as any).preparePanelHeight).toHaveBeenCalled()
  })

  fit('should return when no panelDetail preparePanelHeight', () => {
    component.panelDetail = undefined

    component.onTabPanelChange({ index: 3 })

    expect((component as any).panelHeight).toBe(0)
  })

  fit('should preparePanelHeight', () => {
    const nativeElement = document.createElement('div')
    nativeElement.style.height = '100px' // cannot reach the correct value offsetHeight, this test is quite useless
    const mockTabView: Partial<TabView> = {
      el: {
        nativeElement: nativeElement
      },
      orientation: 'horizontal',
      style: {},
      styleClass: ''
    }
    component.panelDetail = mockTabView as any
    spyOn((component as any).renderer, 'setStyle').and.callThrough()

    component.onTabPanelChange({ index: 3 })

    expect((component as any).panelHeight).toBe(0)
  })

  /**
   * LANGUAGE
   */

  fit('should return if no languagesDisplayed on prepareLanguagePanel', () => {
    const languagesDisplayed = [
      { label: component.languageNames['de'], value: 'de', data: '' },
      { label: component.languageNames['en'], value: 'en', data: '' }
    ]
    component.languagesDisplayed = languagesDisplayed

    component.prepareLanguagePanel()

    expect(component.languagesDisplayed).toBe(languagesDisplayed)
  })

  fit('should prepareLanguagePanel: language of menuItem is added', () => {
    const languagesDisplayed: any = []
    component.languagesDisplayed = languagesDisplayed
    component.menuItem = mockMenuItems[1]
    spyOn(component, 'onAddLanguage')

    component.prepareLanguagePanel()

    expect(component.onAddLanguage).toHaveBeenCalled()
  })

  fit('should prepareLanguagePanel: language of menuItem exists', () => {
    const languagesDisplayed: any = []
    component.languagesDisplayed = languagesDisplayed
    const mockMenuItem: MenuItem = {
      id: 'id2',
      parentItemId: 'parentId',
      key: 'key2',
      name: 'menu2 name',
      i18n: { ['en']: 'en' },
      url: '/workspace',
      modificationCount: 0
    }
    component.menuItem = mockMenuItem

    component.prepareLanguagePanel()

    expect(component.languagesDisplayed[1].value).toBe('en')
  })

  fit('should remove language from languagesDisplayed, add it to languagesAvailable', () => {
    component.languagesDisplayed = [{ label: 'English', value: 'en', data: 'Data' }]
    component.languagesAvailable = [{ label: 'German', value: 'de', data: '' }]

    component.onRemoveLanguage('en')

    expect(component.languagesDisplayed.length).toBe(0)
    expect(component.languagesAvailable).toEqual(jasmine.arrayContaining([{ label: 'English', value: 'en', data: '' }]))
  })

  fit('should add language to languagesDisplayed from languagesAvailable', () => {
    component.languagesDisplayed = []
    component.languagesAvailable = [{ label: 'English', value: 'en', data: '' }]

    component.onAddLanguage2({ option: { value: 'en' } })

    expect(component.languagesDisplayed).toEqual(jasmine.arrayContaining([{ label: 'English', value: 'en', data: '' }]))
    expect(component.languagesAvailable.length).toBe(0)
  })

  fit('should add language to languagesDisplayed from languagesAvailable using string value', () => {
    component.languagesDisplayed = []
    component.languagesAvailable = [{ label: 'English', value: 'en', data: '' }]

    component.onAddLanguage('en')

    expect(component.languagesDisplayed).toEqual(jasmine.arrayContaining([{ label: 'English', value: 'en', data: '' }]))
    expect(component.languagesAvailable.length).toBe(0)
  })

  fit('should return label of language if in languagesDisplayed', () => {
    component.languagesDisplayed = [{ label: 'English', value: 'en', data: '' }]

    const label = component.getLanguageLabel('en')

    expect(label).toBe('English')
  })

  fit('should return undefined if not exactly one match with languagesDisplayed', () => {
    component.languagesDisplayed = [
      { label: 'English', value: 'en1', data: '' },
      { label: 'English2', value: 'en2', data: '' }
    ]

    const label = component.getLanguageLabel('en')

    expect(label).toBeUndefined()
  })

  fit('if not in languagesDisplayed: return undefined on getLanguageLabel', () => {
    component.languagesDisplayed = []

    const label = component.getLanguageLabel('en')

    expect(label).toBeUndefined()
  })

  fit('should return true if language not in languagesDisplayed', () => {
    component.languagesDisplayed = [{ label: 'English', value: 'en', data: '' }]

    expect(component.displayLanguageField('de')).toBeTrue()
    expect(component.displayLanguageField('en')).toBeFalse()
  })

  /***************************************************************************
   * EVENTS on URL field
   **************************************************************************/

  fit('should set overlayVisible to true on field onFocusUrl', () => {
    let mockField: any = { overlayVisible: false }

    component.onFocusUrl(mockField)

    expect(mockField.overlayVisible).toBeTrue()
  })

  fit('should update selectedMfe based on value from mfeMap onSelectPath', () => {
    const mouseEvent = jasmine.createSpyObj('MouseEvent', ['preventDefault', 'stopPropagation'])
    const mockEvent: DropDownChangeEvent = { ...mouseEvent, value: 'testPath' }
    const expectedMfe = { ...microfrontend }
    component.mfeMap = new Map()
    component.mfeMap.set('testPath', expectedMfe)

    component.onSelectPath(mockEvent)

    expect(component.selectedMfe).toBe(expectedMfe)
  })

  fit('should reset selectedMfe and set the formGroup url control to the first mfeItem when onClearPath is called', () => {
    component.mfeItems = [microfrontend]
    component.formGroup = new FormGroup({
      url: new FormControl('')
    })

    component.onClearPath()

    expect(component.selectedMfe).toEqual(component.mfeItems[0])
    expect(component.formGroup.controls['url'].value).toEqual(component.mfeItems[0])
  })

  /**
   * FILTER URL (query)
   *   try to filter with best match with some exceptions:
   *     a) empty query => list all
   *     b) unknown entry => list all
   */

  fit('should filter MFE items based on the query', () => {
    const mockEvent = { originalEvent: new Event('filter'), query: 'pa' }
    component.formGroup = new FormGroup({
      url: new FormControl('')
    })
    component.mfeItems = [microfrontend]

    component.onFilterPaths(mockEvent)

    expect(component.filteredMfes.length).toBe(1)
    expect(component.filteredMfes[0].id).toBe('id')
  })

  fit('should assign all MFE items if query is empty', () => {
    const mockEvent = { originalEvent: new Event('filter'), query: '' }

    component.onFilterPaths(mockEvent)

    expect(component.filteredMfes).toEqual(component.mfeItems)
  })

  fit('should use url object basePath if query is not provided', () => {
    component.formGroup.controls['url'].setValue({ basePath: 'path' })
    const mockEvent = { originalEvent: new Event('filter'), query: '' }

    component.mfeItems = [microfrontend]

    component.onFilterPaths(mockEvent)

    expect(component.filteredMfes.length).toBe(1)
    expect(component.filteredMfes[0].basePath).toBe('path')
  })

  xit('should check if the query is found at the beginning of mfe path', () => {
    const mockEvent = { originalEvent: new Event('filter'), query: 'url' }
    component.formGroup = new FormGroup({
      url: new FormControl({
        basePath: 'url basePath'
      })
    })
    component.mfeItems = [microfrontend]

    component.onFilterPaths(mockEvent)

    expect(component.filteredMfes.length).toBe(1)
    expect(component.filteredMfes[0].basePath).toBe('url basePath')
  })

  fit('should filter MFE items based on the query', () => {
    const mockEvent = { originalEvent: new Event('filter'), query: 'pa' }
    component.formGroup = new FormGroup({
      url: new FormControl('')
    })
    const microfrontendNoId: Microfrontend = {
      appId: 'appId',
      basePath: 'path'
    }
    component.mfeItems = [microfrontendNoId, microfrontend]

    component.onFilterPaths(mockEvent)

    expect(component.filteredMfes.length).toBe(2)
    expect(component.filteredMfes[0].id).toBeUndefined()
  })
})

/* Test modification of built-in Angular class registerOnChange at top of the file  */
@Component({
  template: `<input type="text" [(ngModel)]="value" />`
})
class TestComponent {
  value: any = ''
}
fdescribe('DefaultValueAccessor prototype modification', () => {
  let component: TestComponent
  let fixture: ComponentFixture<TestComponent>
  let inputElement: HTMLInputElement

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestComponent],
      imports: [FormsModule]
    }).compileComponents()

    fixture = TestBed.createComponent(TestComponent)
    component = fixture.componentInstance
    fixture.detectChanges()

    inputElement = fixture.nativeElement.querySelector('input')
  })

  fit('should trim the value on model change: value is of type string', () => {
    inputElement.value = '  test  '
    inputElement.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    expect(component.value).toBe('test')
  })

  // fit('should trim the value on model change: value not of type string', () => {
  //   component.value = 123

  //   fixture.detectChanges()
  //   inputElement.dispatchEvent(new Event('input'))
  //   fixture.detectChanges()

  //   expect(component.value).toBe(123)
  // })
})
