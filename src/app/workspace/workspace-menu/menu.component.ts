import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { Location } from '@angular/common'
import { ActivatedRoute } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { catchError, finalize, map, Observable, Subject, of } from 'rxjs'

import { TreeTable } from 'primeng/treetable'
import { Overlay } from 'primeng/overlay'
import { SelectItem, TreeNode } from 'primeng/api'

import FileSaver from 'file-saver'

import { Action, PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import {
  MenuItemAPIService,
  MenuItemStructure,
  Workspace,
  WorkspaceMenuItem,
  WorkspaceRole,
  WorkspaceAPIService,
  WorkspaceRolesAPIService,
  IAMRolePageResult,
  GetWorkspaceResponse
} from 'src/app/shared/generated'
import { limitText, dropDownSortItemsByLabel } from 'src/app/shared/utils'
import { MenuStateService } from './services/menu-state.service'

export type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT' | 'COPY' | 'DELETE'

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
  // workspace
  public workspace?: Workspace
  private workspace$!: Observable<GetWorkspaceResponse>
  public workspaceName: string = this.route.snapshot.params['name']
  private mfeRUrls: Array<string> = []
  public wRoles$!: Observable<IAMRolePageResult>
  // menu
  private menu$!: Observable<MenuItemStructure>
  public menuNodes: TreeNode[] = []
  public menuItems: WorkspaceMenuItem[] | undefined
  public menuItem: WorkspaceMenuItem | undefined
  public parentItems: SelectItem[] = [{ label: '', value: null }] // default value is empty
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
    private menuApi: MenuItemAPIService,
    private workspaceApi: WorkspaceAPIService,
    private wRoleApi: WorkspaceRolesAPIService,
    private stateService: MenuStateService,
    private translate: TranslateService,
    private msgService: PortalMessageService,
    private userService: UserService
  ) {
    const state = this.stateService.getState()
    this.menuItems = state.workspaceMenuItems
    // simplify permission checks
    if (userService.hasPermission('MENU#EDIT')) this.myPermissions.push('MENU#EDIT')
    if (userService.hasPermission('ROLE#EDIT')) this.myPermissions.push('ROLE#EDIT')
    if (userService.hasPermission('ROLE#DELETE')) this.myPermissions.push('ROLE#DELETE')
    if (userService.hasPermission('PERMISSION#GRANT')) this.myPermissions.push('PERMISSION#GRANT')
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
  public isObjectEmpty(obj: object) {
    return Object.keys(obj).length > 0
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

  // TODO: no save here anymore
  // direct change node on click in tree
  public onToggleDisable(ev: any, node: WorkspaceMenuItem): void {
    this.changeMode = 'EDIT'
    this.menuItem = node
    this.menuItem.disabled = !node.disabled
    //this.onMenuSave()
  }

  /****************************************************************************
   ****************************************************************************
   * TREE + DIALOG
   */
  public onClearFilterMenuTable(): void {
    if (this.menuTreeFilter) this.menuTreeFilter.nativeElement.value = ''
    if (this.menuTree) this.menuTree.filterGlobal('', 'contains')
  }
  public onExpandAll(): void {
    this.menuNodes.forEach((node) => {
      this.expandRecursive(node, true)
    })
    this.menuNodes = [...this.menuNodes]
  }
  public onCollapseAll(): void {
    this.menuNodes.forEach((node) => {
      this.expandRecursive(node, false)
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
  public onHierarchyViewChange(event: { node: { key: string; expanded: boolean } }): void {
    this.stateService.getState().treeExpansionState.set(event.node.key, event.node.expanded)
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
      this.loading = true
      if (result instanceof HttpErrorResponse) {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + result.status + '.PORTALS'
        console.error('getWorkspaceByName():', result)
      } else if (result instanceof Object) {
        this.workspace = result.resource
        /*
        this.workspace?.microfrontendRegistrations = new Set(Array.from(workspace.microfrontendRegistrations ?? []))
        this.mfeRUrls = Array.from(this.workspace?.microfrontendRegistrations || []).map((mfe) => mfe.baseUrl || '')
        this.mfeRUrlOptions = Array.from(this.workspace?.microfrontendRegistrations ?? [])
          .map((mfe) => ({
            label: mfe.baseUrl,
            value: mfe.baseUrl || '',
          }))
          .sort(dropDownSortItemsByLabel)
        */
        this.loadMenu(false)
      } else {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_0.PORTALS'
      }
      this.loading = false
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
        this.menuNodes = this.mapToTreeNodes(this.menuItems, undefined)
        this.prepareParentNodes(this.menuNodes)
        this.searchWorkspaceRoles()
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

  /** Workspace Role
   */
  private declareWorkspaceRolesObservable(): void {
    this.wRoles$ = this.wRoleApi.searchWorkspaceRoles({ workspaceRoleSearchCriteria: {} }).pipe(
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ROLES'
        console.error('searchAvailableRoles():', err)
        return of({} as IAMRolePageResult)
      }),
      finalize(() => {
        this.loading = false
        console.log('roles loaded')
      })
    )
  }
  private searchWorkspaceRoles(): Observable<WorkspaceRole[]> {
    this.declareWorkspaceRolesObservable()
    return this.wRoles$.pipe(
      map((result) => {
        return result.stream
          ? result.stream?.map((role) => {
              return { ...role, isIamRole: false, isWorkspaceRole: true, type: 'WORKSPACE' } as WorkspaceRole
            })
          : []
      })
    )
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
    const url2 = url.match(/^.*\/$/) ? url.substring(0, url.length - 1) : url
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
  private mapToTreeNodes(items?: WorkspaceMenuItem[], parent?: WorkspaceMenuItem): TreeNode[] {
    if (!items || items.length === 0) {
      return []
    }
    const nodes: TreeNode[] = []
    items.sort((a, b) => (a.position || 0) - (b.position || 0))
    let pos = 1
    let prevId: string | undefined
    for (const item of items) {
      const extendedItem = {
        ...item,
        first: pos === 1,
        last: pos === items.length,
        prevId: prevId,
        gotoUrl: this.prepareItemUrl(item.url),
        // parent info ?
        // concat the positions
        positionPath: parent ? parent.position + '.' + item.position : item.position,
        // true if path is a mfe base path
        regMfeAligned: item.url && !item.url.startsWith('http') && !item.external ? this.urlMatch(item.url) : false
      }
      const newNode: TreeNode = this.createTreeNode(extendedItem)
      if (item.children && item.children.length > 0 && item.children != null && item.children.toLocaleString() != '') {
        newNode.leaf = false
        newNode.data.badge = item.badge ? item.badge : 'folder '
        newNode.children = this.mapToTreeNodes(item.children, extendedItem)
      }
      nodes.push(newNode)
      pos++
      prevId = item.id
    }
    return nodes
  }
  private createTreeNode(item: WorkspaceMenuItem): TreeNode {
    return { data: item, label: item.name, expanded: false, key: item.key, leaf: true, children: [] }
  }
  private prepareItemUrl(url: string | undefined): string | undefined {
    if (!(url && this.workspace && this.workspace?.baseUrl)) return undefined
    let url_parts = window.location.href.split('/')
    return url_parts[0] + '//' + url_parts[2] + Location.joinWithSlash(this.workspace?.baseUrl, url)
  }

  private prepareParentNodes(nodes: TreeNode[]): void {
    nodes.forEach((m) => {
      this.parentItems.push({ label: m.key, value: m.data.id } as SelectItem)
      if (m.children && m.children.length > 0) this.prepareParentNodes(m.children)
    })
    this.parentItems.sort(dropDownSortItemsByLabel)
  }

  /****************************************************************************
   ****************************************************************************
   *  EXPORT / IMPORT
   */
  public onExportMenu(): void {
    if (this.workspaceName) {
      this.menuApi.exportMenuByWorkspaceName({ workspaceName: this.workspaceName }).subscribe((data) => {
        const jsonBody = JSON.stringify(data, null, 2)
        FileSaver.saveAs(new Blob([jsonBody], { type: 'text/json' }), 'workspace_' + this.workspaceName + '_menu.json')
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
    this.displayRoles = !this.displayRoles
  }
  public onDisplayMenuPreview() {
    this.displayMenuPreview = true
  }
  public onHideMenuPreview() {
    this.displayMenuPreview = false
  }

  // triggered by changes of tree structure in tree popup
  public onUpdateMenuStructure(changed: WorkspaceMenuItem[]): void {
    console.log('onUpdateMenuStructure')
    /*
    const patchRequestItems: UpdateMenuItemRequest[] = []
    updatedMenuItems.forEach((item) => {
      const patchMenuItem = { resource: item }
      patchRequestItems.push(patchMenuItem)
    })
    this.menuApi
      .updateMenuItem({
        workspaceName: this.workspaceName,
        patchMenuItemsRequest: patchRequestItems
      })
      .subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'TREE.EDIT_SUCCESS' })
        },
        error: (err: any) => {
          this.msgService.error({ summaryKey: 'TREE.EDIT_ERROR' })
          console.error(err)
        },
        complete: () => {
          this.onReloadMenu()
        }
      })
    */
  }
}
