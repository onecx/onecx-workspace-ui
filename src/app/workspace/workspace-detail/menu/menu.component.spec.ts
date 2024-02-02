import { NO_ERRORS_SCHEMA, Component } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { FormsModule, FormControl, FormGroup } from '@angular/forms'
import { Location } from '@angular/common'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import { PortalMessageService, ConfigurationService, AUTH_SERVICE } from '@onecx/portal-integration-angular'
import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { MenuComponent } from './menu.component'
import { MenuStateService, MenuState } from 'src/app/services/menu-state.service'

import {
  PortalDTO,
  PortalMenuItemDTO,
  PortalInternalAPIService,
  MenuItemsInternalAPIService,
  ThemesAPIService,
  MenuItemDetailsDTO,
  Scope
} from '../../../shared/generated'
import FileSaver from 'file-saver'

const portal: PortalDTO = {
  portalName: 'name',
  themeName: 'theme',
  themeId: 'id',
  baseUrl: '/some/base/url',
  id: 'id'
}

const mockMenuItems: PortalMenuItemDTO[] = [
  {
    name: 'menu name',
    key: 'key',
    i18n: { ['en']: 'en' },
    children: [{ name: 'child name', key: 'key' }]
  },
  {
    name: 'menu2 name',
    key: 'key',
    i18n: { ['en']: 'en' }
  }
]

const mockItem = {
  key: '1-1',
  id: 'id1',
  positionPath: '1-1',
  regMfeAligned: true,
  parentItemName: '1',
  first: true,
  last: false,
  prevId: undefined,
  disabled: true,
  parentItemId: 'some parent id',
  name: 'name',
  position: 1,
  portalExit: true,
  url: 'url',
  badge: 'badge',
  scope: Scope.Portal,
  description: 'description'
}

const state: MenuState = {
  pageSize: 0,
  showDetails: false,
  rootFilter: true,
  treeMode: true,
  treeExpansionState: new Map(),
  portalMenuItems: []
}

const form = new FormGroup({
  parentItemId: new FormControl('some parent id'),
  key: new FormControl('key'),
  name: new FormControl('name'),
  position: new FormControl('1'),
  disabled: new FormControl<boolean>(false),
  portalExit: new FormControl<boolean>(false),
  url: new FormControl('url'),
  badge: new FormControl('badge'),
  scope: new FormControl('scope'),
  description: new FormControl('description')
})

describe('MenuComponent', () => {
  let component: MenuComponent
  let fixture: ComponentFixture<MenuComponent>
  let mockActivatedRoute: Partial<ActivatedRoute>
  const mockAuthService = jasmine.createSpyObj('IAuthService', ['hasPermission'])

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    getPortalByPortalId: jasmine.createSpy('getPortalByPortalId').and.returnValue(of({}))
  }
  const menuApiServiceSpy = {
    getMenuStructureForPortalId: jasmine.createSpy('getMenuStructureForPortalId').and.returnValue(of(mockMenuItems)),
    getMenuItemById: jasmine.createSpy('getMenuItemById').and.returnValue(of(mockMenuItems)),
    patchMenuItem: jasmine.createSpy('patchMenuItem').and.returnValue(of(mockMenuItems)),
    bulkPatchMenuItems: jasmine.createSpy('bulkPatchMenuItems').and.returnValue(of(mockMenuItems)),
    addMenuItemForPortal: jasmine.createSpy('addMenuItemForPortal').and.returnValue(of(mockMenuItems)),
    deleteMenuItemById: jasmine.createSpy('deleteMenuItemById').and.returnValue(of({})),
    uploadMenuStructure: jasmine.createSpy('uploadMenuStructure').and.returnValue(of({}))
  }
  const themeApiServiceSpy = jasmine.createSpyObj<ThemesAPIService>('ThemesAPIService', ['getThemeById'])
  const configServiceSpy = {
    getProperty: jasmine.createSpy('getProperty').and.returnValue('123'),
    getPortal: jasmine.createSpy('getPortal').and.returnValue({
      themeId: '1234',
      portalName: 'test',
      baseUrl: '/',
      microfrontendRegistrations: []
    }),
    lang: 'en'
  }
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['get'])
  const stateServiceSpy = jasmine.createSpyObj<MenuStateService>('MenuStateService', ['getState', 'updateState'])
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
    TestBed.configureTestingModule({
      declarations: [MenuComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: HttpLoaderFactory,
            deps: [HttpClient]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: PortalInternalAPIService, useValue: apiServiceSpy },
        { provide: ConfigurationService, useValue: configServiceSpy },
        { provide: MenuItemsInternalAPIService, useValue: menuApiServiceSpy },
        { provide: ThemesAPIService, useValue: themeApiServiceSpy },
        { provide: AUTH_SERVICE, useValue: mockAuthService },
        { provide: MenuStateService, useValue: stateServiceSpy },
        { provide: Location, useValue: locationSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.getPortalByPortalId.calls.reset()
    menuApiServiceSpy.getMenuItemById.calls.reset()
    menuApiServiceSpy.getMenuStructureForPortalId.calls.reset()
    menuApiServiceSpy.patchMenuItem.calls.reset()
    menuApiServiceSpy.bulkPatchMenuItems.calls.reset()
    menuApiServiceSpy.addMenuItemForPortal.calls.reset()
    menuApiServiceSpy.deleteMenuItemById.calls.reset()
    menuApiServiceSpy.uploadMenuStructure.calls.reset()
    themeApiServiceSpy.getThemeById.calls.reset()
    translateServiceSpy.get.calls.reset()
    stateServiceSpy.getState.calls.reset()
  }))

  beforeEach(() => {
    stateServiceSpy.getState.and.returnValue(state)

    fixture = TestBed.createComponent(MenuComponent)
    component = fixture.componentInstance
    // component.menuItems = state.portalMenuItems
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should have prepared action buttons onInit: onClose, and called it', () => {
    component.ngOnInit()
    const action = component.actions[0]
    action.actionCallback()

    expect(locationSpy.back).toHaveBeenCalled()
  })

  it('should have prepared action buttons onInit: onExportMenu', () => {
    spyOn(component, 'onExportMenu')

    component.ngOnInit()
    const action = component.actions[1]
    action.actionCallback()

    expect(component.onExportMenu).toHaveBeenCalled()
  })

  it('should have prepared action buttons onInit: onImportMenu', () => {
    spyOn(component, 'onImportMenu')

    component.ngOnInit()
    const action = component.actions[2]
    action.actionCallback()

    expect(component.onImportMenu).toHaveBeenCalled()
  })

  it('should call loadMenu onReload', () => {
    spyOn(component, 'loadMenu')

    component.onReload()

    expect(component.loadMenu).toHaveBeenCalledWith(true)
  })

  it('should call loadMenu onReloadMenu', () => {
    spyOn(component, 'loadMenu')

    component.onReloadMenu()

    expect(component.loadMenu).toHaveBeenCalledWith(true)
  })

  it('should empty menuTreeFiler and reset filter onClearFilterMenuTable', () => {
    const mockMenuTreeFilter = {
      nativeElement: jasmine.createSpyObj('nativeElement', ['value'])
    }
    const mockMenuTree = jasmine.createSpyObj('menuTree', ['filterGlobal'])
    component.menuTreeFilter = mockMenuTreeFilter
    component.menuTree = mockMenuTree

    component.onClearFilterMenuTable()

    expect(mockMenuTreeFilter.nativeElement.value).toBe('')
    expect(mockMenuTree.filterGlobal).toHaveBeenCalledWith('', 'contains')
  })

  it('should recursively expand all menu nodes onExpandAll', () => {
    component.menuNodes = [
      { key: '1', expanded: false, children: [{ key: '1-1', children: [{ key: '1-1-1' }] }] },
      { key: '2' }
    ]
    const mockExpansionState: Map<string, boolean> = new Map<string, boolean>()
    stateServiceSpy.getState.and.returnValue({
      treeExpansionState: mockExpansionState,
      pageSize: 0,
      showDetails: false,
      rootFilter: true,
      treeMode: true
    })

    component.onExpandAll()

    expect(stateServiceSpy.getState().treeExpansionState.get('1')).toBeTrue()
  })

  it('should recursively collapse all menu nodes onCollapseAll', () => {
    component.menuNodes = [
      { key: '1', expanded: true, children: [{ key: '1-1', children: [{ key: '1-1-1' }] }] },
      { key: '2' }
    ]
    const mockExpansionState: Map<string, boolean> = new Map<string, boolean>()
    stateServiceSpy.getState.and.returnValue({
      treeExpansionState: mockExpansionState,
      pageSize: 0,
      showDetails: false,
      rootFilter: true,
      treeMode: true
    })

    component.onCollapseAll()

    expect(stateServiceSpy.getState().treeExpansionState.get('1')).toBeFalse()
  })

  it('should loadData', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of(portal))

    component.loadData()

    expect(component.portal).toBe(portal)
  })

  it('it should handle error response on loadData', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'test error',
      status: 404,
      statusText: 'Not Found'
    })
    apiServiceSpy.getPortalByPortalId.and.returnValue(throwError(() => errorResponse))

    component.loadData()

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_404.PORTALS')
  })

  it('it should handle exception on loadData', () => {
    apiServiceSpy.getPortalByPortalId.and.returnValue(of(null))

    component.loadData()

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_0.PORTALS')
  })

  it('should loadMenu', () => {
    menuApiServiceSpy.getMenuStructureForPortalId.and.returnValue(of(mockMenuItems))

    component.loadMenu(true)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.SEARCH.RELOAD.OK' })
  })

  xit('should call prepareParentNodes with a node array containing children', () => {
    menuApiServiceSpy.getMenuStructureForPortalId.and.returnValue(
      of([{ key: '1', data: { id: 'id1' }, children: [{ key: '1-1', data: { id: 'id1-1' } }] }])
    )

    component.loadMenu(true)

    expect(component.parentItems).toContain({ label: '1', value: 'id1' })
  })

  it('should handle error response on loadMenu', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'test error',
      status: 404,
      statusText: 'Not Found'
    })
    menuApiServiceSpy.getMenuStructureForPortalId.and.returnValue(throwError(() => errorResponse))

    component.loadMenu(true)

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_0.PORTALS')
  })

  it('should handle exception on loadMenu', () => {
    menuApiServiceSpy.getMenuStructureForPortalId.and.returnValue(of(null))

    component.loadMenu(true)

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_404.MENUS')
  })

  it('should set item onDeleteMenuItem', () => {
    const event: MouseEvent = new MouseEvent('type')
    const item = {
      key: '1-1',
      id: 'id1',
      positionPath: '1-1',
      regMfeAligned: true,
      parentItemName: '1',
      first: true,
      last: false,
      prevId: undefined
    }
    spyOn(event, 'stopPropagation')

    component.onDeleteMenuItem(event, item)

    expect(event.stopPropagation).toHaveBeenCalled()
    expect(component.menuItem).toEqual(item)
    expect(component.displayDeleteConfirmation).toBeTrue()
  })

  it('should delete menu item', () => {
    menuApiServiceSpy.deleteMenuItemById({ portalId: 'id', menuItemId: 'menu id' })
    component.menuNodes = [{ key: '1', data: { id: 'id1' }, children: [{ key: '1-1', data: { id: 'id1-1' } }] }]
    component.menuItem = {
      key: '1-1',
      id: 'id1',
      positionPath: '1-1',
      regMfeAligned: true,
      parentItemName: '1',
      first: true,
      last: false,
      prevId: undefined
    }

    component.onMenuDelete()

    expect(component.menuNodes.length).toBe(1)
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MENU_DELETE_OK' })
  })

  it('should display error message on delete menu item', () => {
    menuApiServiceSpy.deleteMenuItemById.and.returnValue(throwError(() => new Error()))

    component.onMenuDelete()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MENU_DELETE_NOK' })
  })

  xit('should get menu item onGoToDetails', () => {
    const mockMenuItem: MenuItemDetailsDTO = {
      key: 'key',
      parentItemId: 'parent id',
      name: 'some name',
      position: 1
    }
    menuApiServiceSpy.getMenuItemById.and.returnValue(of({ mockMenuItem }))
    const event: MouseEvent = new MouseEvent('type')
    const item = {
      key: '1-1',
      id: 'id1',
      positionPath: '1-1',
      regMfeAligned: true,
      parentItemName: '1',
      first: true,
      last: false,
      prevId: undefined,
      disabled: true,
      parentItemId: 'some parent id',
      name: 'name',
      position: 1,
      portalExit: true,
      url: 'url',
      badge: 'badge',
      scope: Scope.Portal,
      description: 'description'
    }
    component.formGroup = form

    component.onGotoDetails(event, item)

    expect(component.displayMenuDetail).toBeTrue()
  })

  it('should toggle disable state and initiate save', () => {
    menuApiServiceSpy.patchMenuItem.and.returnValue(of({}))
    const item = {
      key: '1-1',
      id: 'id1',
      positionPath: '1-1',
      regMfeAligned: true,
      parentItemName: '1',
      first: true,
      last: false,
      prevId: undefined,
      disabled: true,
      parentItemId: 'some parent id',
      name: 'name',
      position: 1,
      portalExit: true,
      url: 'url',
      badge: 'badge',
      scope: Scope.Portal,
      description: 'description'
    }
    const mockEvent = {}
    component.formGroup = form
    spyOn(component, 'onMenuSave')

    component.onToggleDisable(mockEvent, item)

    expect(component.changeMode).toBe('EDIT')
    expect(component.onMenuSave).toHaveBeenCalled()
  })

  it('should getState onHierarchyViewChange', () => {
    const mockExpansionState: Map<string, boolean> = new Map<string, boolean>()
    stateServiceSpy.getState.and.returnValue({
      treeExpansionState: mockExpansionState,
      pageSize: 0,
      showDetails: false,
      rootFilter: true,
      treeMode: true
    })
    const event = { node: { key: 'node', expanded: true } }
    spyOn(mockExpansionState, 'set').and.callThrough()

    component.onHierarchyViewChange(event)

    expect(stateServiceSpy.getState().treeExpansionState.set).toHaveBeenCalledWith(event.node.key, event.node.expanded)

    component.onHierarchyViewChange
  })

  it('should update properties onCloseDetailDialog', () => {
    component.onCloseDetailDialog()

    expect(component.menuItem).toBeUndefined()
    expect(component.displayMenuDetail).toBeFalse()
  })

  it('should update tabIndex onTabPanelChange', () => {
    let mockEvent = { index: 3 }

    component.onTabPanelChange(mockEvent)

    expect(component.tabIndex).toBe(mockEvent.index)
  })

  it('should set overlayVisible to true onFocusFieldUrl', () => {
    let field = { overlayVisible: false }

    component.onFocusFieldUrl(field)

    expect(field.overlayVisible).toBeTrue()
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

  it('should return true if an object is empty', () => {
    expect(component.isObjectEmpty({})).toBeFalse()
    expect(component.isObjectEmpty({ key: 'value' })).toBeTrue()
  })

  it('should handle onCreateMenu correctly', () => {
    const mockEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation'])
    const mockParent = {
      key: '1-1',
      id: 'id1',
      positionPath: '1-1',
      regMfeAligned: true,
      parentItemName: '1',
      first: true,
      last: false,
      prevId: undefined,
      name: 'name'
    }
    component.onCreateMenu(mockEvent, mockParent)

    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(component.changeMode).toEqual('CREATE')
    expect(component.menuItem).toEqual(mockParent)
    expect(component.formGroup.value).toEqual({
      parentItemId: mockParent.id,
      position: 0,
      portalExit: false,
      disabled: false,
      key: null,
      name: null,
      url: null,
      badge: null,
      scope: null,
      description: null
    })
    expect(component.displayMenuDetail).toBeTrue()
  })

  it('should save a menu: create', () => {
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
      positionPath: '1-1',
      regMfeAligned: true,
      parentItemName: '1',
      first: true,
      last: false,
      prevId: undefined,
      disabled: true,
      parentItemId: 'some parent id',
      name: 'name',
      position: 1,
      portalExit: true,
      url: 'url',
      badge: 'badge',
      scope: Scope.Portal,
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
      positionPath: '1-1',
      regMfeAligned: true,
      parentItemName: '1',
      first: true,
      last: false,
      prevId: undefined,
      disabled: true,
      parentItemId: 'some parent id',
      name: 'name',
      position: 1,
      portalExit: true,
      url: 'url',
      badge: 'badge',
      scope: Scope.Portal,
      description: 'description'
    }
    component.changeMode = 'EDIT'

    component.onMenuSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_NOK' })
  })

  it('should export a menu', () => {
    menuApiServiceSpy.getMenuStructureForPortalId.and.returnValue(of(mockMenuItems))
    component.portalId = 'id'
    component.portal = portal
    spyOn(FileSaver, 'saveAs')

    component.onExportMenu()

    expect(FileSaver.saveAs).toHaveBeenCalledWith(
      new Blob([], { type: 'text/json' }),
      'workspace_' + component.portal?.portalName + '_menu.json'
    )
  })

  it('should enable menu import onImportMenu', () => {
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
      /* expect(console.error).toHaveBeenCalledWith(
        'Menu Import Parse Error',
        new SyntaxError('Unexpected token \'o\', "not json" is not valid JSON')
      ) */
      done()
    }, 0)
  })

  it('should handle menu import', () => {
    component.portalId = 'id'
    spyOn(component, 'ngOnInit')
    menuApiServiceSpy.uploadMenuStructure.and.returnValue(of({}))

    component.onMenuImport()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'TREE.STRUCTURE_UPLOAD_SUCCESS' })
    expect(component.ngOnInit).toHaveBeenCalled()
  })

  it('should handle menu import error', () => {
    component.portalId = 'id'
    menuApiServiceSpy.uploadMenuStructure.and.returnValue(throwError(() => new Error()))

    component.onMenuImport()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'TREE.STRUCTURE_UPLOAD_ERROR' })
  })

  it('should set displayTreeModal to true onDisplayTreeModal', () => {
    component.onDisplayTreeModal()

    expect(component.displayTreeModal).toBeTrue()
  })

  it('should set displayTreeModal to false onHideTreeModal', () => {
    component.onHideTreeModal()

    expect(component.displayTreeModal).toBeFalse()
  })

  it('should handle successful menu item update', () => {
    menuApiServiceSpy.bulkPatchMenuItems.and.returnValue(of({}))
    spyOn(component, 'onReloadMenu')

    component.updateMenuItems(mockMenuItems)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'TREE.EDIT_SUCCESS' })
    expect(component.onReloadMenu).toHaveBeenCalled()
  })

  it('should handle menu item update error', () => {
    menuApiServiceSpy.bulkPatchMenuItems.and.returnValue(throwError(() => new Error()))

    component.updateMenuItems(mockMenuItems)

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'TREE.EDIT_ERROR' })
  })

  it('should call onStartResizeTree without errors', () => {
    const mockEvent = new MouseEvent('click')

    expect(() => component.onStartResizeTree(mockEvent)).not.toThrow()
  })

  it('should set treeHeight on onEndResizeTree call', () => {
    const mockClientY = 300
    const mockEvent = { clientY: mockClientY } as MouseEvent

    component.onEndResizeTree(mockEvent)

    expect(component['treeHeight']).toEqual(mockClientY)
  })
})

/* Test modification of built-in Angular class registerOnChange at top of the file  */
@Component({
  template: `<input type="text" [(ngModel)]="value" />`
})
class TestComponent {
  value = ''
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

  it('should trim the value on model change', () => {
    inputElement.value = '  test  '
    inputElement.dispatchEvent(new Event('input'))
    fixture.detectChanges()

    expect(component.value).toBe('test')
  })
})
