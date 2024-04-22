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
import { MenuComponent } from './menu.component'

import {
  Workspace,
  WorkspaceMenuItem,
  WorkspaceAPIService,
  MenuItemAPIService,
  WorkspaceRolesAPIService,
  AssignmentAPIService,
  Assignment,
  WorkspaceRole
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
    children: [{ name: 'child name', key: 'key', id: 'id' }],
    url: '/workspace'
  },
  {
    id: 'id',
    key: 'key',
    name: 'menu2 name',
    i18n: { ['en']: 'en' },
    children: [{ name: 'child name', key: 'key', id: 'id' }],
    url: '/workspace'
  }
]

const wRole: WorkspaceRole = {
  name: 'role name',
  id: 'role id',
  description: 'role descr'
}

const assgmt: Assignment = {
  id: 'assgnmt id',
  roleId: 'roleId',
  menuItemId: 'id',
  workspaceId: 'id'
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
    importMenuByWorkspaceName: jasmine.createSpy('importMenuByWorkspaceName').and.returnValue(of({})),
    exportMenuByWorkspaceName: jasmine.createSpy('exportMenuByWorkspaceName').and.returnValue(of({}))
  }
  const wRoleServiceSpy = {
    searchWorkspaceRoles: jasmine.createSpy('searchWorkspaceRoles').and.returnValue(of({}))
  }
  const assgmtApiServiceSpy = {
    searchAssignments: jasmine.createSpy('searchAssignments').and.returnValue(of({})),
    createAssignment: jasmine.createSpy('createAssignment').and.returnValue(of({})),
    deleteAssignment: jasmine.createSpy('deleteAssignment').and.returnValue(of({}))
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
        { provide: AssignmentAPIService, useValue: assgmtApiServiceSpy },
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
    wRoleServiceSpy.searchWorkspaceRoles.calls.reset()
    assgmtApiServiceSpy.searchAssignments.calls.reset()
    assgmtApiServiceSpy.createAssignment.calls.reset()
    assgmtApiServiceSpy.deleteAssignment.calls.reset()
    translateServiceSpy.get.calls.reset()
    stateServiceSpy.getState.calls.reset()
  }))

  beforeEach(() => {
    stateServiceSpy.getState.and.returnValue(state)

    fixture = TestBed.createComponent(MenuComponent)
    component = fixture.componentInstance
    component.workspace = workspace
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

  fit('should removeNodeFromTree if key is present and refresh menuNodes if delete displayed onMenuItemChanged', () => {
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

    expect(component.menuNodes).not.toContain(item)
  })

  fit('should removeNodeFromTree if key is present in node children', () => {
    component.displayMenuDelete = true
    const item = {
      key: 'child key'
    }
    component.menuItem = item
    const nodes = [
      {
        key: 'key2',
        children: [{ key: 'child key' }]
      }
    ]
    component.menuNodes = nodes

    component.onMenuItemChanged(true)

    expect(component.menuNodes).not.toContain(item)
  })

  fit('should not removeNodeFromTree if no key present', () => {
    component.displayMenuDelete = true
    const key = undefined
    const item = {
      key: key
    }
    component.menuItem = item
    const nodes = [
      item,
      {
        key: 'key2'
      }
    ]
    component.menuNodes = nodes

    component.onMenuItemChanged(true)

    expect(component.menuNodes).toContain(item)
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

  fit('should recursively expand all menu nodes onExpandAll: no key in first node', () => {
    component.menuNodes = [{ expanded: false, children: [{ key: '1-1', children: [{ key: '1-1-1' }] }] }, { key: '2' }]
    const mockExpansionState: Map<string, boolean> = new Map<string, boolean>()
    stateServiceSpy.getState.and.returnValue({
      treeExpansionState: mockExpansionState,
      pageSize: 0,
      showDetails: false,
      rootFilter: true,
      treeMode: true
    })

    component.onExpandAll()

    expect(stateServiceSpy.getState().treeExpansionState.get('2')).toBeTrue()
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

  fit('should loadMenu: no node key in restoreRecursive', () => {
    const mockMenuItems: WorkspaceMenuItem[] = [
      {
        id: 'id',
        key: undefined,
        name: 'menu name',
        i18n: { ['en']: 'en' },
        children: [{ name: 'child name', key: 'key', id: 'id' }],
        url: '/workspace'
      }
    ]
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

  fit('should return an empty array from mapToTreeNodes if no menuItems onLoadMenu', () => {
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: [] }))

    component.loadMenu(true)

    expect(component.menuNodes).toEqual([])
  })

  /****************************************************************************
   * ROLES + ASSIGNMENTS
   */

  fit('should loadRolesandAssignments -> seachRoles and searchAssignments on loadMenu', () => {
    const wRole2: WorkspaceRole = {
      name: 'role name2',
      id: 'role id2',
      description: 'role descr2'
    }
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: mockMenuItems }))
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: [wRole, wRole2] }))
    assgmtApiServiceSpy.searchAssignments.and.returnValue(of({ stream: [assgmt] }))

    component.loadMenu(true)

    expect(component.wRoles).toEqual([wRole, wRole2])
    expect(component.wAssignments).toEqual([assgmt])
  })

  fit('should handle roles without name in sortRoleName function', () => {
    const wRole2: WorkspaceRole = {
      id: 'role id2',
      description: 'role descr2'
    }
    const wRole3: WorkspaceRole = {
      id: 'role id3',
      description: 'role descr3'
    }
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: mockMenuItems }))
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: [wRole3, wRole2] }))
    assgmtApiServiceSpy.searchAssignments.and.returnValue(of({ stream: [assgmt] }))

    component.loadMenu(true)

    expect(component.wRoles).toEqual([wRole3, wRole2])
    expect(component.wAssignments).toEqual([assgmt])
  })

  fit('should have found a tree node by id and used the assigned node in inheritRoleAssignment', () => {
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: mockMenuItems }))
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: [wRole] }))
    assgmtApiServiceSpy.searchAssignments.and.returnValue(of({ stream: [assgmt] }))

    component.loadMenu(true)

    expect(component.wAssignments).toEqual([assgmt])
  })

  xit('should have found a match in menu item url and ', () => {
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: mockMenuItems }))
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: [wRole] }))
    assgmtApiServiceSpy.searchAssignments.and.returnValue(of({ stream: [assgmt] }))

    component.loadMenu(true)

    expect(component.wAssignments).toEqual([assgmt])
  })

  fit('should have looked at children nodes to find a tree node by id', () => {
    const assgmt2: Assignment = {
      id: 'assgnmt id',
      roleId: 'roleId',
      menuItemId: 'other id',
      workspaceId: 'id'
    }
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: mockMenuItems }))
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: [wRole] }))
    assgmtApiServiceSpy.searchAssignments.and.returnValue(of({ stream: [assgmt2] }))

    component.loadMenu(true)

    expect(component.wAssignments).toEqual([assgmt2])
  })

  fit('should throw errors for seachRoles and searchAssignments on loadMenu', () => {
    const err = { status: '404' }
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(throwError(() => err))
    assgmtApiServiceSpy.searchAssignments.and.returnValue(throwError(() => err))
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: mockMenuItems }))
    spyOn(console, 'error')

    component.loadMenu(true)

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_' + '404' + '.ROLES')
    expect(console.error).toHaveBeenCalledWith('searchRoles():', err)
    expect(console.error).toHaveBeenCalledWith('searchAssignments():', err)
  })

  /****************************************************************************
   *  EXPORT / IMPORT
   */

  fit('should export a menu', () => {
    menuApiServiceSpy.exportMenuByWorkspaceName.and.returnValue(of(mockMenuItems))
    component.workspaceName = 'name'
    component.workspace = workspace
    spyOn(FileSaver, 'saveAs')

    component.onExportMenu()

    expect(FileSaver.saveAs).toHaveBeenCalledWith(
      new Blob([], { type: 'text/json' }),
      'workspace_' + 'name' + '_menu.json'
    )
  })

  fit('should set displayMenuImport to true', () => {
    component.onImportMenu()

    expect(component.displayMenuImport).toBeTrue()
  })

  fit('should set displayMenuImport to false', () => {
    component.onHideMenuImport()

    expect(component.displayMenuImport).toBeFalse()
  })

  fit('should set displayRoles to true when displayRoles is false and wRoles is empty', () => {
    component.displayRoles = false
    component.wRoles = []

    component.onDisplayRoles()

    expect(component.displayRoles).toBeTrue()
  })

  fit('should set displayRoles to true when displayRoles is false and wRoles is not empty', () => {
    component.displayRoles = false
    component.wRoles = [wRole]

    component.onDisplayRoles()

    expect(component.displayRoles).toBeTrue()
  })

  fit('should set displayMenuPreview to true onDisplayMenuPreview', () => {
    component.onDisplayMenuPreview()

    expect(component.displayMenuPreview).toBeTrue()
  })

  fit('should set displayMenuPreview to false onHideMenuPreview', () => {
    component.onHideMenuPreview()

    expect(component.displayMenuPreview).toBeFalse()
  })

  fit('should handle successful menu item update', () => {
    menuApiServiceSpy.bulkPatchMenuItems.and.returnValue(of({}))
    spyOn(console, 'log')

    component.onUpdateMenuStructure(mockMenuItems)

    expect(console.log).toHaveBeenCalledWith('onUpdateMenuStructure')
  })
})
