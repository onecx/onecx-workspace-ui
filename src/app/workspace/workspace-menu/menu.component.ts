import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core'
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http'
import { Location } from '@angular/common'
import { ActivatedRoute } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { Observable, Subject, catchError, of } from 'rxjs'

import { TreeTable } from 'primeng/treetable'
import { Overlay } from 'primeng/overlay'
import { SelectItem, TreeNode } from 'primeng/api'

import FileSaver from 'file-saver'

import { Action, PortalMessageService } from '@onecx/portal-integration-angular'
import {
  MenuItemAPIService,
  MenuItem,
  Workspace,
  WorkspaceAPIService,
  GetWorkspaceMenuItemStructureResponse,
  MenuSnapshot
  //  UpdateMenuItemRequest
} from 'src/app/shared/generated'
import { limitText, dropDownSortItemsByLabel } from 'src/app/shared/utils'
import { MenuStateService } from './services/menu-state.service'

export type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT' | 'COPY' | 'DELETE'
export type I18N = { [key: string]: string }

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
  public loading = true
  public exceptionKey = ''
  // workspace
  public workspace?: Workspace
  private workspace$: Observable<Workspace> = new Observable<Workspace>()
  public workspaceName = this.route.snapshot.params['name']
  private mfeRUrls: Array<string> = []
  // menu
  private menu$: Observable<GetWorkspaceMenuItemStructureResponse> =
    new Observable<GetWorkspaceMenuItemStructureResponse>()
  public menuNodes: TreeNode[] = []
  public menuItems: MenuItem[] | undefined
  public menuItem: MenuItem | undefined
  private menuItemStructure: MenuSnapshot | undefined
  public menuImportError = false
  public httpHeaders!: HttpHeaders
  public parentItems: SelectItem[] = [{ label: '', value: null }] // default value is empty
  // detail
  public changeMode: ChangeMode = 'EDIT'
  public displayMenuDetail = false
  public displayMenuImport = false
  public displayMenuDelete = false
  public displayTreeModal = false
  private treeHeight = 0
  public languagesPreview: SelectItem[] = []
  public languagesUsed!: string[]
  public languageNames: I18N = {
    de: 'Deutsch',
    en: 'English',
    es: 'Español',
    fr: 'Français',
    it: 'Italiano',
    pl: 'Polski',
    sk: 'Slovak'
  }

  // utils declarations
  limitText = limitText

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private menuApi: MenuItemAPIService,
    private workspaceApi: WorkspaceAPIService,
    private stateService: MenuStateService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {
    const state = this.stateService.getState()
    this.menuItems = state.workspaceMenuItems
  }

  public ngOnInit(): void {
    this.httpHeaders = new HttpHeaders()
    this.httpHeaders.set('Content-Type', 'application/json')
    this.prepareActionButtons()
    this.loadData()
  }

  public ngOnDestroy(): void {
    this.stateService.updateState({
      workspaceMenuItems: this.menuItems
    })
  }

  public prepareActionButtons() {
    this.actions = [] // provoke change event
    this.translate
      .get([
        'ACTIONS.NAVIGATION.BACK',
        'ACTIONS.NAVIGATION.BACK.TOOLTIP',
        'ACTIONS.EXPORT.LABEL',
        'ACTIONS.EXPORT.MENU',
        'ACTIONS.IMPORT.LABEL',
        'ACTIONS.IMPORT.MENU'
      ])
      .subscribe((data) => {
        this.actions.push(
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
        )
      })
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
  public onGotoDetails($event: MouseEvent, item: MenuItem): void {
    console.log('onGotoDetails', item)
    $event.stopPropagation()
    if (item.id === undefined) return
    this.changeMode = 'EDIT'
    this.menuItem = item
    this.displayMenuDetail = true
  }
  public onCreateMenu($event: MouseEvent, parent?: MenuItem): void {
    $event.stopPropagation()
    this.changeMode = 'CREATE'
    this.menuItem = parent
    this.displayMenuDetail = true
  }
  public onMenuItemChanged(changed: boolean): void {
    console.log('onMenuItemChanged')
    if (changed) {
      if (this.displayMenuDelete) {
        this.removeNodeFromTree(this.menuNodes, this.menuItem?.key)
        this.menuNodes = [...this.menuNodes] // refresh UI
      }
      if (this.displayMenuDetail) {
        this.preparePreviewLanguages()
        this.loadMenu(true)
      }
    }
    this.displayMenuDetail = false
    this.displayMenuDelete = false
    this.menuItem = undefined
  }
  public onDeleteMenu($event: MouseEvent, item: MenuItem): void {
    $event.stopPropagation()
    this.changeMode = 'DELETE'
    this.menuItem = item
    this.displayMenuDelete = true
  }

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
    this.menu$ = this.menuApi
      .getMenuStructureForWorkspaceName({ workspaceName: this.workspaceName })
      .pipe(catchError((error) => of(error)))

    this.workspace$.subscribe((workspace) => {
      this.loading = true
      if (workspace instanceof HttpErrorResponse) {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + workspace.status + '.PORTALS'
        // console.error('getPortalByPortalId():', workspace)
      } else if (workspace instanceof Object) {
        this.workspace = workspace
        // this.workspace?.microfrontendRegistrations = new Set(Array.from(workspace.microfrontendRegistrations ?? []))
        // this.mfeRUrls = Array.from(this.workspace?.microfrontendRegistrations || []).map((mfe) => mfe.baseUrl || '')
        // this.mfeRUrlOptions = Array.from(this.workspace?.microfrontendRegistrations ?? [])
        //   .map((mfe) => ({
        //     label: mfe.baseUrl,
        //     value: mfe.baseUrl || '',
        //   }))
        //   .sort(dropDownSortItemsByLabel)
        this.loadMenu(false)
      } else {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_0.PORTALS'
      }
      this.loading = false
    })
  }

  public loadMenu(restore: boolean): void {
    this.menu$.subscribe((menu) => {
      this.loading = true
      if (menu instanceof HttpErrorResponse) {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + menu.status + '.MENUS'
        // console.error('getMenuStructureForPortalId():', menu)
      } else if (menu.menuItems instanceof Array) {
        this.menuNodes = this.mapToTreeNodes(menu.menuItems, undefined)
        this.menuItems = menu.menuItems
        this.menuItem = undefined
        this.preparePreviewLanguages()
        this.prepareParentNodes(this.menuNodes)
        this.parentItems.sort(dropDownSortItemsByLabel)
        if (restore) {
          this.restoreTree()
          this.msgService.success({ summaryKey: 'ACTIONS.SEARCH.RELOAD.OK' })
        }
      } else {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_0.MENUS'
        // console.error('getMenuStructureForPortalId() => unknown response:', menu)
      }
      this.loading = false
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

  // TODO: no save here anymore
  // direct change node on click in tree
  public onToggleDisable(ev: any, node: MenuItem): void {
    this.changeMode = 'EDIT'
    this.menuItem = node
    this.menuItem.disabled = !node.disabled
    //this.onMenuSave()
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
  private preparePreviewLanguages(): void {
    this.languagesUsed = []
    this.prepareUsedLanguage(this.menuNodes)
    console.log('languagesUsed:', this.languagesUsed)
    this.languagesPreview = []
    this.languagesUsed.forEach((l) => this.languagesPreview.push({ label: this.languageNames[l], value: l }))
    this.languagesPreview.sort(dropDownSortItemsByLabel)
    console.log('languagesPreview:', this.languagesPreview)
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
    this.menuImportError = false
  }
  public onImportMenuHide(): void {
    this.displayMenuImport = false
  }
  public onImportMenuClear(): void {
    this.menuItemStructure = undefined
    this.menuImportError = false
  }
  public onImportMenuSelect(event: { files: FileList }): void {
    event.files[0].text().then((text) => {
      this.menuItemStructure = undefined
      this.menuImportError = false
      try {
        const menuItemStructure: MenuSnapshot = JSON.parse(text) as MenuSnapshot
        if (this.isMenuImportRequestDTO2(menuItemStructure)) {
          this.menuItemStructure = menuItemStructure
          console.log('STRUCT', this.menuItemStructure)
        } else {
          console.error('Menu Import Parse Error in', menuItemStructure)
          this.menuItemStructure = undefined
          this.menuImportError = true
        }
      } catch (err) {
        console.error('Menu Import Parse Error', err)
        this.menuImportError = true
      }
    })
  }
  private isMenuImportRequestDTO2(obj: unknown): obj is MenuSnapshot {
    const dto = obj as MenuSnapshot
    return !!(typeof dto === 'object' && dto && dto.menu?.menuItems?.length)
  }
  public onImportMenuConfirmation(): void {
    if (this.workspaceName && this.menuItemStructure) {
      this.menuApi
        .importMenuByWorkspaceName({
          workspaceName: this.workspaceName,
          menuSnapshot: this.menuItemStructure
        })
        .subscribe({
          next: () => {
            this.msgService.success({ summaryKey: 'DIALOG.MENU.IMPORT.UPLOAD_OK' })
            this.displayMenuImport = false
            this.loadData()
          },
          error: (err: any) => {
            this.msgService.error({ summaryKey: 'DIALOG.MENU.IMPORT.UPLOAD_NOK' })
            console.error(err)
          }
        })
    }
  }

  /****************************************************************************
   ****************************************************************************
   *  MENU TREE POPUP - outsourced for reordering and preview
   */

  // prepare recursively the tree nodes from menu structure
  private mapToTreeNodes(items?: MenuItem[], parent?: MenuItem): TreeNode[] {
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
        // parent info ?
        // concat the positions
        positionPath: parent ? parent.position + '.' + item.position : item.position,
        // true if path is a mfe base path
        regMfeAligned: item.url && !item.url.startsWith('http') && !item.workspaceExit ? this.urlMatch(item.url) : false
      } as MenuItem
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
  private createTreeNode(item: MenuItem): TreeNode {
    return {
      data: item,
      label: item.name,
      expanded: false,
      key: item.key,
      leaf: true,
      children: []
    }
  }
  private prepareParentNodes(nodes: TreeNode[]): void {
    nodes.forEach((m) => {
      this.parentItems.push({ label: m.key, value: m.data.id } as SelectItem)
      if (m.children && m.children.length > 0) this.prepareParentNodes(m.children)
    })
  }
  private prepareUsedLanguage(nodes: TreeNode[]) {
    for (const node of nodes) {
      if (node.data.i18n && Object.keys(node.data.i18n).length > 0) {
        for (const k in node.data.i18n) {
          if (!this.languagesUsed.includes(k)) this.languagesUsed.push(k)
        }
      }
      if (node.children && node.children?.length > 0) this.prepareUsedLanguage(node.children)
    }
  }
  public onDisplayTreeModal() {
    this.displayTreeModal = true
  }
  public onHideTreeModal() {
    this.displayTreeModal = false
  }
  public onStartResizeTree(ev: MouseEvent) {
    // console.log('start:', ev)
  }
  public onEndResizeTree(ev: MouseEvent) {
    // console.log('end:', ev)
    this.treeHeight = ev.clientY
  }

  // triggered by changes of tree structure in tree popup
  public updateMenuItems(updatedMenuItems: MenuItem[]): void {
    console.log('updateMenuItems')
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
