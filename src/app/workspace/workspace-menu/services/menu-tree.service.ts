import { Injectable } from '@angular/core'
import { TreeNode } from 'primeng/api'

import { WorkspaceMenuItem } from 'src/app/shared/generated'

export interface NewPosition {
  id: string | undefined
  position: number
}

@Injectable()
export class MenuTreeService {
  public calculateNewNodesPositions(
    oldParentId: string | undefined,
    newParentId: string | undefined,
    menuTreeNodes: TreeNode[]
  ): NewPosition[] {
    let newNodesPositions: NewPosition[] = []

    if (oldParentId && oldParentId !== newParentId) {
      const resultNode = this.findNodeRecursively(oldParentId, menuTreeNodes) as TreeNode<any>
      newNodesPositions = this.pushPositions(newNodesPositions, resultNode)
    }

    if (newParentId) {
      const resultNode = this.findNodeRecursively(newParentId, menuTreeNodes) as TreeNode<any>
      newNodesPositions = this.pushPositions(newNodesPositions, resultNode)
    }

    if (!newParentId || !oldParentId) {
      for (const rootNode of menuTreeNodes) {
        newNodesPositions.push({
          id: rootNode.key as string,
          position: menuTreeNodes.indexOf(rootNode)
        })
      }
    }
    return newNodesPositions
  }

  private pushPositions(positions: NewPosition[], resultNode: TreeNode<any>): NewPosition[] {
    if (resultNode.children && resultNode.children.length > 0) {
      for (const child of resultNode.children) {
        positions.push({
          id: child.key,
          position: resultNode.children.indexOf(child)
        })
      }
    }
    return positions
  }

  private findNodeRecursively(searchedId: string, nodes: TreeNode[]): TreeNode | null {
    if (!nodes || nodes.length === 0) {
      return null
    }
    for (const node of nodes) {
      if (node.key === searchedId) {
        return node
      }
      if (node.children) {
        const recursiveNode = this.findNodeRecursively(searchedId, node.children)
        if (recursiveNode) {
          return recursiveNode
        }
      }
    }
    return null
  }

  public parseItemsFromStructure(structure: WorkspaceMenuItem[], list: WorkspaceMenuItem[]) {
    structure.forEach((structureItem) => {
      const menuItem = {}
      Object.keys(structureItem).forEach((key) => {
        if (key !== 'children') {
          ;(menuItem as any)[key] = (structureItem as any)[key]
        }
      })
      list.push(menuItem as WorkspaceMenuItem)
      if (structureItem.children && structureItem?.children.length > 0) {
        this.parseItemsFromStructure(structureItem.children, list)
      }
    })
    return list
  }

  public mapToTreeNodes(items: WorkspaceMenuItem[]): TreeNode[] {
    if (!items || items.length === 0) {
      return []
    }
    const results: TreeNode[] = []
    items.sort((a, b) => ((a.position as number) > (b.position as number) ? 1 : -1))
    for (const item of items) {
      const newNode: TreeNode = this.createTreeNode(item)
      if (item.children && item.children.length > 0) {
        newNode.styleClass = 'non-leaf'
        newNode.children = this.mapToTreeNodes(item.children)
      }
      results.push(newNode)
    }
    return results
  }

  private createTreeNode(item: WorkspaceMenuItem): TreeNode {
    return {
      styleClass: 'leaf',
      label: item.name,
      key: item.id,
      expanded: false,
      children: [],
      leaf: false
    }
  }
}
