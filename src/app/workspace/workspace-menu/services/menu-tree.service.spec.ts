import { TestBed } from '@angular/core/testing'
import { TreeNode } from 'primeng/api'

import { MenuTreeService } from './menu-tree.service'
import { WorkspaceMenuItem } from 'src/app/shared/generated'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'

describe('MenuTreeService', () => {
  let service: MenuTreeService

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClientTesting(), provideHttpClient(), MenuTreeService]
    })

    service = TestBed.inject(MenuTreeService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  it('should calculate new positions correctly when old and new parent IDs are different', () => {
    const oldParentId = 'oldParent'
    const newParentId = 'newParent'
    const mockTreeNodes = [
      { key: 'oldParent', children: [{ key: 'child1' }, { key: 'child2' }] },
      { key: 'newParent', children: [{ key: 'child3' }, { key: 'child4' }] }
    ]

    const result = service.calculateNewNodesPositions(oldParentId, newParentId, mockTreeNodes)

    expect(result).toEqual([
      { id: 'child1', position: 0 },
      { id: 'child2', position: 1 },
      { id: 'child3', position: 0 },
      { id: 'child4', position: 1 }
    ])
  })

  it('should calculate new positions correctly when old or new parent IDs are missing', () => {
    const mockTreeNodes = [
      { key: 'root1', children: [{ key: 'child1' }] },
      { key: 'root2', children: [{ key: 'child2' }] }
    ]

    const result = service.calculateNewNodesPositions(undefined, undefined, mockTreeNodes)
    expect(result).toEqual([
      { id: 'root1', position: 0 },
      { id: 'root2', position: 1 }
    ])
  })

  describe('findNodeRecursively', () => {
    it('should find node in node child', () => {
      const id = 'otherChild'
      const mockTreeNodes = [
        { key: 'oldParent', children: [{ key: 'child1' }, { key: 'child2' }] },
        { key: 'newParent', children: [{ key: 'otherChild' }, { key: 'child4' }] }
      ]

      const result = service['findNodeRecursively'](id, mockTreeNodes as unknown as TreeNode<any>[])

      expect(result).toEqual({ key: 'otherChild' })
    })

    it('should calculate new positions correctly: nodes are null', () => {
      const id = 'otherParent'
      const mockTreeNodes = null

      const result = service['findNodeRecursively'](id, mockTreeNodes as unknown as TreeNode<any>[])

      expect(result).toBeNull()
    })

    it('should calculate new positions correctly: nodes are empty', () => {
      const id = 'otherParent'
      const mockTreeNodes: TreeNode[] = []

      const result = service['findNodeRecursively'](id, mockTreeNodes as unknown as TreeNode<any>[])

      expect(result).toBeNull()
    })
  })

  it('should parse items from structure correctly', () => {
    const structure: WorkspaceMenuItem[] = [
      {
        name: '1',
        url: '/1',
        id: 'id',
        children: [
          {
            name: 'Sub 1.1',
            url: '/1/sub1',
            id: 'id'
          },
          {
            name: 'Sub 1.2',
            url: '/1/sub2',
            id: 'id'
          }
        ]
      },
      {
        name: '2',
        url: '/2',
        id: 'id'
      }
    ]
    const list: WorkspaceMenuItem[] = []

    const result = service.parseItemsFromStructure(structure, list)

    expect(result).toEqual([
      {
        name: '1',
        url: '/1',
        id: 'id'
      },
      {
        name: 'Sub 1.1',
        url: '/1/sub1',
        id: 'id'
      },
      {
        name: 'Sub 1.2',
        url: '/1/sub2',
        id: 'id'
      },
      {
        name: '2',
        url: '/2',
        id: 'id'
      }
    ])
  })

  it('should return an empty array if there are no items', () => {
    const result = service.mapToTreeNodes([])

    expect(result).toEqual([])
  })

  it('should map items to TreeNodes correctly', () => {
    const items: WorkspaceMenuItem[] = [
      {
        id: 'item1',
        name: 'Item 1',
        position: 1,
        children: [
          {
            id: 'subitem1',
            name: 'Subitem 1.1',
            position: 2,
            children: [
              {
                id: 'subsubitem1',
                name: 'Subsubitem 1.1.1',
                position: 3
              }
            ]
          },
          {
            id: 'subitem2',
            name: 'Subitem 1.2',
            position: 4
          }
        ]
      },
      {
        id: 'item2',
        name: 'Item 2',
        position: 5
      }
    ]

    const result = service.mapToTreeNodes(items)

    expect(result).toEqual([
      {
        styleClass: 'non-leaf',
        label: 'Item 1',
        key: 'item1',
        expanded: false,
        children: [
          {
            styleClass: 'non-leaf',
            label: 'Subitem 1.1',
            key: 'subitem1',
            expanded: false,
            children: [
              {
                styleClass: 'leaf',
                label: 'Subsubitem 1.1.1',
                key: 'subsubitem1',
                expanded: false,
                children: [],
                leaf: false
              }
            ],
            leaf: false
          },
          {
            styleClass: 'leaf',
            label: 'Subitem 1.2',
            key: 'subitem2',
            expanded: false,
            children: [],
            leaf: false
          }
        ],
        leaf: false
      },
      {
        styleClass: 'leaf',
        label: 'Item 2',
        key: 'item2',
        expanded: false,
        children: [],
        leaf: false
      }
    ])
  })

  it('should sort and map items to TreeNodes correctly if position values are decreasing', () => {
    const items: WorkspaceMenuItem[] = [
      {
        id: 'item1',
        name: 'Item 1',
        position: 1,
        children: [
          {
            id: 'subitem1',
            name: 'Subitem 1.1',
            position: 2,
            children: [
              {
                id: 'subsubitem2',
                name: 'Subsubitem 1.1.2',
                position: 4
              },
              {
                id: 'subsubitem1',
                name: 'Subsubitem 1.1.1',
                position: 3
              }
            ]
          },
          {
            id: 'subitem2',
            name: 'Subitem 1.2',
            position: 5
          }
        ]
      },
      {
        id: 'item2',
        name: 'Item 2',
        position: 6
      }
    ]

    const result = service.mapToTreeNodes(items)

    expect(result).toEqual([
      {
        styleClass: 'non-leaf',
        label: 'Item 1',
        key: 'item1',
        expanded: false,
        children: [
          {
            styleClass: 'non-leaf',
            label: 'Subitem 1.1',
            key: 'subitem1',
            expanded: false,
            children: [
              {
                styleClass: 'leaf',
                label: 'Subsubitem 1.1.1',
                key: 'subsubitem1',
                expanded: false,
                children: [],
                leaf: false
              },
              {
                styleClass: 'leaf',
                label: 'Subsubitem 1.1.2',
                key: 'subsubitem2',
                expanded: false,
                children: [],
                leaf: false
              }
            ],
            leaf: false
          },
          {
            styleClass: 'leaf',
            label: 'Subitem 1.2',
            key: 'subitem2',
            expanded: false,
            children: [],
            leaf: false
          }
        ],
        leaf: false
      },
      {
        styleClass: 'leaf',
        label: 'Item 2',
        key: 'item2',
        expanded: false,
        children: [],
        leaf: false
      }
    ])
  })
})
