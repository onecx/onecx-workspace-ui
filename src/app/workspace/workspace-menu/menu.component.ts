import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { Location } from '@angular/common'
import { ActivatedRoute } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { catchError, combineLatest, map, Observable, Subject, of } from 'rxjs'

import { TreeTable, TreeTableNodeExpandEvent } from 'primeng/treetable'
import { Overlay } from 'primeng/overlay'
import { SelectItem, TreeNode } from 'primeng/api'

import FileSaver from 'file-saver'

import { Action } from '@onecx/angular-accelerator'
import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import {
  AssignmentAPIService,
  AssignmentPageResult,
  Assignment,
  CreateAssignmentRequest,
  ImagesInternalAPIService,
  MenuItemAPIService,
  MenuItemStructure,
  RefType,
  Workspace,
  WorkspaceMenuItem,
  WorkspaceRole,
  WorkspaceAPIService,
  WorkspaceRolesAPIService,
  WorkspaceRolePageResult,
  GetWorkspaceResponse
} from 'src/app/shared/generated'
import {
  bffImageUrl,
  limitText,
  dropDownSortItemsByLabel,
  getCurrentDateTime,
  sortByLocale
} from 'src/app/shared/utils'
import { MenuStateService } from './services/menu-state.service'

export type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT' | 'COPY' | 'DELETE'
export type RoleAssignments = { [key: string]: string | undefined } // assignment id or undefined
export type MenuItemNodeData = WorkspaceMenuItem & {
  first: boolean
  last: boolean
  prevId: string
  gotoUrl: string
  positionPath: string
  appConnected: boolean
  roles: RoleAssignments
  rolesInherited: RoleAssignments
  node: TreeNode
}
export type UsedLanguage = { lang: string; count: number }

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit, OnDestroy {
  @ViewChild('menuTree') menuTree: TreeTable | undefined
  @ViewChild('menuTreeFilter') menuTreeFilter: ElementRef<HTMLInputElement> = {} as ElementRef
  @ViewChild('treeOverlay') treeOverlay: Overlay | undefined

  private readonly destroy$ = new Subject()
  private readonly debug = false // to be removed after finalization
  // dialog control
  public actions: Action[] = []
  public actions$: Observable<Action[]> | undefined
  public loading = true
  public exceptionKey = ''
  public myPermissions = new Array<string>() // permissions of the user
  public treeTableContentValue = false // off => details
  public treeExpanded = false // off => collapsed
  public treeNodeLabelSwitchItems: SelectItem[] = []
  public treeNodeLabelSwitchValue = 'NAME'
  public treeNodeLabelSwitchValueOrg = '' // prevent bug in PrimeNG SelectButton
  public currentLogoUrl: string | undefined = undefined

  // workspace
  public workspace?: Workspace
  private workspace$!: Observable<GetWorkspaceResponse>
  public workspaceName: string = this.route.snapshot.params['name']
  private mfeRUrls: Array<string> = []
  public wRoles$!: Observable<WorkspaceRolePageResult>
  public wRoles: WorkspaceRole[] = []
  public wAssignments$!: Observable<AssignmentPageResult>
  public wAssignments: Assignment[] = []
  // menu
  private menu$!: Observable<MenuItemStructure>
  public menuNodes: TreeNode[] = []
  public menuItems: WorkspaceMenuItem[] | undefined
  public menuItem: WorkspaceMenuItem | undefined
  public parentItems!: SelectItem[]
  public usedLanguages: Map<string, number> = new Map()
  // detail
  public changeMode: ChangeMode = 'EDIT'
  public displayMenuDetail = false
  public displayMenuImport = false
  public displayMenuDelete = false
  public displayMenuPreview = false
  public displayRoles = false
  limitText = limitText // utils declarations

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private assApi: AssignmentAPIService,
    private menuApi: MenuItemAPIService,
    private workspaceApi: WorkspaceAPIService,
    private wRoleApi: WorkspaceRolesAPIService,
    private imageApi: ImagesInternalAPIService,
    private stateService: MenuStateService,
    private translate: TranslateService,
    private msgService: PortalMessageService,
    private userService: UserService
  ) {
    const state = this.stateService.getState()
    this.menuItems = state.workspaceMenuItems
    // simplify permission checks
    if (userService.hasPermission('MENU#EDIT')) this.myPermissions.push('MENU#EDIT')
    if (userService.hasPermission('MENU#GRANT')) this.myPermissions.push('MENU#GRANT')
    if (userService.hasPermission('WORKSPACE_ROLE#EDIT')) this.myPermissions.push('WORKSPACE_ROLE#EDIT')
  }

  public ngOnInit(): void {
    this.prepareActionButtons()
    this.loadData()
  }

  public ngOnDestroy(): void {
    this.stateService.updateState({
      workspaceMenuItems: this.menuItems
    })
  }

  public prepareActionButtons(): void {
    this.actions$ = this.translate
      .get([
        'ACTIONS.NAVIGATION.BACK',
        'ACTIONS.NAVIGATION.BACK.TOOLTIP',
        'ACTIONS.EXPORT.LABEL',
        'ACTIONS.EXPORT.MENU',
        'ACTIONS.IMPORT.LABEL',
        'ACTIONS.IMPORT.MENU'
      ])
      .pipe(
        map((data) => {
          return [
            {
              label: data['ACTIONS.NAVIGATION.BACK'],
              title: data['ACTIONS.NAVIGATION.BACK.TOOLTIP'],
              actionCallback: () => this.onClose(),
              icon: 'pi pi-arrow-left',
              show: 'always'
            },
            {
              label: data['ACTIONS.EXPORT.LABEL'],
              title: data['ACTIONS.EXPORT.MENU'],
              actionCallback: () => this.onExportMenu(),
              icon: 'pi pi-download',
              show: 'always',
              permission: 'MENU#EXPORT'
            },
            {
              label: data['ACTIONS.IMPORT.LABEL'],
              title: data['ACTIONS.IMPORT.MENU'],
              actionCallback: () => this.onImportMenu(),
              icon: 'pi pi-upload',
              show: 'always',
              permission: 'MENU#IMPORT'
            }
          ]
        })
      )
  }

  /**
   * UI ACTIONS
   */
  private onClose(): void {
    this.location.back()
  }
  public onReload(): void {
    this.loadMenu(true)
  }

  public onTreeNodeLabelSwitchChange(ev: any): void {
    if (ev.value && this.treeNodeLabelSwitchValueOrg !== this.treeNodeLabelSwitchValue) {
      this.treeNodeLabelSwitchValueOrg = this.treeNodeLabelSwitchValue
      this.applyTreeNodeLabelSwitch(this.menuNodes)
      this.menuNodes = [...this.menuNodes] // refresh UI
    }
  }
  private applyTreeNodeLabelSwitch(nodes: TreeNode[]) {
    for (const node of nodes) {
      if (this.treeNodeLabelSwitchValue === 'ID') node.label = node.data.key
      else if (this.treeNodeLabelSwitchValue === 'NAME') node.label = node.data.name
      else if (this.usedLanguages.has(this.treeNodeLabelSwitchValue)) {
        if (node.data.i18n && Object.keys(node.data.i18n).length > 0) {
          if (node.data.i18n[this.treeNodeLabelSwitchValue]) node.label = node.data.i18n[this.treeNodeLabelSwitchValue]
          else node.label = node.data.name
        } else node.label = node.data.name
      } else node.label = node.data.name
      if (node.children && node.children[0]) this.applyTreeNodeLabelSwitch(node.children)
    }
  }

  public onToggleTreeTableContent(ev: any): void {
    this.displayRoles = ev.checked
  }
  public isObjectEmpty(obj: object) {
    return Object.keys(obj).length === 0
  }

  // change visibility of menu item by click in tree
  public onToggleDisable(ev: any, item: WorkspaceMenuItem): void {
    ev.stopPropagation()
    this.displayMenuDetail = false // prevent detail dialog activation
    this.displayMenuDelete = false
    this.menuApi
      .updateMenuItem({
        menuItemId: item.id!,
        updateMenuItemRequest: {
          badge: item.badge,
          description: item.description,
          disabled: !item.disabled,
          external: item.external,
          i18n: item.i18n,
          key: item.key,
          modificationCount: item.modificationCount ?? 0,
          name: item.name,
          parentItemId: item.parentItemId,
          position: item.position ?? 0,
          scope: item.scope,
          url: item.url
        }
      })
      .subscribe({
        next: (data) => {
          item.disabled = data.disabled
          item.modificationCount = data.modificationCount
          item.modificationDate = data.modificationDate
          this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_OK' })
        },
        error: (err: { error: any }) => {
          console.error(err)
          this.msgService.error({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_NOK' })
        }
      })
  }

  /****************************************************************************
   ****************************************************************************
   * CREATE + EDIT + DELETE
   */
  public onGotoDetails($event: MouseEvent, item: WorkspaceMenuItem): void {
    $event.stopPropagation()
    if (item.id === undefined) return
    this.changeMode = this.myPermissions.includes('MENU#EDIT') ? 'EDIT' : 'VIEW'
    this.menuItem = item
    this.displayMenuDetail = true
  }
  public onCreateMenu($event: MouseEvent, parent?: WorkspaceMenuItem): void {
    $event.stopPropagation()
    this.changeMode = 'CREATE'
    this.menuItem = parent
    this.displayMenuDetail = true
  }
  // triggered by change event in menu detail dialog
  public onMenuItemChanged(changed: boolean): void {
    if (changed) {
      if (this.displayMenuDelete) {
        this.removeNodeFromTree(this.menuNodes, this.menuItem?.key)
        this.menuNodes = [...this.menuNodes] // refresh UI
      }
      if (this.displayMenuDetail) {
        this.loadMenu(true)
      }
    }
    this.displayMenuDetail = false
    this.displayMenuDelete = false
    this.menuItem = undefined
  }
  public onDeleteMenu($event: MouseEvent, item: WorkspaceMenuItem): void {
    $event.stopPropagation()
    this.changeMode = 'DELETE'
    this.menuItem = item
    this.displayMenuDelete = true
  }

  /****************************************************************************
   ****************************************************************************
   * TREE + DIALOG
   */
  public onClearFilterMenuTable(): void {
    if (this.menuTreeFilter) this.menuTreeFilter.nativeElement.value = ''
    if (this.menuTree) this.menuTree.filterGlobal('', 'contains')
  }
  public onToggleTreeViewMode(event: any): void {
    this.menuNodes.forEach((node) => {
      this.expandRecursive(node, event.checked)
    })
    this.menuNodes = [...this.menuNodes]
  }
  private expandRecursive(node: TreeNode, isExpand: boolean) {
    node.expanded = isExpand
    this.stateService.getState().treeExpansionState.set(node.key || '', node.expanded)
    if (node.children) {
      node.children.forEach((childNode) => {
        this.expandRecursive(childNode, isExpand)
      })
    }
  }
  private restoreRecursive(node: TreeNode) {
    node.expanded = this.stateService.getState().treeExpansionState.get(node.key || '')
    if (node.children) {
      node.children.forEach((childNode) => {
        this.restoreRecursive(childNode)
      })
    }
  }
  private restoreTree(): void {
    this.menuNodes.forEach((node) => {
      this.restoreRecursive(node)
    })
    this.menuNodes = [...this.menuNodes]
  }
  public onHierarchyViewChange(event: TreeTableNodeExpandEvent): void {
    this.stateService.getState().treeExpansionState.set(event.node.key ?? '', event.node.expanded ?? false)
  }

  /****************************************************************************
   ****************************************************************************
   * DATA
   */
  public loadData(): void {
    this.exceptionKey = ''
    this.loading = true

    this.workspace$ = this.workspaceApi
      .getWorkspaceByName({ workspaceName: this.workspaceName })
      .pipe(catchError((error) => of(error)))
    this.workspace$.subscribe((result) => {
      if (result instanceof HttpErrorResponse) {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + result.status + '.WORKSPACES'
        console.error('getWorkspaceByName():', result)
      } else if (result instanceof Object) {
        this.workspace = result.resource
        this.currentLogoUrl = this.getLogoUrl(result.resource)
        this.loadMenu(false)
      } else {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_0.WORKSPACES'
      }
    })
  }

  public loadMenu(restore: boolean): void {
    this.menuItem = undefined
    this.menu$ = this.menuApi
      .getMenuStructure({ menuStructureSearchCriteria: { workspaceId: this.workspace?.id ?? '' } })
      .pipe(catchError((error) => of(error)))
    this.menu$.subscribe((result) => {
      this.loading = true
      if (result instanceof HttpErrorResponse) {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + result.status + '.MENUS'
        console.error('getMenuStructure():', result)
      } else if (result.menuItems instanceof Array) {
        this.menuItems = result.menuItems
        this.menuNodes = this.mapToTreeNodes(this.menuItems)
        this.prepareTreeNodeHelper()
        this.loadRolesAndAssignments()
        if (restore) {
          this.restoreTree()
          this.msgService.success({ summaryKey: 'ACTIONS.SEARCH.RELOAD.OK' })
        }
      } else {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_0.MENUS'
        console.error('getMenuStructure() => unknown response:', result)
      }
      this.loading = false
    })
  }

  /****************************************************************************
   * ROLES + ASSIGNMENTS
   */
  private searchRoles(): Observable<WorkspaceRole[]> {
    return this.wRoleApi
      .searchWorkspaceRoles({ workspaceRoleSearchCriteria: { workspaceId: this.workspace?.id } })
      .pipe(
        map((result) => {
          return result.stream
            ? result.stream?.map((role) => {
                this.wRoles.push(role)
                return this.wRoles[this.wRoles.length - 1]
              })
            : []
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ROLES'
          console.error('searchRoles():', err)
          return of([])
        })
      )
  }
  private searchAssignments(): Observable<Assignment[]> {
    return this.assApi.searchAssignments({ assignmentSearchCriteria: { workspaceId: this.workspace?.id } }).pipe(
      map((result) => {
        return result.stream
          ? result.stream?.map((ass) => {
              this.wAssignments.push(ass)
              return this.wAssignments[this.wAssignments.length - 1]
            })
          : []
      }),
      catchError((err) => {
        console.error('searchAssignments():', err)
        return of([])
      })
    )
  }
  private sortRoleByName(a: WorkspaceRole, b: WorkspaceRole): number {
    return (a.name ? a.name.toUpperCase() : '').localeCompare(b.name ? b.name.toUpperCase() : '')
  }
  private loadRolesAndAssignments() {
    this.wRoles = []
    this.wAssignments = []
    combineLatest([this.searchRoles(), this.searchAssignments()]).subscribe(([roles, ass]) => {
      this.wRoles.sort(this.sortRoleByName)
      // assignments(role.id, menu.id) => node.roles[role.id] = ass.id
      ass.forEach((ass: Assignment) => {
        // find affected node ... assign role and inherit
        const assignedNode = this.findTreeNodeById(this.menuNodes, ass.menuItemId)
        if (assignedNode) {
          assignedNode.data.roles[ass.roleId!] = ass.id
          this.inheritRoleAssignment(assignedNode, ass.roleId!, ass.id)
        }
      })
    })
  }
  private findTreeNodeById(source: TreeNode[], id?: string): TreeNode | undefined {
    let treeNode: TreeNode | undefined = undefined
    for (const node of source) {
      if (node.data.id === id) treeNode = node
      else if (!treeNode && node.children && node.children.length > 0)
        treeNode = this.findTreeNodeById(node.children, id)
    }
    return treeNode
  }
  private inheritRoleAssignment(node: TreeNode, roleId: string, assId: string | undefined): void {
    if (node?.children && node.children.length > 0)
      node.children.forEach((n) => {
        n.data.rolesInherited[roleId] = assId
        this.inheritRoleAssignment(n, roleId, assId)
      })
  }

  public onGrantPermission(rowData: MenuItemNodeData, roleId: string): void {
    this.assApi
      .createAssignment({
        createAssignmentRequest: { roleId: roleId, menuItemId: rowData.id } as CreateAssignmentRequest
      })
      .subscribe({
        next: (data) => {
          this.msgService.success({ summaryKey: 'DIALOG.MENU.ASSIGNMENT.GRANT_OK' })
          rowData.roles[roleId] = data.id
          this.inheritRoleAssignment(rowData.node, roleId, data.id)
        },
        error: (err: { error: any }) => {
          this.msgService.error({ summaryKey: 'DIALOG.MENU.ASSIGNMENT.GRANT_NOK' })
          console.error(err.error)
        }
      })
  }
  public onRevokePermission(rowData: MenuItemNodeData, roleId: string, assId: string): void {
    this.assApi.deleteAssignment({ id: assId }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'DIALOG.MENU.ASSIGNMENT.REVOKE_OK' })
        rowData.roles[roleId] = undefined
        this.inheritRoleAssignment(rowData.node, roleId, undefined)
      },
      error: (err: { error: any }) => {
        this.msgService.error({ summaryKey: 'DIALOG.MENU.ASSIGNMENT.REVOKE_NOK' })
        console.error(err.error)
      }
    })
  }

  /** remove node and sub nodes (recursively) in the tree
   */
  private removeNodeFromTree(nodes: TreeNode[], key?: string): boolean {
    if (!key) return false
    let stop = false
    nodes.forEach((n, i) => {
      if (!stop) {
        if (n.key === key) {
          nodes.splice(i, 1)
          stop = true
        }
      }
      if (!stop && n.children && n.children?.length > 0) stop = this.removeNodeFromTree(n.children, key)
    })
    return stop
  }

  // is a menu item (url) supported by reg. MFE ?
  private urlMatch(url: string): boolean {
    const url2 = /^.*\/$/.exec(url) ? url.substring(0, url.length - 1) : url
    // direct match
    let match = this.mfeRUrls.includes(url) || this.mfeRUrls.includes(url + '/') || this.mfeRUrls.includes(url2)
    if (!match) {
      for (const i in this.mfeRUrls) {
        match = this.mfeRUrls[i].startsWith(url2) || url2.startsWith(this.mfeRUrls[i])
        if (match) break
      }
    }
    return match
  }

  /****************************************************************************
   ****************************************************************************
   *  MENU TREE POPUP - outsourced for reordering and preview
   */

  // prepare recursively the tree nodes from menu structure
  private mapToTreeNodes(items?: WorkspaceMenuItem[], parent?: MenuItemNodeData): TreeNode[] {
    if (!items || items.length === 0) {
      return []
    }
    const nodes: TreeNode[] = []
    items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    let pos = 1
    let prevId: string | undefined
    for (const item of items) {
      const nodeData = {
        ...item,
        first: pos === 1,
        last: pos === items.length,
        prevId: prevId,
        gotoUrl: this.prepareItemUrl(item.url),
        // concat the positions
        positionPath: parent ? parent.position + '.' + item.position : item.position,
        // true if path is a mfe base path
        appConnected: item.url && !item.url.startsWith('http') && !item.external ? this.urlMatch(item.url) : false,
        roles: {},
        rolesInherited: {}
      } as MenuItemNodeData
      const newNode: TreeNode = this.createTreeNode(nodeData)
      if (item.children && item.children.length > 0 && item.children != null && item.children.toLocaleString() != '') {
        newNode.leaf = false
        newNode.data.badge = item.badge ?? 'folder '
        newNode.data.node = newNode
        newNode.children = this.mapToTreeNodes(item.children, nodeData)
      }
      nodes.push(newNode)
      pos++
      prevId = item.id
    }
    return nodes
  }
  private createTreeNode(item: MenuItemNodeData): TreeNode {
    return { data: item, label: item.name, expanded: false, key: item.key, leaf: true, children: [] }
  }
  private prepareItemUrl(url: string | undefined): string | undefined {
    if (!(url && this.workspace?.baseUrl)) return undefined
    const url_parts = window.location.href.split('/')
    return url_parts[0] + '//' + url_parts[2] + Location.joinWithSlash(this.workspace?.baseUrl, url)
  }

  private prepareTreeNodeHelper(): void {
    // init stores
    this.parentItems = [] // default value is empty
    this.usedLanguages = new Map()
    // fill
    this.prepareTreeNodeHelperRecursively(this.menuNodes)
    this.prepareTreeNodeLabelSwitch()
    this.treeNodeLabelSwitchValueOrg = '' // reset
    this.onTreeNodeLabelSwitchChange({ value: this.treeNodeLabelSwitchValue })
  }
  private prepareTreeNodeHelperRecursively(nodes: TreeNode[]): void {
    nodes.forEach((m) => {
      // 1. collect all parent items to build a drop down list
      this.parentItems.push({ label: m.key, value: m.data.id } as SelectItem)
      // 2. collect all languages to be used in label switcher
      if (m.data.i18n && Object.keys(m.data.i18n).length > 0) {
        for (const k in m.data.i18n) {
          let n = 1
          if (this.usedLanguages.has(k)) n = (this.usedLanguages.get(k) ?? 0) + 1
          this.usedLanguages.set(k, n)
        }
      }
      // children
      if (m.children && m.children.length > 0) this.prepareTreeNodeHelperRecursively(m.children)
    })
    this.parentItems.sort(dropDownSortItemsByLabel)
  }
  // prepare the node label switcher: add the used languages at the end
  private prepareTreeNodeLabelSwitch(): void {
    this.treeNodeLabelSwitchItems = [
      { label: 'Name', value: 'NAME' },
      { label: 'ID', value: 'ID' }
    ]
    const langs = Array.from(this.usedLanguages.keys())
    langs.sort(sortByLocale)
    langs.forEach((l) => this.treeNodeLabelSwitchItems.push({ label: l, value: l }))
  }

  /****************************************************************************
   ****************************************************************************
   *  EXPORT / IMPORT
   */
  public onExportMenu(): void {
    if (this.workspaceName) {
      this.menuApi.exportMenuByWorkspaceName({ workspaceName: this.workspaceName }).subscribe((data) => {
        const jsonBody = JSON.stringify(data, null, 2)
        FileSaver.saveAs(
          new Blob([jsonBody], { type: 'text/json' }),
          'onecx-menu_' + this.workspaceName + '_' + getCurrentDateTime() + '.json'
        )
      })
    }
  }
  public onImportMenu(): void {
    this.displayMenuImport = true
  }
  public onHideMenuImport() {
    this.displayMenuImport = false
  }
  public onDisplayRoles() {
    if (!this.displayRoles && this.wRoles.length === 0) {
      this.loadRolesAndAssignments()
    }
    this.displayRoles = !this.displayRoles
  }
  public onDisplayMenuPreview() {
    this.displayMenuPreview = true
  }
  public onHideMenuPreview() {
    this.displayMenuPreview = false
  }

  // triggered by changes of tree structure in preview
  public onUpdateMenuStructure(changed: boolean): void {
    this.onReload()
  }
  public getLogoUrl(workspace: Workspace | undefined): string | undefined {
    if (!workspace) return undefined
    if (workspace.logoUrl) return workspace?.logoUrl
    else return bffImageUrl(this.imageApi.configuration.basePath, workspace?.name, RefType.Logo)
  }
}
