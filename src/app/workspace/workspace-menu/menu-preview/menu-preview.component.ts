import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { SelectItem, TreeNode } from 'primeng/api'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import { Utils } from 'src/app/shared/utils'
import { MenuItemAPIService, WorkspaceMenuItem } from 'src/app/shared/generated'
import { MenuStateService } from '../services/menu-state.service'
import { TreeTableNodeExpandEvent } from 'primeng/treetable'
import { TreeNodeDropEvent } from 'primeng/tree'

export type I18N = { [key: string]: string }

@Component({
  selector: 'app-menu-preview',
  templateUrl: './menu-preview.component.html',
  styleUrls: ['./menu-preview.component.scss']
})
export class MenuPreviewComponent implements OnChanges {
  @Input() public menuItems!: WorkspaceMenuItem[]
  @Input() public displayDialog = false
  @Output() public hideDialog = new EventEmitter()
  @Output() public reorderEmitter = new EventEmitter<boolean>()

  public menuNodes!: TreeNode<WorkspaceMenuItem>[]
  public treeExpanded = false
  public languagesPreviewValue: string
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

  constructor(
    private readonly stateService: MenuStateService,
    private readonly userService: UserService,
    private readonly msgService: PortalMessageService,
    private readonly menuApi: MenuItemAPIService
  ) {
    this.languagesPreviewValue = this.userService.lang$.getValue()
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['menuItems'] || this.displayDialog) {
      this.menuNodes = this.mapToTree(this.menuItems, this.languagesPreviewValue)
      // add dummy-node to root-level
      this.menuNodes.push({
        key: '__DUMMY__',
        label: '',
        data: { id: '__DUMMY__', position: this.menuNodes.length + 1 } as WorkspaceMenuItem,
        droppable: false,
        selectable: false,
        styleClass: 'hidden',
        expanded: false,
        icon: '',
        children: []
      })

      this.treeExpanded = false
      if (this.menuNodes.length > 1 && this.menuNodes[0].key) {
        this.menuNodes[0].expanded = true
        this.stateService.getState().treeExpansionState.set(this.menuNodes[0].key, true)
      }
      this.preparePreviewLanguages()
    }
  }

  /**
   * LANGUAGE
   */
  private preparePreviewLanguages(): void {
    this.languagesUsed = []
    this.prepareUsedLanguage(this.menuNodes)
    this.languagesPreview = []
    this.languagesUsed.forEach((l) => this.languagesPreview.push({ label: this.languageNames[l], value: l }))
    this.languagesPreview.sort(Utils.dropDownSortItemsByLabel)
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

  /**
   * TREE
   */
  public onToggleTreeViewMode(event: any): void {
    this.menuNodes.forEach((node) => {
      this.expandRecursive(node, event.checked)
    })
    this.menuNodes = [...this.menuNodes]
  }

  private expandRecursive(node: TreeNode, isExpand: boolean) {
    node.expanded = isExpand
    this.stateService.getState().treeExpansionState.set(node.key ?? '', node.expanded)
    if (node.children) {
      node.children.forEach((childNode) => {
        this.expandRecursive(childNode, isExpand)
      })
    }
  }

  private mapToTree(items: WorkspaceMenuItem[], lang: string): TreeNode<WorkspaceMenuItem>[] {
    items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

    const mappedNodes: TreeNode<WorkspaceMenuItem>[] = items.map((mi) => {
      const langExists = mi.i18n && Object.keys(mi.i18n).length > 0 && mi.i18n[lang]

      const node: TreeNode<WorkspaceMenuItem> = {
        data: mi,
        droppable: true,
        key: mi.id,
        label: mi.i18n && langExists ? mi.i18n[lang] : mi.name,
        expanded: this.stateService.getState().treeExpansionState.get(mi.id!),
        icon: this.setIcon(mi, langExists)
      }

      if (mi.children && mi.children.length > 0) {
        const childNodes = this.mapToTree(mi.children, lang)

        // add dummy-node if children exist
        childNodes.push({
          key: `__DUMMY__-${mi.id}`,
          label: '',
          data: { id: `__DUMMY__-${mi.id}`, position: childNodes.length + 1 } as WorkspaceMenuItem,
          droppable: false,
          selectable: false,
          styleClass: 'hidden',
          expanded: false,
          icon: '',
          children: []
        })

        node.children = childNodes
      }

      return node
    })

    return mappedNodes
  }

  private setIcon(mi: WorkspaceMenuItem, langExists: any): string {
    let iconBase = mi.disabled ? 'item-disabled ' : ' '
    iconBase += langExists ? ' ' : 'lang-not-exists '

    let iconType: string
    if (mi.badge) {
      iconType = mi.badge
    } else {
      iconType = mi.children && mi.children.length > 0 ? 'folder' : 'file invisible'
    }
    return iconBase + 'pi pi-' + iconType
  }

  /**
   * End of DRAG & DROP action
   */
  public onDrop(event: TreeNodeDropEvent): void {
    if (event.dragNode && event.dropNode) {
      const menuItem = event.dragNode.data as WorkspaceMenuItem
      let targetPos = event.index ?? 0

      const siblings = this.menuItems
      const dragIndex = siblings.findIndex((item) => item.id === menuItem.id)

      let targetItem = event.dropNode.data as WorkspaceMenuItem
      let parentItemId: string | undefined = targetItem.id

      if (event.dropPoint === 'between') {
        targetItem = event.dropNode?.parent?.data as WorkspaceMenuItem
        parentItemId = targetItem?.id ?? undefined

        if (targetPos > dragIndex) {
          targetPos -= 1
        }
      }

      targetPos = Math.max(0, targetPos)

      // dummy-node on root or child-level detected
      if (event.dropNode.data.id.startsWith('__DUMMY__')) {
        // set parent if existing
        if (event.dropNode.parent) {
          parentItemId = event.dropNode.parent.data.id
          const parent = this.menuItems.find((item) => item.id === parentItemId)
          targetPos = parent?.children?.length ?? 0
        } else {
          parentItemId = undefined
          targetPos = this.menuItems.length
        }
      }

      if (menuItem) {
        this.menuApi
          .updateMenuItemParent({
            menuItemId: menuItem.id!,
            updateMenuItemParentRequest: {
              modificationCount: menuItem.modificationCount!,
              parentItemId: parentItemId,
              position: targetPos
            }
          })
          .subscribe({
            next: (data) => {
              this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU.OK' })
              if (event.dragNode) event.dragNode.data = data
              this.reorderEmitter.emit(true)
            },
            error: (err) => {
              this.msgService.error({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU.NOK' })
              console.error('updateMenuItemParent', err)
            }
          })
      }
    }
  }

  public onHierarchyViewChange(event: TreeTableNodeExpandEvent): void {
    if (event.node.key)
      this.stateService.getState().treeExpansionState.set(event.node.key, event.node.expanded === true)
  }

  public onLanguagesPreviewChange(lang: string) {
    this.languagesPreviewValue = lang
    this.menuNodes = this.mapToTree(this.menuItems, this.languagesPreviewValue)
  }

  public onClose() {
    this.hideDialog.emit()
  }
}
