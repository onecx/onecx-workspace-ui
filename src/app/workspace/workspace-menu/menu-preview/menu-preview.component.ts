import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { SelectItem, TreeNode } from 'primeng/api'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import { Utils } from 'src/app/shared/utils'
import { MenuItemAPIService, WorkspaceMenuItem } from 'src/app/shared/generated'
import { MenuTreeService } from '../services/menu-tree.service'
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
    return items.map((mi) => {
      const langExists = mi.i18n && Object.keys(mi.i18n).length > 0 && mi.i18n[lang]
      return {
        children: mi.children ? this.mapToTree(mi.children, lang) : undefined,
        data: mi,
        droppable: true,
        key: mi.id,
        label: mi.i18n && langExists ? mi.i18n[lang] : mi.name,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expanded: this.stateService.getState().treeExpansionState.get(mi.id!),
        icon: this.setIcon(mi, langExists)
      }
    })
  }

  private setIcon(mi: WorkspaceMenuItem, langExists: any): string {
    let iconBase = mi.disabled ? 'item-disabled ' : ' '
    iconBase += !langExists ? 'lang-not-exists ' : ' '

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
      const targetPos = event.index ?? 0
      let targetItem = event.dropNode.data as WorkspaceMenuItem // moved to node

      // drop between existing nodes => after move: the drop node is the node before the moved node
      if (event.dropPoint === 'between') {
        targetItem = event.dropNode.parent?.data as WorkspaceMenuItem
      }

      if (menuItem) {
        this.menuApi
          .updateMenuItemParent({
            menuItemId: menuItem.id!,
            updateMenuItemParentRequest: {
              modificationCount: menuItem.modificationCount!,
              parentItemId: targetItem?.id,
              position: targetPos
            }
          })
          .subscribe({
            next: (data) => {
              this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_OK' })
              if (event.dragNode) event.dragNode.data = data
              this.reorderEmitter.emit(true)
            },
            error: (err) => {
              this.msgService.error({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_NOK' })
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
