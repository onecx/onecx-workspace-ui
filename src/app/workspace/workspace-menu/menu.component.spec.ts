import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { Location } from '@angular/common'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router'
import { of, throwError } from 'rxjs'
import FileSaver from 'file-saver'

import {
  PortalMessageService,
  ConfigurationService,
  AUTH_SERVICE,
  UserService
} from '@onecx/portal-integration-angular'

import { MenuStateService, MenuState } from './services/menu-state.service'
import { MenuComponent, MenuItemNodeData } from './menu.component'

import {
  Workspace,
  WorkspaceMenuItem,
  WorkspaceAPIService,
  MenuItemAPIService,
  WorkspaceRolesAPIService
} from 'src/app/shared/generated'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { HttpErrorResponse } from '@angular/common/http'

const workspace: Workspace = {
  id: 'id',
  name: 'workspace-name',
  theme: 'theme',
  baseUrl: '/some/base/url'
}

const mockMenuItems: WorkspaceMenuItem[] = [
  {
    id: 'id',
    key: 'key',
    name: 'menu name',
    i18n: { ['en']: 'en' },
    children: [{ name: 'child name', key: 'key', id: 'id' }]
  },
  {
    id: 'id',
    key: 'key',
    name: 'menu2 name',
    i18n: { ['en']: 'en' }
  }
]

const menuItemNode: MenuItemNodeData = {
  first: true,
  last: false,
  prevId: 'prevId',
  gotoUrl: 'gotoUrl',
  positionPath: 'posPath',
  appConnected: false,
  roles: { ['roleAsgmt']: 'RoleAsgmt' },
  rolesInherited: { ['inhRoleAsgmt']: 'inhRoleAsgmt' },
  node: { label: 'treeNodeLabel' }
}

const state: MenuState = {
  pageSize: 0,
  showDetails: false,
  rootFilter: true,
  treeMode: true,
  treeExpansionState: new Map(),
  workspaceMenuItems: []
}

fdescribe('MenuComponent', () => {
  let component: MenuComponent
  let fixture: ComponentFixture<MenuComponent>
  let mockActivatedRoute: Partial<ActivatedRoute>
  const mockAuthService = jasmine.createSpyObj('IAuthService', ['hasPermission'])
  let mockUserService: any

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    getWorkspaceByName: jasmine.createSpy('getWorkspaceByName').and.returnValue(of({}))
  }
  // TODO: check api and use the correct names
  const menuApiServiceSpy = {
    getMenuStructure: jasmine.createSpy('getMenuStructure').and.returnValue(of(mockMenuItems)),
    getMenuItemById: jasmine.createSpy('getMenuItemById').and.returnValue(of(mockMenuItems)),
    patchMenuItem: jasmine.createSpy('patchMenuItem').and.returnValue(of(mockMenuItems)),
    bulkPatchMenuItems: jasmine.createSpy('bulkPatchMenuItems').and.returnValue(of(mockMenuItems)),
    addMenuItemForPortal: jasmine.createSpy('addMenuItemForPortal').and.returnValue(of(mockMenuItems)),
    deleteMenuItemById: jasmine.createSpy('deleteMenuItemById').and.returnValue(of({})),
    importMenuByWorkspaceName: jasmine.createSpy('importMenuByWorkspaceName').and.returnValue(of({}))
  }
  const wRoleServiceSpy = {
    searchWorkspaceRoles: jasmine.createSpy('searchWorkspaceRoles').and.returnValue(of({}))
  }
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

  mockUserService = jasmine.createSpyObj('UserService', ['hasPermission'])
  mockUserService.hasPermission.and.callFake((permission: string) => {
    return ['MENU#EDIT', 'MENU#GRANT', 'ROLE#EDIT'].includes(permission)
  })

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
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy },
        { provide: WorkspaceRolesAPIService, useValue: wRoleServiceSpy },
        { provide: ConfigurationService, useValue: configServiceSpy },
        { provide: MenuItemAPIService, useValue: menuApiServiceSpy },
        { provide: MenuItemAPIService, useValue: menuApiServiceSpy },
        { provide: AUTH_SERVICE, useValue: mockAuthService },
        { provide: MenuStateService, useValue: stateServiceSpy },
        { provide: Location, useValue: locationSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.getWorkspaceByName.calls.reset()
    menuApiServiceSpy.getMenuItemById.calls.reset()
    menuApiServiceSpy.getMenuStructure.calls.reset()
    menuApiServiceSpy.patchMenuItem.calls.reset()
    menuApiServiceSpy.bulkPatchMenuItems.calls.reset()
    menuApiServiceSpy.addMenuItemForPortal.calls.reset()
    menuApiServiceSpy.deleteMenuItemById.calls.reset()
    menuApiServiceSpy.importMenuByWorkspaceName.calls.reset()
    translateServiceSpy.get.calls.reset()
    stateServiceSpy.getState.calls.reset()
  }))

  beforeEach(() => {
    stateServiceSpy.getState.and.returnValue(state)

    fixture = TestBed.createComponent(MenuComponent)
    component = fixture.componentInstance
    // component.menuItems = state.workspaceMenuItems
    fixture.detectChanges()
  })

  fit('should create', () => {
    expect(component).toBeTruthy()
  })

  fit('it should push permissions to array if userService has them', () => {
    expect(component.myPermissions).toContain('MENU#EDIT')
    expect(component.myPermissions).toContain('MENU#GRANT')
    expect(component.myPermissions).toContain('ROLE#EDIT')
  })

  fit('should have prepared action buttons onInit: onClose, and called it', () => {
    component.ngOnInit()

    if (component.actions$) {
      component.actions$.subscribe((actions) => {
        const firstAction = actions[0]
        firstAction.actionCallback()
        expect(locationSpy.back).toHaveBeenCalled()
      })
    }
  })

  fit('should have prepared action buttons onInit: onExportMenu', () => {
    spyOn(component, 'onExportMenu')

    component.ngOnInit()

    if (component.actions$) {
      component.actions$.subscribe((actions) => {
        const secondAction = actions[1]
        secondAction.actionCallback()
        expect(component.onExportMenu).toHaveBeenCalled()
      })
    }
  })

  fit('should have prepared action buttons onInit: onImportMenu', () => {
    spyOn(component, 'onImportMenu')

    component.ngOnInit()

    if (component.actions$) {
      component.actions$.subscribe((actions) => {
        const thirdAction = actions[2]
        thirdAction.actionCallback()
        expect(component.onImportMenu).toHaveBeenCalled()
      })
    }
  })

  fit('should call loadMenu onReload', () => {
    spyOn(component, 'loadMenu')

    component.onReload()

    expect(component.loadMenu).toHaveBeenCalledWith(true)
  })

  fit('should return true if an object is empty', () => {
    expect(component.isObjectEmpty({})).toBeTrue()
    expect(component.isObjectEmpty({ key: 'value' })).toBeFalse()
  })

  /****************************************************************************
   * CREATE + EDIT + DELETE
   */

  fit('should displayMenuDetail and change mode onGoToDetails: edit permission', () => {
    const event: MouseEvent = new MouseEvent('type')
    const item = {
      id: 'id1'
    }

    component.onGotoDetails(event, item)

    expect(component.displayMenuDetail).toBeTrue()
    expect(component.changeMode).toBe('EDIT')
    expect(component.menuItem).toBe(item)
  })

  fit('should displayMenuDetail and change mode onGoToDetails: no edit permission', () => {
    const event: MouseEvent = new MouseEvent('type')
    const item = {
      id: 'id1'
    }
    component.myPermissions = []

    component.onGotoDetails(event, item)

    expect(component.displayMenuDetail).toBeTrue()
    expect(component.changeMode).toBe('VIEW')
  })

  fit('should not displayMenuDetail: no item id', () => {
    const event: MouseEvent = new MouseEvent('type')
    const item = {
      name: 'name'
    }

    component.onGotoDetails(event, item)

    expect(component.displayMenuDetail).toBeFalse()
  })

  fit('should handle onCreateMenu correctly', () => {
    const mockEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation'])
    const mockParent = {
      key: '1-1',
      id: 'id1'
    }
    component.onCreateMenu(mockEvent, mockParent)

    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(component.changeMode).toEqual('CREATE')
    expect(component.menuItem).toEqual(mockParent)
    expect(component.displayMenuDetail).toBeTrue()
  })

  fit('should removeNodeFromTree and refresh menuNodes if delete displayed onMenuItemChanged', () => {
    component.displayMenuDelete = true
    const item = {
      key: 'key'
    }
    component.menuItem = item
    const nodes = [
      {
        key: 'key'
      },
      {
        key: 'key2'
      }
    ]
    component.menuNodes = nodes

    component.onMenuItemChanged(true)

    expect(component.menuItems).not.toContain(item)
  })

  fit('should loadMenu if detail displayed onMenuItemChanged', () => {
    component.displayMenuDelete = false
    component.displayMenuDetail = true
    spyOn(component, 'loadMenu')

    component.onMenuItemChanged(true)

    expect(component.loadMenu).toHaveBeenCalled()
  })

  fit('should set correct values if nothing changed onMenuItemChanged', () => {
    component.onMenuItemChanged(false)

    expect(component.displayMenuDetail).toBeFalse()
    expect(component.displayMenuDelete).toBeFalse()
    expect(component.menuItem).toBeUndefined()
  })

  fit('should display delete pop up with item', () => {
    const event: MouseEvent = new MouseEvent('click')
    const item = {
      key: 'key'
    }
    component.menuItem = item

    component.onDeleteMenu(event, item)

    expect(component.changeMode).toBe('DELETE')
    expect(component.menuItem).toBe(item)
    expect(component.displayMenuDelete).toBeTrue()
  })

  /****************************************************************************
   * TREE + DIALOG
   */

  fit('should empty menuTreeFiler and reset filter onClearFilterMenuTable', () => {
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

  fit('should recursively expand all menu nodes onExpandAll', () => {
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

  fit('should recursively collapse all menu nodes onCollapseAll', () => {
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

  fit('should getState onHierarchyViewChange', () => {
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

  /****************************************************************************
   * DATA
   */
  fit('should loadData', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
    component.workspaceName = 'workspace-name'

    component.loadData()

    expect(component.workspace).toEqual(workspace)
  })

  fit('it should handle error response on loadData', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'test error',
      status: 404,
      statusText: 'Not Found'
    })
    apiServiceSpy.getWorkspaceByName.and.returnValue(throwError(() => errorResponse))

    component.loadData()

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_404.WORKSPACES')
  })

  fit('it should handle exception on loadData', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of(null))

    component.loadData()

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_0.WORKSPACES')
  })

  fit('should loadMenu', () => {
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: mockMenuItems }))

    component.loadMenu(true)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.SEARCH.RELOAD.OK' })
  })

  fit('should handle error response on loadMenu', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'test error',
      status: 404,
      statusText: 'Not Found'
    })
    menuApiServiceSpy.getMenuStructure.and.returnValue(throwError(() => errorResponse))

    component.loadMenu(true)

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_404.MENUS')
  })

  /****************************************************************************
   * ROLES + ASSIGNMENTS
   */

  xit('should grant permission/grant an assignment to a role', () => {
    component.onGrantPermission(menuItemNode, 'roleId')
  })

  /****************************************************************************
   *  EXPORT / IMPORT
   */

  it('should export a menu', () => {
    menuApiServiceSpy.getMenuStructure.and.returnValue(of(mockMenuItems))
    component.workspaceName = 'name'
    component.workspace = workspace
    spyOn(FileSaver, 'saveAs')

    component.onExportMenu()

    expect(FileSaver.saveAs).toHaveBeenCalledWith(
      new Blob([], { type: 'text/json' }),
      'workspace_' + component.workspace?.name + '_menu.json'
    )
  })

  it('should set displayMenuPreview to true onDisplayMenuPreview', () => {
    component.onDisplayMenuPreview()

    expect(component.displayMenuPreview).toBeTrue()
  })

  it('should set displayMenuPreview to false onHideMenuPreview', () => {
    component.onHideMenuPreview()

    expect(component.displayMenuPreview).toBeFalse()
  })

  it('should handle successful menu item update', () => {
    menuApiServiceSpy.bulkPatchMenuItems.and.returnValue(of({}))
    spyOn(component, 'onReload')

    component.onUpdateMenuStructure(mockMenuItems)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'TREE.EDIT_SUCCESS' })
    expect(component.onReload).toHaveBeenCalled()
  })

  it('should handle menu item update error', () => {
    menuApiServiceSpy.bulkPatchMenuItems.and.returnValue(throwError(() => new Error()))

    component.onUpdateMenuStructure(mockMenuItems)

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'TREE.EDIT_ERROR' })
  })
})
