import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { SelectItem, TreeNode } from 'primeng/api'

import { MenuItemDetailsDTO, PortalMenuItemDTO } from '../../../../shared/generated'
import { MenuTreeService } from '../../../../services/menu-tree.service'
import { MenuStateService } from '../../../../services/menu-state.service'

@Component({
  selector: 'wm-menu-tree',
  templateUrl: './menu-tree.component.html',
  styleUrls: ['./menu-tree.component.scss']
})
export class MenuTreeComponent implements OnChanges {
  @Input() public selectedPortalId?: string
  @Input() public portalMenuItems!: PortalMenuItemDTO[]
  @Input() public languagesPreview!: SelectItem[]
  @Input() public updateTree = false
  @Output() public updateMenuStructureEmitter = new EventEmitter<MenuItemDetailsDTO[]>()

  public menuTreeNodes!: TreeNode<PortalMenuItemDTO>[]
  public treeExpanded = false
  public languagesPreviewValue = 'en'

  constructor(private stateService: MenuStateService, private treeService: MenuTreeService) {}

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['portalMenuItems'] || changes['updateTree']) {
      this.menuTreeNodes = this.mapToTree(this.portalMenuItems, this.languagesPreviewValue)
      this.treeExpanded = true
    }
  }
  expandAll() {
    this.menuTreeNodes.forEach((node) => {
      this.expandRecursive(node, true)
    })
  }

  collapseAll() {
    this.menuTreeNodes.forEach((node) => {
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

  private mapToTree(items: PortalMenuItemDTO[], lang: string): TreeNode<PortalMenuItemDTO>[] {
    items.sort((a, b) => (a.position || 0) - (b.position || 0))
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
          (mi.badge
            ? 'pi pi-' + mi.badge + (langExists ? '' : ' lang-not-exists')
            : mi.children && mi.children.length > 0
            ? 'pi pi-folder'
            : 'pi pi-file invisible')
      }
    })
  }

  private flatten(mi: PortalMenuItemDTO): PortalMenuItemDTO[] {
    const res = mi.children && mi.children.length > 0 ? mi.children.flatMap((pi) => this.flatten(pi)).concat(mi) : [mi]
    return res
  }

  public onDrop(event: { dragNode: TreeNode<PortalMenuItemDTO>; dropNode: TreeNode<PortalMenuItemDTO> }): void {
    const draggedNodeId = event.dragNode.key
    const oldParentNodeId = event.dragNode.parent ? event.dragNode.parent.key : undefined

    // find new parent id
    let newParentNodeId: string | undefined
    if (event.dropNode.children && event.dropNode.children.map((child) => child.key).includes(draggedNodeId)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      newParentNodeId = event.dropNode.key!
    } else if (event.dropNode.parent) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      newParentNodeId = event.dropNode.parent.key!
    }

    const newNodesPositions = this.treeService.calculateNewNodesPositions(
      oldParentNodeId,
      newParentNodeId,
      this.menuTreeNodes
    )
    const flatMenuItem = this.portalMenuItems.flatMap((pi) => this.flatten(pi))

    // prepare menu items to update
    const updatedMenuItems: MenuItemDetailsDTO[] = []
    for (const updatedNode of newNodesPositions) {
      const updateMenuItem = flatMenuItem.find((item: PortalMenuItemDTO) => item.id === updatedNode.id)
      if (!updateMenuItem) {
        return
      }
      if (updatedNode.id !== draggedNodeId) {
        updatedMenuItems.push({
          key: updateMenuItem.key,
          id: updateMenuItem.id,
          parentItemId: updateMenuItem.parentItemId,
          i18n: updateMenuItem.i18n,
          position: updatedNode.position,
          disabled: updateMenuItem.disabled,
          portalExit: updateMenuItem.portalExit
        })
      } else {
        updatedMenuItems.push({
          key: updateMenuItem.key,
          id: updateMenuItem.id,
          parentItemId: newParentNodeId,
          i18n: updateMenuItem.i18n,
          position: updatedNode.position,
          disabled: updateMenuItem.disabled,
          portalExit: updateMenuItem.portalExit
        })
      }
    }

    this.updateMenuStructureEmitter.emit(updatedMenuItems)
  }

  public onHierarchyViewChange(event: { node: { key: string; expanded: boolean } }): void {
    this.stateService.getState().treeExpansionState.set(event.node.key, event.node.expanded)
  }

  public onLanguagesPreviewChange(lang: string) {
    this.languagesPreviewValue = lang
    this.menuTreeNodes = this.mapToTree(this.portalMenuItems, this.languagesPreviewValue)
  }
}
