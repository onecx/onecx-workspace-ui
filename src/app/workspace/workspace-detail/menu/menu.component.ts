import { Component, ElementRef, OnInit, ViewChild, Renderer2, OnDestroy } from '@angular/core'
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http'
import { Location } from '@angular/common'
import { ActivatedRoute } from '@angular/router'
import { DefaultValueAccessor, FormControl, FormGroup, Validators } from '@angular/forms'

import { TreeTable } from 'primeng/treetable'
import { TabView } from 'primeng/tabview'
import { Overlay } from 'primeng/overlay'
import { SelectItem, TreeNode } from 'primeng/api'

import { TranslateService } from '@ngx-translate/core'
import { Observable, Subject, catchError, of } from 'rxjs'
import FileSaver from 'file-saver'
import { Action, UserService, PortalMessageService } from '@onecx/portal-integration-angular'
import {
  MenuItemAPIService,
  MenuItem,
  Workspace,
  WorkspaceAPIService,
  GetMenuItemResponse,
  GetWorkspaceMenuItemStructureResponse,
  CreateUpdateMenuItem
} from '../../../shared/generated'
import { limitText, dropDownSortItemsByLabel } from '../../../shared/utils'
import { MenuStringConst } from '../../..//model/menu-string-const'
import { MenuStateService } from '../../../services/menu-state.service'
import { IconService } from './iconservice'

/* type MenuItem = MenuItem & {
  positionPath: string
  regMfeAligned: boolean
  parentItemName: string
  first: boolean
  last: boolean
  prevId: string | undefined
} */
type LanguageItem = SelectItem & { data: string }
type I18N = { [key: string]: string }

// trim the value (string!) of a form control before passes to the control
const original = DefaultValueAccessor.prototype.registerOnChange
DefaultValueAccessor.prototype.registerOnChange = function (fn) {
  return original.call(this, (value) => {
    const trimmed = typeof value === 'string' || value instanceof String ? value.trim() : value
    return fn(trimmed)
  })
}

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit, OnDestroy {
  @ViewChild('menuTree') menuTree: TreeTable | undefined
  @ViewChild('menuTreeFilter') menuTreeFilter: ElementRef<HTMLInputElement> = {} as ElementRef
  @ViewChild('panelDetail') panelDetail: TabView | undefined
  @ViewChild('treeOverlay') treeOverlay: Overlay | undefined

  private readonly destroy$ = new Subject()
  private readonly debug = false // to be removed after finalization
  // dialog control
  public actions: Action[] = []
  public loading = true
  public exceptionKey = ''
  public dateFormat = 'short'
  public tabIndex = 0
  private panelHeight = 0
  private treeHeight = 0
  // portal
  public portal?: Workspace
  private portal$: Observable<Workspace> = new Observable<Workspace>()
  public workspaceName = this.route.snapshot.params['name']
  private mfeRUrls: Array<string> = []
  public mfeRUrlOptions: SelectItem[] = []
  // menu
  private menu$: Observable<GetWorkspaceMenuItemStructureResponse> =
    new Observable<GetWorkspaceMenuItemStructureResponse>()
  public menuNodes: TreeNode[] = []
  private menuItem$: Observable<GetMenuItemResponse | null> = new Observable<GetMenuItemResponse | null>()
  public menuItems: MenuItem[] | undefined
  public menuItem: MenuItem | undefined
  private menuItemStructureDTOArray: Array<MenuItem> | undefined
  public menuImportError = false
  public httpHeaders!: HttpHeaders
  // detail
  public changeMode: 'EDIT' | 'CREATE' = 'EDIT'
  public displayMenuDetail = false
  public displayMenuImport = false
  public displayDeleteConfirmation = false
  public displayTreeModal = false
  public formGroup: FormGroup
  public iconItems: SelectItem[] = [{ label: '', value: null }] // default value is empty
  public parentItems: SelectItem[] = [{ label: '', value: null }] // default value is empty
  public scopeItems: SelectItem[]
  // public booleanItems: SelectItem[]
  private urlPattern =
    '(https://www.|http://www.|https://|http://)?[a-zA-Z]{2,}(.[a-zA-Z]{2,})(.[a-zA-Z]{2,})?/[a-zA-Z0-9]{2,}|((https://www.|http://www.|https://|http://)?[a-zA-Z]{2,}(.[a-zA-Z]{2,})(.[a-zA-Z]{2,})?)|(https://www.|http://www.|https://|http://)?[a-zA-Z0-9]{2,}.[a-zA-Z0-9]{2,}.[a-zA-Z0-9]{2,}(.[a-zA-Z0-9]{2,})?'
  private posPattern = '[0-9]{1,9}'
  // language settings and preview
  public languagesAvailable: LanguageItem[] = []
  public languagesDisplayed: LanguageItem[] = []
  public languagesUsed = new Array<string>()
  public languagesPreview: SelectItem[] = []
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
    private user: UserService,
    private renderer: Renderer2,
    private route: ActivatedRoute,
    private location: Location,
    private menuApi: MenuItemAPIService,
    private workspaceApi: WorkspaceAPIService,
    private stateService: MenuStateService,
    private icon: IconService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm' : 'short'
    this.iconItems.push(...this.icon.icons.map((i) => ({ label: i, value: i })))
    this.iconItems.sort(dropDownSortItemsByLabel)
    this.scopeItems = [
      { label: '', value: null },
      { label: MenuStringConst.SCOPE_APP, value: MenuStringConst.SCOPE_APP },
      { label: MenuStringConst.SCOPE_PAGE, value: MenuStringConst.SCOPE_PAGE },
      { label: MenuStringConst.SCOPE_PORTAL, value: MenuStringConst.SCOPE_PORTAL }
    ]
    this.formGroup = new FormGroup({
      parentItemId: new FormControl(null),
      key: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
      name: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
      position: new FormControl(null, [
        Validators.required,
        Validators.maxLength(9),
        Validators.pattern(this.posPattern)
      ]),
      disabled: new FormControl<boolean>(false),
      portalExit: new FormControl<boolean>(false),
      url: new FormControl(null, [
        Validators.minLength(2),
        Validators.maxLength(255)
        /*, Validators.pattern(this.urlPattern)*/ // Trian wish to deactivate this
      ]),
      badge: new FormControl(undefined),
      scope: new FormControl(null),
      description: new FormControl(null, [Validators.maxLength(255)])
    })
    const state = this.stateService.getState()
    this.menuItems = state.portalMenuItems
  }

  public ngOnInit(): void {
    this.httpHeaders = new HttpHeaders()
    this.httpHeaders.set('Content-Type', 'application/json')
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
        this.prepareActionButtons(data)
      })
    this.loadData()
  }

  public ngOnDestroy(): void {
    this.stateService.updateState({
      portalMenuItems: this.menuItems
    })
  }

  public prepareActionButtons(data: any) {
    this.actions = [] // provoke change event
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
  }

  /**
   * UI ACTIONS
   */
  public onReload(): void {
    this.loadMenu(true)
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

  public onGotoMenuMgmt(): void {
    this.log('gotoMenu for portal ' + this.portal?.name)
  }
  public onCloseDetailDialog(): void {
    this.resetDetailDialog()
    this.menuItem = undefined
    this.displayMenuDetail = false
  }
  private resetDetailDialog(): void {
    this.tabIndex = 0
    this.languagesDisplayed = []
  }
  private onClose(): void {
    this.location.back()
  }
  public onTabPanelChange(e: any): void {
    this.tabIndex = e.index
  }
  public onFocusFieldUrl(field: any): void {
    field.overlayVisible = true
  }

  public onShowDetailDialog(): void {
    this.resetDetailDialog()
    // same height on all TABs
    if (this.panelHeight === 0) this.panelHeight = this.panelDetail?.el.nativeElement.offsetHeight
    this.renderer.setStyle(this.panelDetail?.el.nativeElement, 'display', 'block')
    this.renderer.setStyle(this.panelDetail?.el.nativeElement, 'height', this.panelHeight + 'px')
    //
    // prepare i18n panel: load defaults
    this.languagesDisplayed = [
      { label: this.languageNames['de'], value: 'de', data: '' },
      { label: this.languageNames['en'], value: 'en', data: '' }
    ]
    this.languagesAvailable = [
      { label: this.languageNames['es'], value: 'es', data: '' },
      { label: this.languageNames['fr'], value: 'fr', data: '' },
      { label: this.languageNames['it'], value: 'it', data: '' },
      { label: this.languageNames['pl'], value: 'pl', data: '' },
      { label: this.languageNames['sk'], value: 'sk', data: '' }
    ]
    if (this.menuItem?.i18n) {
      for (const k in this.menuItem?.i18n) {
        if (this.languagesDisplayed.filter((l) => l.value === k).length === 0) this.onAddLanguage(k)
      }
      for (const l of this.languagesDisplayed) {
        if (this.menuItem?.i18n && this.menuItem?.i18n[l.value]) l.data = this.menuItem?.i18n[l.value]
      }
      this.languagesDisplayed.sort(dropDownSortItemsByLabel)
    }
  }
  public onRemoveLanguage(val: string) {
    this.languagesAvailable.push(this.languagesDisplayed.filter((l) => l.value === val)[0])
    this.languagesAvailable.filter((l) => l.value === val)[0].data = ''
    this.languagesAvailable = this.languagesAvailable.filter((l) => l).sort(dropDownSortItemsByLabel)
    this.languagesDisplayed = this.languagesDisplayed.filter((l) => l.value !== val)
  }
  public onAddLanguage2(ev: any): void {
    this.languagesDisplayed.push(this.languagesAvailable.filter((l) => l.value === ev.option.value)[0])
    this.languagesAvailable = this.languagesAvailable.filter((l) => l.value !== ev.option.value)
  }
  public onAddLanguage(val: string): void {
    this.languagesDisplayed.push(this.languagesAvailable.filter((l) => l.value === val)[0])
    this.languagesAvailable = this.languagesAvailable.filter((l) => l.value !== val)
  }
  public getLanguageLabel(val: any): string | undefined {
    if (this.languagesDisplayed.length > 0) {
      const l = this.languagesDisplayed.filter((l) => l.value === val)
      return l.length === 1 ? l[0].label : undefined
    }
    return undefined
  }
  public displayLanguageField(lang: string) {
    return !this.languagesDisplayed.some((l) => l.value === lang)
  }
  public isObjectEmpty(obj: object) {
    return Object.keys(obj).length > 0
  }

  /**
   * DATA
   */
  public loadData(): void {
    this.exceptionKey = ''
    this.loading = true

    this.portal$ = this.workspaceApi
      .getWorkspaceByName({ workspaceName: this.workspaceName })
      .pipe(catchError((error) => of(error)))
    this.menu$ = this.menuApi
      .getMenuStructureForWorkspaceName({ workspaceName: this.workspaceName })
      .pipe(catchError((error) => of(error)))

    this.portal$.subscribe((portal) => {
      this.loading = true
      if (portal instanceof HttpErrorResponse) {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + portal.status + '.PORTALS'
        // console.error('getPortalByPortalId():', portal)
      } else if (portal instanceof Object) {
        this.portal = portal
        // this.portal.microfrontendRegistrations = new Set(Array.from(portal.microfrontendRegistrations ?? []))
        // this.mfeRUrls = Array.from(this.portal.microfrontendRegistrations || []).map((mfe) => mfe.baseUrl || '')
        // this.mfeRUrlOptions = Array.from(this.portal.microfrontendRegistrations ?? [])
        //   .map((mfe) => ({
        //     label: mfe.baseUrl,
        //     value: mfe.baseUrl || '',
        //   }))
        //   .sort(dropDownSortItemsByLabel)
        this.loadMenu(false)
      } else {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_0.PORTALS'
        // console.error('getAllPortals() => unknown response:', portal)
      }
      this.loading = false
    })
  }

  public onReloadMenu(): void {
    this.loadMenu(true)
  }
  public loadMenu(restore: boolean): void {
    this.menu$.subscribe((menu) => {
      this.loading = true
      if (menu instanceof HttpErrorResponse) {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + menu.status + '.MENUS'
        // console.error('getMenuStructureForPortalId():', menu)
      } else if (menu.menuItems instanceof Array) {
        this.menuNodes = this.mapToTreeNodes(menu.menuItems, undefined)
        // this.log('getMenuStructureForPortalId:', menu)
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
  private prepareParentNodes(nodes: TreeNode[]): void {
    nodes.forEach((m) => {
      this.parentItems.push({ label: m.key, value: m.data.id } as SelectItem)
      if (m.children && m.children.length > 0) this.prepareParentNodes(m.children)
    })
  }
  private preparePreviewLanguages(): void {
    this.languagesUsed = []
    this.prepareUsedLanguage(this.menuNodes)
    this.log('languagesUsed:', this.languagesUsed)
    this.languagesPreview = []
    this.languagesUsed.forEach((l) => this.languagesPreview.push({ label: this.languageNames[l], value: l }))
    this.languagesPreview.sort(dropDownSortItemsByLabel)
    this.log('languagesPreview:', this.languagesPreview)
  }

  /**
   * DELETE
   */
  public onDeleteMenuItem($event: MouseEvent, item: MenuItem): void {
    $event.stopPropagation()
    this.menuItem = item
    this.displayDeleteConfirmation = true
  }
  public onMenuDelete(): void {
    this.displayDeleteConfirmation = false
    this.menuApi
      .deleteMenuItemById({
        workspaceName: this.workspaceName,
        menuItemId: this.menuItem?.id!
      })
      .subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MENU_DELETE_OK' })
          this.removeNodeFromTree(this.menuNodes, this.menuItem?.key)
          this.menuNodes = [...this.menuNodes] // refresh UI
          this.menuItem = undefined
          this.preparePreviewLanguages()
        },
        error: (err: { error: any }) => {
          this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MENU_DELETE_NOK' })
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

  /**
   * VIEW & EDIT
   */
  public onGotoDetails($event: MouseEvent, item: MenuItem): void {
    $event.stopPropagation()
    if (item.id === undefined) return
    this.changeMode = 'EDIT'
    // get data
    this.menuItem$ = this.menuApi
      .getMenuItemById({ workspaceName: this.workspaceName, menuItemId: item.id })
      .pipe(catchError((error) => of(error)))
    this.menuItem$.subscribe({
      next: (m) => {
        this.menuItem = m?.resource
        if (this.menuItem) {
          this.fillForm(this.menuItem)
        }
        this.displayMenuDetail = true
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'DETAIL.ERROR_FIND_MENU' })
        console.error(err.error)
      }
    })
  }

  // direct change node on click in tree
  public onToggleDisable(ev: any, node: MenuItem): void {
    this.changeMode = 'EDIT'
    this.menuItem = node
    this.menuItem.disabled = !node.disabled
    this.fillForm(this.menuItem)
    this.onMenuSave()
  }

  private fillForm(m: MenuItem) {
    this.formGroup.reset()
    this.formGroup.setValue({
      parentItemId: m.parentItemId,
      url: m.url,
      key: m.key,
      name: m.name,
      position: m.position,
      description: m.description,
      scope: m.scope,
      badge: m.badge,
      disabled: m.disabled,
      portalExit: m.workspaceExit
    })
  }

  /**
   * CREATE
   */
  public onCreateMenu($event: MouseEvent, parent: MenuItem): void {
    $event.stopPropagation()
    this.changeMode = 'CREATE'
    this.menuItem = parent
    this.formGroup.reset()
    this.formGroup.patchValue({
      parentItemId: parent.id,
      position: 0,
      portalExit: false,
      disabled: false
    })
    this.displayMenuDetail = true
  }

  public onMenuSave(): void {
    if (this.formGroup.valid) {
      if (this.menuItem) {
        this.menuItem.parentItemId = this.formGroup.controls['parentItemId'].value
        this.menuItem.key = this.formGroup.controls['key'].value
        this.menuItem.url = this.formGroup.controls['url'].value
        this.menuItem.name = this.formGroup.controls['name'].value
        this.menuItem.badge =
          this.formGroup.controls['badge'].value === null ? '' : this.formGroup.controls['badge'].value
        this.menuItem.scope = this.formGroup.controls['scope'].value
        this.menuItem.position = this.formGroup.controls['position'].value
        this.menuItem.disabled = this.formGroup.controls['disabled'].value
        this.menuItem.workspaceExit = this.formGroup.controls['portalExit'].value
        this.menuItem.description = this.formGroup.controls['description'].value
        const i18n: I18N = {}
        for (const l of this.languagesDisplayed) {
          if (l.data !== '') i18n[l.value] = l.data
        }
        this.menuItem.i18n = i18n
        if (this.changeMode === 'CREATE') {
          this.menuItem.id = ''
        }
      }
      if (this.changeMode === 'CREATE') {
        this.menuApi
          .createMenuItemForWorkspace({
            workspaceName: this.workspaceName,
            createMenuItemRequest: { resource: this.menuItem! as CreateUpdateMenuItem }
          })
          .subscribe({
            next: () => {
              this.msgService.success({ summaryKey: 'ACTIONS.CREATE.MESSAGE.MENU_CREATE_OK' })
              this.onCloseDetailDialog()
              this.onReloadMenu()
            },
            error: (err: { error: any }) => {
              this.msgService.error({ summaryKey: 'ACTIONS.CREATE.MESSAGE.MENU_CREATE_NOK' })
              console.error(err.error)
            }
          })
      } else if (this.changeMode === 'EDIT' && this.menuItem && this.menuItem.id) {
        this.menuApi
          .patchMenuItems({
            workspaceName: this.workspaceName,
            patchMenuItemsRequest: [{ resource: this.menuItem }]
          })
          .subscribe({
            next: (data) => {
              this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_OK' })
              // update tree node with received data without reload all
              if (this.displayMenuDetail) {
                this.onCloseDetailDialog()
                if (data && data[0].resource?.key) {
                  const node = this.getNodeByKey(data[0].resource?.key, this.menuNodes)
                  if (node) {
                    node.data = data
                    node.label = data[0].resource?.name
                  }
                  if (this.menuItems) {
                    const item = this.getItemByKey(data[0].resource?.key, this.menuItems)
                    if (item) {
                      item.i18n = data[0].resource?.i18n
                      item.name = data[0].resource?.name
                    }
                  }
                }
              }
              this.preparePreviewLanguages()
            },
            error: (err: { error: any }) => {
              this.msgService.error({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_NOK' })
              console.error(err.error)
            }
          })
      }
    } else console.error('non valid form', this.formGroup)
  }

  /****************************************************************************
   *  TREE - prepare recursively the tree nodes from menu structure
   */
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
  private getNodeByKey(key: string, nodes: TreeNode[]): TreeNode | undefined {
    for (const node of nodes) {
      if (node.key === key) {
        return node
      }
      if (node.children) {
        const match = this.getNodeByKey(key, node.children)
        if (match) {
          return match
        }
      }
    }
    return undefined
  }
  private getItemByKey(key: string, items: MenuItem[]): MenuItem | undefined {
    for (const item of items) {
      if (item.key === key) {
        return item
      }
      if (item.children) {
        const match = this.getItemByKey(key, item.children)
        if (match) {
          return match
        }
      }
    }
    return undefined
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
   *  SERVER responses & internal
   */
  private log(text: string, obj?: object): void {
    if (this.debug) console.log(text, obj)
  }

  /****************************************************************************
   *  EXPORT / IMPORT
   */
  public onExportMenu(): void {
    if (this.workspaceName) {
      this.menuApi.getMenuStructureForWorkspaceName({ workspaceName: this.workspaceName }).subscribe((data) => {
        /* const filteredStructure = fetchedStructure.map((item: any) =>
          filterObjectTree(
            item,
            [
              'creationDate',
              'creationUser',
              'modificationDate',
              'modificationUser',
              'id',
              'parentItemId',
              'portalName'
            ],
            'children'
          )
        ) as MenuItem[]
        filteredStructure.sort((a, b) => (a.position || 0) - (b.position || 0)) */
        const jsonBody = JSON.stringify(data, null, 2)
        FileSaver.saveAs(new Blob([jsonBody], { type: 'text/json' }), 'workspace_' + this.portal?.name + '_menu.json')
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
    this.menuItemStructureDTOArray = undefined
    this.menuImportError = false
  }
  public onImportMenuSelect(event: { files: FileList }): void {
    event.files[0].text().then((text) => {
      this.menuItemStructureDTOArray = undefined
      this.menuImportError = false
      try {
        const menuItemStructureDTOArray: Array<MenuItem> = JSON.parse(text) as Array<MenuItem>
        if (this.isMenuImportRequestDTO2(menuItemStructureDTOArray)) {
          this.menuItemStructureDTOArray = menuItemStructureDTOArray
        } else {
          console.error('Menu Import Error: Data not valid', menuItemStructureDTOArray)
          this.menuItemStructureDTOArray = undefined
          this.menuImportError = true
        }
      } catch (err) {
        console.error('Menu Import Parse Error', err)
        this.menuImportError = true
      }
    })
  }
  private isMenuImportRequestDTO2(obj: unknown): obj is Array<MenuItem> {
    const dto = obj as Array<MenuItem>
    return !!(typeof dto === 'object' && dto && dto.length)
  }

  public onMenuImport(): void {
    if (this.workspaceName) {
      this.menuApi
        .exportMenuByWorkspaceName({
          workspaceName: this.workspaceName
          // menuStructureListDTO: { menuItemStructureDTOS: this.menuItemStructureDTOArray }
        })
        .subscribe({
          next: () => {
            this.msgService.success({ summaryKey: 'TREE.STRUCTURE_UPLOAD_SUCCESS' })
            this.ngOnInit()
          },
          error: (err: any) => {
            this.msgService.error({ summaryKey: 'TREE.STRUCTURE_UPLOAD_ERROR' })
            console.error(err)
          }
        })
    }
  }

  /****************************************************************************
   *  MENU TREE POPUP - outsourced for reordering and preview
   */
  public onDisplayTreeModal() {
    this.displayTreeModal = true
  }
  public onHideTreeModal() {
    this.displayTreeModal = false
  }

  // triggered by changes of tree structure in tree popup
  public updateMenuItems(updatedMenuItems: MenuItem[]): void {
    this.menuApi
      .patchMenuItems({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        workspaceName: this.workspaceName,
        patchMenuItemsRequest: [{ resource: updatedMenuItems[0] }] // WARNING: SHOULD BE WHOLE ARRAY???
        // menuItemDetailsDTO: updatedMenuItems
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
  }

  public onStartResizeTree(ev: MouseEvent) {
    // console.log('start:', ev)
  }
  public onEndResizeTree(ev: MouseEvent) {
    // console.log('end:', ev)
    this.treeHeight = ev.clientY
  }
}
