import { NO_ERRORS_SCHEMA, Component, SimpleChange } from '@angular/core'
import { Location } from '@angular/common'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms'
import { By } from '@angular/platform-browser'
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router'
import { BehaviorSubject, of, throwError } from 'rxjs'
import { TabView } from 'primeng/tabview'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'

import { MenuDetailComponent } from './menu-detail.component'
import {
  WorkspaceProductAPIService,
  MenuItemAPIService,
  MenuItem,
  Product,
  Microfrontend,
  Scope
} from 'src/app/shared/generated'
import { MenuURL } from './menu-detail.component'

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
    description: 'description',
    url: '/workspace'
  },
  {
    id: 'id2',
    parentItemId: 'parentId',
    key: 'key2',
    name: 'menu2 name',
    i18n: { ['es']: 'es' },
    url: '/workspace',
    modificationCount: 0
  },
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
    description: 'description',
    url: 'http://testdomain/workspace'
  },
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
    description: 'description',
    url: 'path'
  },
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
    description: 'description',
    url: 'PATHEXT'
  }
]

const microfrontend: Microfrontend = {
  id: 'id',
  appId: 'appId',
  basePath: '/path'
}

const product: Product = {
  id: 'prod id',
  baseUrl: '/base',
  productName: 'prod name',
  displayName: 'display name',
  description: 'description',
  microfrontends: [microfrontend],
  modificationCount: 1
}

describe('MenuDetailComponent', () => {
  let component: MenuDetailComponent
  let fixture: ComponentFixture<MenuDetailComponent>
  let mockUserService: any

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const wProductApiServiceSpy = {
    getProductsByWorkspaceId: jasmine.createSpy('getProductsByWorkspaceId').and.returnValue(of({}))
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
  const mockActivatedRoute: Partial<ActivatedRoute> = {
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
    wProductApiServiceSpy.getProductsByWorkspaceId.calls.reset()
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

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should set German date format', () => {
    mockUserService.lang$.next('de')
    initializeComponent()

    expect(component.dateFormat).toEqual('dd.MM.yyyy HH:mm')
  })

  it('should set English date format', () => {
    mockUserService.lang$.next('en')
    initializeComponent()

    expect(component.dateFormat).toEqual('short')
  })

  describe('ngOnChanges', () => {
    it('should notify data has not changed and return', () => {
      spyOn(component.dataChanged, 'emit')

      component.ngOnChanges({})

      expect(component.dataChanged.emit).toHaveBeenCalledWith(false)
    })

    it('should init menuItem and set formGroup in create mode onChanges', () => {
      component.changeMode = 'CREATE'
      spyOn(component.formGroup, 'reset')
      component.menuItemId = 'menuItemId'
      component.displayDetailDialog = true

      component.ngOnChanges({})

      expect(component.formGroup.reset).toHaveBeenCalled()
      expect(component.menuItem?.parentItemId).toBe('menuItemId')
      expect(component.formGroup.controls['parentItemId'].value).toBe('menuItemId')
    })

    it('should call getMenu in view mode onChanges and fetch menuItem', () => {
      menuApiServiceSpy.getMenuItemById.and.returnValue(of(mockMenuItems[0]))
      component.changeMode = 'VIEW'
      component.menuItemId = 'menuItemId'
      component.displayDetailDialog = true

      component.ngOnChanges({})

      expect(component.menuItem).toBe(mockMenuItems[0])
    })

    it('should call getMenu in view mode onChanges and fetch menuItem', () => {
      menuApiServiceSpy.getMenuItemById.and.returnValue(of(mockMenuItems[0]))
      wProductApiServiceSpy.getProductsByWorkspaceId.and.returnValue(of([product]))
      component.changeMode = 'VIEW'
      component.workspaceId = 'id'
      component.menuItemId = 'menuItemId'
      component.displayDetailDialog = true
      spyOn(component as any, 'preparePanelHeight')
      spyOn(component as any, 'loadMfeUrls')

      component.ngOnChanges({ workspaceId: {} as SimpleChange })

      expect(component.menuItem).toBe(mockMenuItems[0])
      expect((component as any).preparePanelHeight).toHaveBeenCalled()
      expect((component as any).loadMfeUrls).toHaveBeenCalled()
    })

    it('should call getMenu in view mode onChanges and fetch undefined menuItem', () => {
      menuApiServiceSpy.getMenuItemById.and.returnValue(of(undefined))
      component.changeMode = 'VIEW'
      component.menuItemId = 'menuItemId'
      component.displayDetailDialog = true

      component.ngOnChanges({})

      expect(component.menuItem).toBe(undefined)
    })

    it('should call getMenu in view mode onChanges and catch error if api call fails', () => {
      const testError = { error: 'test error message' }
      menuApiServiceSpy.getMenuItemById.and.returnValue(throwError(() => testError))
      spyOn(console, 'error')

      component['getMenu']()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.MENU.MENU_ITEM_NOT_FOUND' })
      expect(console.error).toHaveBeenCalledWith('test error message')
    })

    it('should filter out items with isSpecial set to true', () => {
      component.mfeItems = [{ isSpecial: false }, { isSpecial: true }, { isSpecial: false }, { isSpecial: true }]

      component['cleanupMfeUrls']()

      expect(component.mfeItems).toEqual([{ isSpecial: false }, { isSpecial: false }])
    })

    /**
     * LOAD Microfrontends from registered products
     **/

    describe('loadMfeUrls', () => {
      it('should loadMfeUrls: with product display name', () => {
        menuApiServiceSpy.getMenuItemById.and.returnValue(of(mockMenuItems[0]))
        wProductApiServiceSpy.getProductsByWorkspaceId.and.returnValue(of([product]))
        component.changeMode = 'VIEW'
        component.menuItemId = 'menuItemId'
        component.workspaceId = 'workspaceId'
        component.displayDetailDialog = true
        spyOn(component as any, 'preparePanelHeight')

        component.ngOnChanges({ workspaceId: {} as SimpleChange })

        const controlMfeItems: MenuURL[] = []
        controlMfeItems.push({ mfePath: '/workspace', product: 'MENU_ITEM.URL.UNKNOWN.PRODUCT', isSpecial: true })
        controlMfeItems.push({ mfePath: '', product: 'MENU_ITEM.URL.EMPTY' })
        controlMfeItems.push({ ...microfrontend, mfePath: '/path/base', product: 'display name', isSpecial: false })
        expect(component.mfeItems).toEqual(controlMfeItems)
        expect((component as any).preparePanelHeight).toHaveBeenCalled()
      })

      it('should display error when trying to loadMfeUrls', () => {
        menuApiServiceSpy.getMenuItemById.and.returnValue(of(mockMenuItems[0]))
        wProductApiServiceSpy.getProductsByWorkspaceId.and.returnValue(throwError(() => new Error()))
        component.changeMode = 'VIEW'
        component.workspaceId = 'workspaceId'
        component.menuItemId = 'menuItemId'
        component.displayDetailDialog = true
        spyOn(component as any, 'preparePanelHeight')
        spyOn(console, 'error')

        component.ngOnChanges({ workspaceId: {} as SimpleChange })

        expect(console.error).toHaveBeenCalledWith('getProductsByWorkspaceId():', new Error())
        expect((component as any).preparePanelHeight).toHaveBeenCalled()
      })
    })

    it('should return if no mfeItems are there to load', () => {
      const controlMfeItems: MenuURL[] = []
      controlMfeItems.push({ mfePath: '/workspace', product: 'MENU_ITEM.URL.UNKNOWN.PRODUCT', isSpecial: true })
      controlMfeItems.push({ mfePath: '', product: 'MENU_ITEM.URL.EMPTY' })
      component.mfeItems = controlMfeItems

      component['loadMfeUrls']()

      expect(wProductApiServiceSpy.getProductsByWorkspaceId).not.toHaveBeenCalled()
    })
  })

  describe('prepareUrlList', () => {
    it('should prepare URL list with correct mfePath', () => {
      component.mfeItems = [microfrontend]

      const result = component['prepareUrlList']('http://url')

      expect(result).toEqual({
        mfePath: 'http://url',
        product: 'MENU_ITEM.URL.HTTP',
        isSpecial: true
      } as MenuURL)
    })

    it('should return the matching item for a perfect match', () => {
      const mfeItems: MenuURL[] = [
        { mfePath: 'http://url/path1', product: 'Product 1' },
        { mfePath: 'http://url/path2', product: 'Product 2' }
      ]

      component.mfeItems = mfeItems

      const [result, itemCreated] = component['searchMfeForBasePathMatch']('http://url/path1')

      expect(result).toEqual(mfeItems[0])
      expect(itemCreated).toBe(false)
    })

    it('should return a special item for an extended match', () => {
      const mfeItems: MenuURL[] = [
        { mfePath: 'http://url/path1', product: 'Product 1' },
        { mfePath: 'http://url/path2', product: 'Product 2' }
      ]

      component.mfeItems = mfeItems

      const [result, itemCreated] = component['searchMfeForBasePathMatch']('http://url/path1/subpath')

      expect(result).toEqual({ ...mfeItems[0], mfePath: 'http://url/path1/subpath', isSpecial: true })
      expect(itemCreated).toBe(true)
    })
  })

  describe('onCloseDetailDialog', () => {
    it('should emit false when onCloseDetailDialog is called', () => {
      spyOn(component.dataChanged, 'emit')

      component.onCloseDetailDialog()

      expect(component.dataChanged.emit).toHaveBeenCalledWith(false)
    })

    it('should emit false when onCloseDeleteDialog is called', () => {
      spyOn(component.dataChanged, 'emit')

      component.onCloseDeleteDialog()

      expect(component.dataChanged.emit).toHaveBeenCalledWith(false)
    })
  })

  /***************************************************************************
   * SAVE => CREATE + UPDATE
   **************************************************************************/

  it('should log error and return if form invalid onMenuSave', () => {
    const form = new FormGroup({
      parentItemId: new FormControl('some parent id'),
      key: new FormControl('key', Validators.minLength(2))
    })
    form.controls['key'].setValue('')
    form.controls['key'].setErrors({ minLength: true })
    component.formGroup = form
    spyOn(console, 'error')

    component.onMenuSave()

    expect(console.error).toHaveBeenCalledWith('invalid form', component.formGroup)
  })

  it('should retrieve mfePath from url form control if it is an object onMenuSave', () => {
    const form = new FormGroup({
      parentItemId: new FormControl('some parent id'),
      key: new FormControl('key', Validators.minLength(2)),
      name: new FormControl('name'),
      position: new FormControl('1'),
      disabled: new FormControl<boolean>(false),
      external: new FormControl<boolean>(false),
      url: new FormControl({
        mfePath: 'url mfePath'
      }),
      badge: new FormControl('badge'),
      scope: new FormControl('scope'),
      description: new FormControl('description')
    })
    component.formGroup = form
    component.menuItem = mockMenuItems[0]

    component.onMenuSave()

    expect(component.menuItem.url).toBe('url mfePath')
  })

  it('should save a menu: create', () => {
    menuApiServiceSpy.createMenuItemForWorkspace.and.returnValue(of({}))
    component.formGroup = new FormGroup({
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
    component.menuItem = mockMenuItems[0]
    component.changeMode = 'CREATE'
    component.languagesDisplayed = [{ label: 'English', value: 'en', data: 'data' }]

    component.onMenuSave()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.MENU_CREATE_OK' })
  })

  it('should display error message on save menu: create', () => {
    menuApiServiceSpy.createMenuItemForWorkspace.and.returnValue(throwError(() => new Error()))
    component.formGroup = form
    component.menuItem = mockMenuItems[0]
    component.changeMode = 'CREATE'

    component.onMenuSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.MENU_CREATE_NOK' })
  })

  it('should save a menu: edit', () => {
    menuApiServiceSpy.updateMenuItem.and.returnValue(of(mockMenuItems))
    component.formGroup = form
    component.menuItem = mockMenuItems[0]
    component.menuItems = mockMenuItems
    component.menuItemId = 'id'
    component.changeMode = 'EDIT'

    component.onMenuSave()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_OK' })
  })

  it('should display error message on save menu: edit', () => {
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

  it('should delete menu item', () => {
    menuApiServiceSpy.deleteMenuItemById({ menuItemId: 'id' })
    component.menuItem = mockMenuItems[0]

    component.onMenuDelete()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MENU_OK' })
  })

  it('should display error message on delete menu item', () => {
    menuApiServiceSpy.deleteMenuItemById.and.returnValue(throwError(() => new Error()))

    component.onMenuDelete()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MENU_NOK' })
  })

  it('should update tabIndex onTabPanelChange', () => {
    const mockEvent = { index: 3 }
    spyOn(component as any, 'preparePanelHeight')

    component.onTabPanelChange(mockEvent)

    expect(component.tabIndex).toBe(mockEvent.index)
    expect((component as any).preparePanelHeight).toHaveBeenCalled()
  })

  it('should return when no panelDetail preparePanelHeight', () => {
    component.panelDetail = undefined

    component.onTabPanelChange({ index: 3 })

    expect((component as any).panelHeight).toBe(0)
  })

  it('should preparePanelHeight', () => {
    const nativeElement = document.createElement('div')
    nativeElement.style.height = '100px' // cannot reach the correct value offsetHeight, this test is quite useless
    const mockTabView: Partial<TabView> = {
      el: {
        nativeElement: nativeElement
      },
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

  it('should return if no languagesDisplayed on prepareLanguagePanel', () => {
    const languagesDisplayed = [
      { label: component.languageNames['de'], value: 'de', data: '' },
      { label: component.languageNames['en'], value: 'en', data: '' }
    ]
    component.languagesDisplayed = languagesDisplayed

    component.prepareLanguagePanel()

    expect(component.languagesDisplayed).toBe(languagesDisplayed)
  })

  it('should prepareLanguagePanel: language of menuItem is added', () => {
    const languagesDisplayed: any = []
    component.languagesDisplayed = languagesDisplayed
    component.menuItem = mockMenuItems[1]
    spyOn(component, 'onAddLanguage')

    component.prepareLanguagePanel()

    expect(component.onAddLanguage).toHaveBeenCalled()
  })

  it('should prepareLanguagePanel: language of menuItem exists', () => {
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

  it('should remove language from languagesDisplayed, add it to languagesAvailable', () => {
    component.languagesDisplayed = [{ label: 'English', value: 'en', data: 'Data' }]
    component.languagesAvailable = [{ label: 'German', value: 'de', data: '' }]

    component.onRemoveLanguage('en')

    expect(component.languagesDisplayed.length).toBe(0)
    expect(component.languagesAvailable).toEqual(jasmine.arrayContaining([{ label: 'English', value: 'en', data: '' }]))
  })

  it('should add language to languagesDisplayed from languagesAvailable', () => {
    component.languagesDisplayed = []
    component.languagesAvailable = [{ label: 'English', value: 'en', data: '' }]

    component.onAddLanguage2({ option: { value: 'en' } })

    expect(component.languagesDisplayed).toEqual(jasmine.arrayContaining([{ label: 'English', value: 'en', data: '' }]))
    expect(component.languagesAvailable.length).toBe(0)
  })

  it('should add language to languagesDisplayed from languagesAvailable using string value', () => {
    component.languagesDisplayed = []
    component.languagesAvailable = [{ label: 'English', value: 'en', data: '' }]

    component.onAddLanguage('en')

    expect(component.languagesDisplayed).toEqual(jasmine.arrayContaining([{ label: 'English', value: 'en', data: '' }]))
    expect(component.languagesAvailable.length).toBe(0)
  })

  it('should return label of language if in languagesDisplayed', () => {
    component.languagesDisplayed = [{ label: 'English', value: 'en', data: '' }]

    const label = component.getLanguageLabel('en')

    expect(label).toBe('English')
  })

  it('should return undefined if not exactly one match with languagesDisplayed', () => {
    component.languagesDisplayed = [
      { label: 'English', value: 'en1', data: '' },
      { label: 'English2', value: 'en2', data: '' }
    ]

    const label = component.getLanguageLabel('en')

    expect(label).toBeUndefined()
  })

  it('if not in languagesDisplayed: return undefined on getLanguageLabel', () => {
    component.languagesDisplayed = []

    const label = component.getLanguageLabel('en')

    expect(label).toBeUndefined()
  })

  it('should return true if language not in languagesDisplayed', () => {
    component.languagesDisplayed = [{ label: 'English', value: 'en', data: '' }]

    expect(component.displayLanguageField('de')).toBeTrue()
    expect(component.displayLanguageField('en')).toBeFalse()
  })

  /***************************************************************************
   * EVENTS on URL field
   **************************************************************************/

  describe('onDropDownClick', () => {
    it('expect filteredMfes filled', () => {
      const event: any = { overlayVisible: false }
      const mfeItems: MenuURL[] = [
        { mfePath: 'http://url/path1', product: 'Product 1' },
        { mfePath: 'http://url/path2', product: 'Product 2' }
      ]
      component.mfeItems = mfeItems

      component.onDropdownClick(event)

      expect(component.filteredMfes.length).toBe(2)
    })
  })

  it('should call onFilterPaths with correct query when keyup event is triggered', () => {
    // Spy on the onFilterPaths method
    spyOn(component, 'onFilterPaths')
    const mockEvent = new KeyboardEvent('keyup', {
      bubbles: true,
      cancelable: true
    })
    // Create a mock event with a target value
    const inputElement = fixture.debugElement.query(By.css('input')).nativeElement
    inputElement.value = 'test query'
    Object.defineProperty(mockEvent, 'target', { writable: false, value: inputElement })

    // Dispatch the event
    component.onKeyUpUrl(mockEvent)

    // Assert that onFilterPaths was called with the correct argument
    expect(component.onFilterPaths).toHaveBeenCalled()
  })

  it('onClearUrl', () => {
    const controlMfeItems: MenuURL[] = []
    controlMfeItems.push({ mfePath: '', product: 'MENU_ITEM.URL.EMPTY' })
    controlMfeItems.push({
      mfePath: 'http://testdomain/workspace',
      product: 'MENU_ITEM.URL.HTTP',
      isSpecial: true
    })

    component.mfeItems = controlMfeItems
    component.onClearUrl()

    expect(component.formGroup.controls['url'].value).toEqual(controlMfeItems[0])
  })

  /**
   * FILTER URL (query)
   *   try to filter with best match with some exceptions:
   *     a) empty query => list all
   *     b) unknown entry => list all
   */
  it('should filter when query is empty', () => {
    const mockEvent = { originalEvent: new Event('filter'), query: undefined! }
    component.formGroup = new FormGroup({
      url: new FormControl('')
    })
    component.mfeItems = [microfrontend]

    component.onFilterPaths(mockEvent)

    expect(component.filteredMfes.length).toBe(1)
    expect(component.filteredMfes[0].id).toBe('id')
  })

  it('should assign filtered MenuURL items if query equals microfrontend mfePath', () => {
    const mf: Microfrontend = {
      id: 'id',
      appId: 'appId',
      basePath: '/path'
    }
    const mockEvent = { originalEvent: new Event('filter'), query: '' }

    component.mfeItems = [mf]
    component.onFilterPaths(mockEvent)

    expect(component.filteredMfes).toEqual(component.mfeItems)
  })

  it('should use url object mfePath if query is not provided', () => {
    component.formGroup.controls['url'].setValue({ mfePath: '/path' })
    const mockEvent = { originalEvent: new Event('filter'), query: '' }

    component.mfeItems = [{ id: 'id1', appId: 'appId1', basePath: '/base1', mfePath: '/path' }]

    component.onFilterPaths(mockEvent)

    expect(component.filteredMfes.length).toBe(1)
    expect(component.filteredMfes[0].mfePath).toBe('/path')
  })

  it('should filter MenuURL items based on the query', () => {
    const mockEvent = { originalEvent: new Event('filter'), query: '/pa' }
    component.formGroup = new FormGroup({
      url: new FormControl('')
    })
    const microfrontendNoId: Microfrontend = {
      appId: 'appId',
      basePath: 'path'
    }
    component.mfeItems = [
      { ...microfrontendNoId, mfePath: '/path' },
      { ...microfrontend, mfePath: '/path' }
    ]

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
describe('DefaultValueAccessor prototype modification', () => {
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

  it('should trim the value on model change: value is of type string', () => {
    inputElement.value = '  test  '
    inputElement.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    expect(component.value).toBe('test')
  })
})
