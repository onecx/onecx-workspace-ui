import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { SelectItem, TreeNode } from 'primeng/api'

import { UserService } from '@onecx/portal-integration-angular'
import { dropDownSortItemsByLabel } from 'src/app/shared/utils'
import { WorkspaceMenuItem } from 'src/app/shared/generated'
import { MenuTreeService } from '../services/menu-tree.service'
import { MenuStateService } from '../services/menu-state.service'

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
  @Output() public reorderEmitter = new EventEmitter<WorkspaceMenuItem[]>()

  public menuNodes!: TreeNode<WorkspaceMenuItem>[]
  public treeExpanded = false
  private treeHeight = 0
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
    private stateService: MenuStateService,
    private treeService: MenuTreeService,
    private userService: UserService
  ) {
    this.languagesPreviewValue = this.userService.lang$.getValue()
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['menuItems'] || this.displayDialog) {
      this.menuNodes = this.mapToTree(this.menuItems, this.languagesPreviewValue)
      this.treeExpanded = true
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
    this.languagesPreview.sort(dropDownSortItemsByLabel)
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
  expandAll() {
    this.menuNodes.forEach((node) => {
      this.expandRecursive(node, true)
    })
  }

  collapseAll() {
    this.menuNodes.forEach((node) => {
      this.expandRecursive(node, false)
    })
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
        icon:
          (mi.disabled ? 'item-disabled ' : ' ') +
          (!langExists ? 'lang-not-exists ' : ' ') +
          'pi pi-' +
          (mi.badge ? mi.badge : mi.children && mi.children.length > 0 ? 'folder' : 'file invisible')
      }
    })
  }

  private flatten(mi: WorkspaceMenuItem): WorkspaceMenuItem[] {
    const res =
      mi.children && mi.children.length > 0
        ? mi.children.flatMap((pi: WorkspaceMenuItem) => this.flatten(pi)).concat(mi)
        : [mi]
    return res
  }

  public onDrop(event: { dragNode: TreeNode<WorkspaceMenuItem>; dropNode: TreeNode<WorkspaceMenuItem> }): void {
    const draggedNodeId = event.dragNode.key
    const oldParentNodeId = event.dragNode.parent ? event.dragNode.parent.key : undefined

    // find new parent id
    let newParentNodeId: string | undefined
    if (event.dropNode.children?.map((child) => child.key).includes(draggedNodeId)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      newParentNodeId = event.dropNode.key!
    } else if (event.dropNode.parent) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      newParentNodeId = event.dropNode.parent.key!
    }

    const newNodesPositions = this.treeService.calculateNewNodesPositions(
      oldParentNodeId,
      newParentNodeId,
      this.menuNodes
    )
    const flatMenuItem = this.menuItems.flatMap((pi) => this.flatten(pi))

    // prepare menu items to update
    const updatedMenuItems: WorkspaceMenuItem[] = []
    for (const updatedNode of newNodesPositions) {
      const updateMenuItem = flatMenuItem.find((item: WorkspaceMenuItem) => item.id === updatedNode.id)
      if (!updateMenuItem) {
        return
      }
      if (updatedNode.id !== draggedNodeId) {
        updatedMenuItems.push({
          modificationCount: updateMenuItem.modificationCount,
          key: updateMenuItem.key,
          id: updateMenuItem.id,
          parentItemId: updateMenuItem.parentItemId,
          i18n: updateMenuItem.i18n,
          position: updatedNode.position,
          disabled: updateMenuItem.disabled,
          external: updateMenuItem.external
        })
      } else {
        updatedMenuItems.push({
          key: updateMenuItem.key,
          modificationCount: updateMenuItem.modificationCount,
          id: updateMenuItem.id,
          parentItemId: newParentNodeId,
          i18n: updateMenuItem.i18n,
          position: updatedNode.position,
          disabled: updateMenuItem.disabled,
          external: updateMenuItem.external
        })
      }
    }
    this.reorderEmitter.emit(updatedMenuItems)
  }

  public onHierarchyViewChange(event: { node: { key: string; expanded: boolean } }): void {
    this.stateService.getState().treeExpansionState.set(event.node.key, event.node.expanded)
  }

  public onLanguagesPreviewChange(lang: string) {
    this.languagesPreviewValue = lang
    this.menuNodes = this.mapToTree(this.menuItems, this.languagesPreviewValue)
  }

  public onClose() {
    this.hideDialog.emit()
  }
  public onStartResizeTree(ev: MouseEvent) {
    // console.log('start:', ev)
  }
  public onEndResizeTree(ev: MouseEvent) {
    // console.log('end:', ev)
    this.treeHeight = ev.clientY
  }
}
