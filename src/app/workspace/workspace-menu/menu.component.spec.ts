import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { Location } from '@angular/common'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router'
import { of, throwError } from 'rxjs'
import FileSaver from 'file-saver'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'

import { MenuStateService, MenuState } from './services/menu-state.service'
import { MenuComponent, MenuItemNodeData } from './menu.component'
import { getCurrentDateTime } from 'src/app/shared/utils'

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
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http'
import { TreeNode } from 'primeng/api'
import { TreeTableNodeExpandEvent } from 'primeng/treetable'

const workspace: Workspace = {
  id: 'id',
  name: 'workspace-name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  displayName: ''
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
    url: '/workspace/'
  }
]

const nodeData: MenuItemNodeData = {
  id: 'id',
  first: true,
  last: true,
  prevId: 'prev',
  gotoUrl: 'goToUrl',
  positionPath: '0.1',
  appConnected: true,
  roles: { ['role']: 'role' },
  node: { key: 'nodeKey' }
}

const treeNodes: TreeNode = {
  key: '1',
  expanded: false,
  children: [
    { key: '1.1', expanded: true, children: [] },
    { expanded: true, children: [] }
  ]
}

const wRole: WorkspaceRole = {
  name: 'role name',
  id: 'role id',
  description: 'role descr'
}

const assgmt: Assignment = {
  id: 'assgnmt id',
  roleId: 'assgmtRoleId',
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

describe('MenuComponent', () => {
  let component: MenuComponent
  let fixture: ComponentFixture<MenuComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    getWorkspaceByName: jasmine.createSpy('getWorkspaceByName').and.returnValue(of({}))
  }
  const menuApiServiceSpy = {
    getMenuStructure: jasmine.createSpy('getMenuStructure').and.returnValue(of(mockMenuItems)),
    getMenuItemById: jasmine.createSpy('getMenuItemById').and.returnValue(of(mockMenuItems)),
    bulkPatchMenuItems: jasmine.createSpy('bulkPatchMenuItems').and.returnValue(of(mockMenuItems)),
    deleteMenuItemById: jasmine.createSpy('deleteMenuItemById').and.returnValue(of({})),
    exportMenuByWorkspaceName: jasmine.createSpy('exportMenuByWorkspaceName').and.returnValue(of({})),
    updateMenuItem: jasmine.createSpy('updateMenuItem').and.returnValue(of({}))
  }
  const wRoleServiceSpy = {
    searchWorkspaceRoles: jasmine.createSpy('searchWorkspaceRoles').and.returnValue(of({}))
  }
  const assgmtApiServiceSpy = {
    searchAssignments: jasmine.createSpy('searchAssignments').and.returnValue(of({})),
    createAssignment: jasmine.createSpy('createAssignment').and.returnValue(of(assgmt)),
    deleteAssignment: jasmine.createSpy('deleteAssignment').and.returnValue(of({}))
  }
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['get'])
  const stateServiceSpy = jasmine.createSpyObj<MenuStateService>('MenuStateService', ['getState', 'updateState'])
  const locationSpy = jasmine.createSpyObj<Location>('Location', ['back'])

  const mockUserService = jasmine.createSpyObj('UserService', ['hasPermission'])
  mockUserService.hasPermission.and.callFake((permission: string) => {
    return ['MENU#VIEW', 'MENU#EDIT', 'MENU#GRANT', 'WORKSPACE_ROLE#EDIT'].includes(permission)
  })

  const mockActivatedRouteSnapshot: Partial<ActivatedRouteSnapshot> = {
    params: { id: 'mockId' }
  }
  const mockActivatedRoute: Partial<ActivatedRoute> = {
    snapshot: mockActivatedRouteSnapshot as ActivatedRouteSnapshot
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MenuComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClientTesting(),
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: apiServiceSpy },
        { provide: WorkspaceRolesAPIService, useValue: wRoleServiceSpy },
        { provide: MenuItemAPIService, useValue: menuApiServiceSpy },
        { provide: AssignmentAPIService, useValue: assgmtApiServiceSpy },
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
    menuApiServiceSpy.bulkPatchMenuItems.calls.reset()
    menuApiServiceSpy.deleteMenuItemById.calls.reset()
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
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('it should push permissions to array if userService has them', () => {
    expect(component.myPermissions).toContain('MENU#VIEW')
    expect(component.myPermissions).toContain('MENU#EDIT')
    expect(component.myPermissions).toContain('MENU#GRANT')
    expect(component.myPermissions).toContain('WORKSPACE_ROLE#EDIT')
  })

  it('should have prepared action buttons onInit: onClose, and called it', () => {
    component.ngOnInit()

    if (component.actions$) {
      component.actions$.subscribe((actions) => {
        const firstAction = actions[0]
        firstAction.actionCallback()
        expect(locationSpy.back).toHaveBeenCalled()
      })
    }
  })

  it('should have prepared action buttons onInit: onExportMenu', () => {
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

  it('should have prepared action buttons onInit: onImportMenu', () => {
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

  /**
   * UI ACTIONS
   */
  it('should call loadMenu onReload', () => {
    spyOn(component, 'loadMenu')

    component.onReload()

    expect(component.loadMenu).toHaveBeenCalledWith(true)
  })

  it('should change the tree table content: display of roles', () => {
    component.displayRoles = false
    const event = { checked: true }

    component.onToggleTreeTableContent(event)

    expect(component.displayRoles).toBeTrue()
  })

  it('should return true if an object is empty', () => {
    expect(component.isObjectEmpty({})).toBeTrue()
    expect(component.isObjectEmpty({ key: 'value' })).toBeFalse()
  })

  it('should toggle item.disabled and call updateMenuItem with success', () => {
    const event = { stopPropagation: jasmine.createSpy('stopPropagation') } as any
    const updatedItem = { ...mockMenuItems[0], modificationCount: 1, modificationDate: new Date(), disabled: true }

    menuApiServiceSpy.updateMenuItem.and.returnValue(of(updatedItem))

    component.onToggleDisable(event, mockMenuItems[0])

    expect(event.stopPropagation).toHaveBeenCalled()
    expect(component.displayMenuDetail).toBe(false)
    expect(component.displayMenuDelete).toBe(false)
    expect(mockMenuItems[0].disabled).toBe(true)
    expect(mockMenuItems[0].modificationCount).toBe(updatedItem.modificationCount)
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_OK' })
  })

  it('should call updateMenuItem and handle error', () => {
    const event = { stopPropagation: jasmine.createSpy('stopPropagation') } as any
    const errorResponse = { error: 'error' }

    menuApiServiceSpy.updateMenuItem.and.returnValue(throwError(() => errorResponse))

    component.onToggleDisable(event, mockMenuItems[0])

    expect(event.stopPropagation).toHaveBeenCalled()
    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_NOK' })
  })

  describe('TreeNodeLabelSwitch', () => {
    beforeEach(() => {
      component.menuNodes = [
        {
          data: { key: '1', name: 'Node 1', i18n: { es: 'Nodo 1', fr: 'Nœud 1' } },
          label: 'Node 1',
          children: [
            { data: { key: '1.1', name: 'Child 1', i18n: { es: 'Hijo 1', fr: 'Enfant 1' } }, label: 'Child 1' }
          ]
        },
        {
          data: { key: '2', name: 'Node 2', i18n: { es: 'Nodo 2', fr: 'Nœud 2' } },
          label: 'Node 2',
          children: []
        }
      ]
      component.usedLanguages = new Map([
        ['es', 1],
        ['fr', 2]
      ])
    })

    describe('onTreeNodeLabelSwitchChange', () => {
      it('should not apply changes if ev.value is false', () => {
        const originalNodes = [...component.menuNodes]

        component.onTreeNodeLabelSwitchChange({ value: false })

        expect(component.menuNodes).toEqual(originalNodes)
      })

      it('should apply changes and refresh UI', () => {
        component.treeNodeLabelSwitchValue = 'ID'
        component.treeNodeLabelSwitchValueOrg = 'NAME'
        spyOn(component as any, 'applyTreeNodeLabelSwitch')
        component.onTreeNodeLabelSwitchChange({ value: true })
        expect(component['applyTreeNodeLabelSwitch']).toHaveBeenCalledWith(component.menuNodes)
        expect(component.treeNodeLabelSwitchValueOrg).toBe('ID')
      })

      it('should not apply changes if switch value has not changed', () => {
        component.treeNodeLabelSwitchValue = 'NAME'
        component.treeNodeLabelSwitchValueOrg = 'NAME'
        spyOn(component as any, 'applyTreeNodeLabelSwitch')

        component.onTreeNodeLabelSwitchChange({ value: true })

        expect(component['applyTreeNodeLabelSwitch']).not.toHaveBeenCalled()
      })
    })

    describe('applyTreeNodeLabelSwitch', () => {
      it('should set labels to node keys when switch value is ID', () => {
        component.treeNodeLabelSwitchValue = 'ID'

        component['applyTreeNodeLabelSwitch'](component.menuNodes)

        expect(component.menuNodes[0].label).toBe('1')
        expect(component.menuNodes[1].label).toBe('2')
      })

      it('should set labels to node names when switch value is NAME', () => {
        component.treeNodeLabelSwitchValue = 'NAME'

        component['applyTreeNodeLabelSwitch'](component.menuNodes)

        expect(component.menuNodes[0].label).toBe('Node 1')
        expect(component.menuNodes[1].label).toBe('Node 2')
      })

      it('should set labels to Spanish translations when switch value is es', () => {
        component.treeNodeLabelSwitchValue = 'es'

        component['applyTreeNodeLabelSwitch'](component.menuNodes)

        expect(component.menuNodes[0].label).toBe('Nodo 1')
        expect(component.menuNodes[1].label).toBe('Nodo 2')
      })

      it('should set labels to French translations when switch value is fr', () => {
        component.treeNodeLabelSwitchValue = 'fr'

        component['applyTreeNodeLabelSwitch'](component.menuNodes)

        expect(component.menuNodes[0].label).toBe('Nœud 1')
        expect(component.menuNodes[1].label).toBe('Nœud 2')
      })

      it('should set labels to names when switch value is an unsupported language', () => {
        component.treeNodeLabelSwitchValue = 'de'

        component['applyTreeNodeLabelSwitch'](component.menuNodes)

        expect(component.menuNodes[0].label).toBe('Node 1')
        expect(component.menuNodes[1].label).toBe('Node 2')
      })
    })
  })

  /****************************************************************************
   * CREATE + EDIT + DELETE
   */

  it('should displayMenuDetail and change mode onGoToDetails: edit permission', () => {
    const event: MouseEvent = new MouseEvent('type')
    const item = {
      id: 'id1'
    }

    component.onGotoDetails(event, item)

    expect(component.displayMenuDetail).toBeTrue()
    expect(component.changeMode).toBe('EDIT')
    expect(component.menuItem).toBe(item)
  })

  it('should displayMenuDetail and change mode onGoToDetails: no edit permission', () => {
    const event: MouseEvent = new MouseEvent('type')
    const item = {
      id: 'id1'
    }
    component.myPermissions = []

    component.onGotoDetails(event, item)

    expect(component.displayMenuDetail).toBeTrue()
    expect(component.changeMode).toBe('VIEW')
  })

  it('should not displayMenuDetail: no item id', () => {
    const event: MouseEvent = new MouseEvent('type')
    const item = {
      name: 'name'
    }

    component.onGotoDetails(event, item)

    expect(component.displayMenuDetail).toBeFalse()
  })

  it('should handle onCreateMenu correctly', () => {
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

  it('should removeNodeFromTree if key is present and refresh menuNodes if delete displayed onMenuItemChanged', () => {
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

  it('should removeNodeFromTree if key is present in node children', () => {
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

  it('should not removeNodeFromTree if no key present', () => {
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

  it('should loadMenu if detail displayed onMenuItemChanged', () => {
    component.displayMenuDelete = false
    component.displayMenuDetail = true
    spyOn(component, 'loadMenu')

    component.onMenuItemChanged(true)

    expect(component.loadMenu).toHaveBeenCalled()
  })

  it('should set correct values if nothing changed onMenuItemChanged', () => {
    component.onMenuItemChanged(false)

    expect(component.displayMenuDetail).toBeFalse()
    expect(component.displayMenuDelete).toBeFalse()
    expect(component.menuItem).toBeUndefined()
  })

  it('should display delete pop up with item', () => {
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

  it('should toggle tree view mode and update tree nodes', () => {
    const event = { checked: true }
    component.menuNodes = [treeNodes]

    component.onToggleTreeViewMode(event)

    component.menuNodes.forEach((node) => {
      expect(node.expanded).toBe(true)
      if (node.children) {
        node.children.forEach((child) => {
          expect(child.expanded).toBe(true)
        })
      }
    })

    component.menuNodes.forEach((node) => {
      expect(stateServiceSpy.getState().treeExpansionState.get(node.key || '')).toBe(true)
      if (node.children) {
        node.children.forEach((child) => {
          expect(stateServiceSpy.getState().treeExpansionState.get(child.key || '')).toBe(true)
        })
      }
    })

    expect(component.menuNodes).toEqual([
      {
        key: '1',
        expanded: true,
        children: [
          { key: '1.1', expanded: true, children: [] },
          { expanded: true, children: [] }
        ]
      }
    ])
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

    component.onHierarchyViewChange(event as TreeTableNodeExpandEvent)

    expect(stateServiceSpy.getState().treeExpansionState.set).toHaveBeenCalledWith(event.node.key, event.node.expanded)

    component.onHierarchyViewChange
  })

  /****************************************************************************
   * DATA
   */
  it('should loadData', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of({ resource: workspace }))
    component.workspaceName = 'workspace-name'

    component.loadData()

    expect(component.workspace).toEqual(workspace)
  })

  it('it should handle error response on loadData', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'test error',
      status: 404,
      statusText: 'Not Found'
    })
    apiServiceSpy.getWorkspaceByName.and.returnValue(throwError(() => errorResponse))

    component.loadData()

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_404.WORKSPACES')
  })

  it('it should handle exception on loadData', () => {
    apiServiceSpy.getWorkspaceByName.and.returnValue(of(null))

    component.loadData()

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_0.WORKSPACES')
  })

  it('should loadMenu', () => {
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: mockMenuItems }))

    component.loadMenu(true)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.SEARCH.RELOAD.OK' })
  })

  it('should loadMenu: no node key in restoreRecursive', () => {
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

  it('should handle error response on loadMenu', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'test error',
      status: 404,
      statusText: 'Not Found'
    })
    menuApiServiceSpy.getMenuStructure.and.returnValue(throwError(() => errorResponse))

    component.loadMenu(true)

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_404.MENUS')
  })

  it('should return an empty array from mapToTreeNodes if no menuItems onLoadMenu', () => {
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: [] }))

    component.loadMenu(true)

    expect(component.menuNodes).toEqual([])
  })

  /****************************************************************************
   * ROLES + ASSIGNMENTS
   */

  it('should loadRolesAndAssignments -> searchRoles and searchAssignments on loadMenu', () => {
    const wRole2: WorkspaceRole = {
      name: 'role name2',
      id: 'role id2',
      description: 'role descr2'
    }
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: mockMenuItems }))
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: [wRole, wRole2] }))
    assgmtApiServiceSpy.searchAssignments.and.returnValue(of({ stream: [assgmt] }))

    component.displayRoles = true
    component.loadMenu(true)

    expect(component.wRoles).toEqual([wRole, wRole2])
    expect(component.wAssignments).toEqual([assgmt])
  })

  it('should handle roles without name in sortRoleName function', () => {
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

    component.displayRoles = true
    component.loadMenu(true)

    expect(component.wRoles).toEqual([wRole3, wRole2])
    expect(component.wAssignments).toEqual([assgmt])
  })

  it('should have found a tree node by id and used the assigned node in inheritRoleAssignment', () => {
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: mockMenuItems }))
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: [wRole] }))
    assgmtApiServiceSpy.searchAssignments.and.returnValue(of({ stream: [assgmt] }))

    component.displayRoles = true
    component.loadMenu(true)

    expect(component.wAssignments).toEqual([assgmt])
  })

  it('should have looked at children nodes to find a tree node by id', () => {
    const assgmt2: Assignment = {
      id: 'assgnmt id',
      roleId: 'roleId',
      menuItemId: 'other id',
      workspaceId: 'id'
    }
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: mockMenuItems }))
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(of({ stream: [wRole] }))
    assgmtApiServiceSpy.searchAssignments.and.returnValue(of({ stream: [assgmt2] }))

    component.displayRoles = true
    component.loadMenu(true)

    expect(component.wAssignments).toEqual([assgmt2])
  })

  it('should throw errors for seachRoles and searchAssignments on loadMenu', () => {
    const err = { status: '404' }
    wRoleServiceSpy.searchWorkspaceRoles.and.returnValue(throwError(() => err))
    assgmtApiServiceSpy.searchAssignments.and.returnValue(throwError(() => err))
    menuApiServiceSpy.getMenuStructure.and.returnValue(of({ id: workspace.id, menuItems: mockMenuItems }))
    spyOn(console, 'error')

    component.displayRoles = true
    component.loadMenu(true)

    expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_' + '404' + '.ROLES')
    expect(console.error).toHaveBeenCalledWith('searchRoles():', err)
    expect(console.error).toHaveBeenCalledWith('searchAssignments():', err)
  })

  describe('onGrantPermission', () => {
    it('should create assignment when role is not assigned', () => {
      const roleId = 'role1'
      const menuItemId = 'menu1'
      const assignmentId = 'assignment1'

      const rowData: MenuItemNodeData = {
        id: menuItemId,
        roles: {}
      } as MenuItemNodeData

      const rowNode: TreeNode = {
        data: rowData,
        parent: undefined
      }
      assgmtApiServiceSpy.createAssignment.and.returnValue(of({ id: assignmentId }))

      component.onGrantPermission(rowNode, rowData, roleId)

      expect(assgmtApiServiceSpy.createAssignment).toHaveBeenCalledWith({
        createAssignmentRequest: { roleId: roleId, menuItemId: menuItemId }
      })
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.MENU.ASSIGNMENT.GRANT_OK' })
      expect(rowData.roles[roleId]).toBe(assignmentId)
    })

    it('should propagate permission to parent when role is already assigned', () => {
      const roleId = 'role1'
      const menuItemId = 'menu1'
      const parentMenuItemId = 'parentMenu1'

      const parentRowData: MenuItemNodeData = {
        id: parentMenuItemId,
        roles: {}
      } as MenuItemNodeData

      const parentRowNode: TreeNode = {
        data: parentRowData,
        parent: undefined
      }

      const rowData: MenuItemNodeData = {
        id: menuItemId,
        roles: {},
        first: false,
        last: false,
        prevId: '',
        gotoUrl: '',
        positionPath: '',
        appConnected: false,
        node: {} as TreeNode
      }

      const rowNode: TreeNode = {
        data: rowData,
        parent: parentRowNode
      }
      spyOn(component, 'onGrantPermission').and.callThrough()

      component.onGrantPermission(rowNode, rowData, roleId)

      expect(component.onGrantPermission).toHaveBeenCalledWith(parentRowNode, parentRowData, roleId)
    })

    it('should not create assgnmt and propagate permission to parent when role is already assigned', () => {
      const roleId = 'role1'
      const menuItemId = 'menu1'
      const parentMenuItemId = 'parentMenu1'

      const parentRowData: MenuItemNodeData = {
        id: parentMenuItemId,
        roles: {},
        first: false,
        last: false,
        prevId: '',
        gotoUrl: '',
        positionPath: '',
        appConnected: false,
        node: {} as TreeNode
      }

      const parentRowNode: TreeNode = {
        data: parentRowData,
        parent: undefined
      }

      const rowData: MenuItemNodeData = {
        id: menuItemId,
        roles: { [roleId]: 'existingAssignment' },
        first: false,
        last: false,
        prevId: '',
        gotoUrl: '',
        positionPath: '',
        appConnected: false,
        node: {} as TreeNode
      }

      const rowNode: TreeNode = {
        data: rowData,
        parent: parentRowNode
      }
      spyOn(component, 'onGrantPermission').and.callThrough()

      component.onGrantPermission(rowNode, rowData, roleId)

      expect(component.onGrantPermission).toHaveBeenCalledWith(parentRowNode, parentRowData, roleId)
    })

    it('should handle error when creating assignment', () => {
      const roleId = 'role1'
      const menuItemId = 'menu1'

      const rowData: MenuItemNodeData = {
        id: menuItemId,
        roles: {}
      } as MenuItemNodeData

      const rowNode: TreeNode = {
        data: rowData,
        parent: undefined
      }

      const error = new Error('API Error')
      assgmtApiServiceSpy.createAssignment.and.returnValue(throwError(() => ({ error })))
      spyOn(console, 'error')

      component.onGrantPermission(rowNode, rowData, roleId)

      expect(assgmtApiServiceSpy.createAssignment).toHaveBeenCalled()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.MENU.ASSIGNMENT.GRANT_NOK' })
      expect(console.error).toHaveBeenCalledWith(error)
      expect(rowData.roles[roleId]).toBeUndefined()
    })
  })
  // xit('should handle successful assignment creation onGrantPermission', () => {
  //   assgmtApiServiceSpy.createAssignment.and.returnValue(of(assgmt))

  //   component.onGrantPermission(tree, nodeData, 'role')

  //   expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.MENU.ASSIGNMENT.GRANT_OK' })
  //   expect(nodeData.roles['role']).toBe('assgnmt id')
  // })

  // xit('should display error onGrantPermission', () => {
  //   assgmtApiServiceSpy.createAssignment.and.returnValue(throwError(() => new Error()))

  //   component.onGrantPermission(tree, nodeData, 'role')

  //   expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.MENU.ASSIGNMENT.GRANT_NOK' })
  // })

  it('should deletel assignment onRevokePermission', () => {
    assgmtApiServiceSpy.deleteAssignment.and.returnValue(of(assgmt))

    component.onRevokePermission(nodeData, 'role', assgmt.id!)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.MENU.ASSIGNMENT.REVOKE_OK' })
    expect(nodeData.roles['role']).toBeUndefined()
  })

  it('should display error onRevokePermission', () => {
    assgmtApiServiceSpy.deleteAssignment.and.returnValue(throwError(() => new Error()))

    component.onRevokePermission(nodeData, 'role', assgmt.id!)

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.MENU.ASSIGNMENT.REVOKE_NOK' })
  })

  it('should match URLs by prefix ', () => {
    component['mfeRUrls'] = [
      'http://example.com',
      'http://example.com/page',
      'http://example.com/page/',
      'http://example.com/anotherpage',
      'http://test.com/test/'
    ]
    expect(component['urlMatch']('http://example.com/page/subpage')).toBe(true)
    expect(component['urlMatch']('http://example.com/anotherpage/extra')).toBe(true)
  })

  /****************************************************************************
   *  EXPORT / IMPORT
   */

  it('should export a menu', () => {
    menuApiServiceSpy.exportMenuByWorkspaceName.and.returnValue(of(mockMenuItems))
    component.workspaceName = 'name'
    component.workspace = workspace
    spyOn(FileSaver, 'saveAs')

    component.onExportMenu()

    expect(FileSaver.saveAs).toHaveBeenCalledWith(
      new Blob([], { type: 'text/json' }),
      'onecx-menu_name_' + getCurrentDateTime() + '.json'
    )
  })

  it('should set displayMenuImport to true', () => {
    component.onImportMenu()

    expect(component.displayMenuImport).toBeTrue()
  })

  it('should set displayMenuImport to false', () => {
    component.onHideMenuImport()

    expect(component.displayMenuImport).toBeFalse()
  })

  it('should set displayRoles to true when displayRoles is false and wRoles is empty', () => {
    component.displayRoles = false
    component.wRoles = []

    component.onDisplayRoles()

    expect(component.displayRoles).toBeTrue()
  })

  it('should set displayRoles to true when displayRoles is false and wRoles is not empty', () => {
    component.displayRoles = false
    component.wRoles = [wRole]

    component.onDisplayRoles()

    expect(component.displayRoles).toBeTrue()
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
    spyOn(component, 'loadMenu')

    component.onUpdateMenuStructure(true)

    expect(component.loadMenu).toHaveBeenCalledWith(true)
  })

  it('should return the logoURL on getLogoUrl', () => {
    const result = component.getLogoUrl({ name: 'name', displayName: 'name', logoUrl: 'url' })

    expect(result).toBe('url')
  })
})
