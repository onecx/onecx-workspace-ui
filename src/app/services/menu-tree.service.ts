import { Injectable } from '@angular/core'
import { TreeNode } from 'primeng/api'
import { MenuItem } from 'src/app/shared/generated'

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
    const newNodesPositions: NewPosition[] = []

    if (oldParentId && oldParentId !== newParentId) {
      const resultNode = this.findNodeRecursively(oldParentId, menuTreeNodes) as TreeNode<any>
      if (resultNode.children && resultNode.children.length > 0) {
        for (const child of resultNode.children) {
          newNodesPositions.push({
            id: child.key,
            position: resultNode.children.indexOf(child)
          })
        }
      }
    }

    if (newParentId) {
      const resultNode = this.findNodeRecursively(newParentId, menuTreeNodes) as TreeNode<any>
      if (resultNode.children && resultNode.children.length > 0) {
        for (const child of resultNode.children) {
          newNodesPositions.push({
            id: child.key,
            position: resultNode.children.indexOf(child)
          })
        }
      }
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

  public parseItemsFromStructure(structure: MenuItem[], list: MenuItem[]) {
    structure.forEach((structureItem) => {
      const menuItem = {}
      Object.keys(structureItem).forEach((key) => {
        if (key !== 'children') {
          ;(menuItem as any)[key] = (structureItem as any)[key]
        }
      })
      list.push(menuItem as MenuItem)
      if (structureItem.children && structureItem?.children.length > 0) {
        this.parseItemsFromStructure(structureItem.children, list)
      }
    })
    return list
  }

  public mapToTreeNodes(items: MenuItem[]): TreeNode[] {
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

  private createTreeNode(item: MenuItem): TreeNode {
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
