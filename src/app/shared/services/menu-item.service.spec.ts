import { TestBed } from '@angular/core/testing'
import { MenuItemService } from './menu-item.service'
import { Target, UserWorkspaceMenuItem } from '../generated'
import { MenuItem } from 'primeng/api'
import { ItemType } from '../model/slim-menu-item'

const storageMock = (initialStorage: { [key: string]: string }) => {
  let storage: { [key: string]: string } = initialStorage
  return {
    getItem: (key: string) => (key in storage ? storage[key] : null),
    setItem: (key: string, value: string) => (storage[key] = value || ''),
    removeItem: (key: string) => delete storage[key],
    clear: () => (storage = {})
  }
}

function mockStorage() {
  const mockLocalStorage = storageMock({
    id: '1',
    key: 'my-localstorage-key'
  })
  const mockSessionStorage = storageMock({
    id: '2',
    key: 'my-sessionstorage-key'
  })

  spyOn(window.localStorage, 'getItem').and.callFake(mockLocalStorage.getItem)
  spyOn(window.localStorage, 'setItem').and.callFake(mockLocalStorage.setItem)
  spyOn(window.localStorage, 'removeItem').and.callFake(mockLocalStorage.removeItem)
  spyOn(window.localStorage, 'clear').and.callFake(mockLocalStorage.clear)

  spyOn(window.sessionStorage, 'getItem').and.callFake(mockSessionStorage.getItem)
  spyOn(window.sessionStorage, 'setItem').and.callFake(mockSessionStorage.setItem)
  spyOn(window.sessionStorage, 'removeItem').and.callFake(mockSessionStorage.removeItem)
  spyOn(window.sessionStorage, 'clear').and.callFake(mockSessionStorage.clear)
}

describe('MenuItemService', () => {
  let service: MenuItemService

  beforeEach(() => {
    mockStorage()
    TestBed.configureTestingModule({})
    service = TestBed.inject(MenuItemService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  it('should return an empty array if input is undefined', () => {
    const result = service.constructMenuItems(undefined, 'en', '/base-path')
    expect(result).toEqual([])
  })

  it('should return an empty array if input is an empty array', () => {
    const result = service.constructMenuItems([], 'en', '/base-path')
    expect(result).toEqual([])
  })

  it('should correctly construct menu items from input data', () => {
    const childrenItem = [
      { key: '2', name: '2', disabled: false, external: false, target: Target.Self, badge: 'cog' },
      {
        key: '3',
        name: '3',
        disabled: false,
        external: false,
        target: Target.Self,
        badge: 'bar',
        url: 'r',
        position: 3
      },
      {
        key: '4',
        name: '4',
        disabled: false,
        external: false,
        target: Target.Self,
        badge: 'box',
        url: 'l'
      }
    ]
    const childrenMenuItem = [
      {
        id: '2',
        label: '2',
        items: undefined,
        icon: 'pi pi-cog',
        target: Target.Self,
        routerLink: undefined,
        queryParams: undefined,
        url: undefined
      },
      {
        id: '4',
        label: '4',
        items: undefined,
        icon: 'pi pi-box',
        target: Target.Self,
        routerLink: '/l',
        queryParams: undefined,
        url: undefined
      },
      {
        id: '3',
        label: '3',
        items: undefined,
        target: Target.Self,
        icon: 'pi pi-bar',
        routerLink: '/r',
        queryParams: undefined,
        url: undefined
      }
    ]
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '1',
        name: 'Item 1',
        position: 1,
        disabled: false,
        external: false,
        target: Target.Self,
        url: '/item1',
        badge: 'star',
        children: childrenItem,
        i18n: { en: 'Item 1 EN' }
      },
      {
        key: '2',
        name: 'Item 2',
        position: 2,
        disabled: false,
        external: true,
        target: Target.Self,
        url: 'http://external.com',
        badge: 'check',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '1',
        label: 'Item 1 EN',
        items: childrenMenuItem,
        icon: 'pi pi-star',
        target: Target.Self,
        routerLink: '/item1',
        queryParams: undefined,
        url: undefined
      },
      {
        id: '2',
        label: 'Item 2 EN',
        items: undefined,
        icon: 'pi pi-check',
        target: Target.Self,
        routerLink: undefined,
        queryParams: undefined,
        url: 'http://external.com'
      }
    ]
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(result).toEqual(expected)
  })

  it('should correctly replace external menuItem variable using sessionStorage', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: 2,
        disabled: false,
        external: true,
        target: Target.Self,
        url: 'http://external.com?id=[[id]]',
        badge: 'check',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-check',
        target: Target.Self,
        routerLink: undefined,
        queryParams: undefined,
        items: undefined,
        url: 'http://external.com?id=2'
      }
    ]
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(sessionStorage.getItem).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem).toHaveBeenCalledTimes(0)
    expect(result).toEqual(expected)
  })

  it('should correctly replace internal menuItem variable using sessionStorage', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: undefined,
        disabled: false,
        external: false,
        target: Target.Blank,
        url: '/item2?id=[[id]]',
        badge: 'star',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-star',
        target: Target.Blank,
        routerLink: '/item2',
        queryParams: { id: '2' },
        items: undefined,
        url: undefined
      }
    ]
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(sessionStorage.getItem).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem).toHaveBeenCalledTimes(0)
    expect(result).toEqual(expected)
  })

  it('should correctly replace external menuItem variable using localStorage as a fallback for sessionStorage', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: 1,
        disabled: false,
        external: true,
        target: Target.Blank,
        url: 'http://external.com?id=[[id]]',
        badge: 'check',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-check',
        target: Target.Blank,
        routerLink: undefined,
        queryParams: undefined,
        items: undefined,
        url: 'http://external.com?id=1'
      }
    ]
    sessionStorage.clear()
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(sessionStorage.getItem).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expected)
  })

  it('should correctly replace internal menuItem variable using localStorage as a fallback for sessionStorage', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: 1,
        disabled: false,
        external: false,
        target: Target.Blank,
        url: '/item2?id=[[id]]',
        badge: 'star',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-star',
        target: Target.Blank,
        routerLink: '/item2',
        queryParams: { id: '1' },
        items: undefined,
        url: undefined
      }
    ]
    sessionStorage.clear()
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(sessionStorage.getItem).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expected)
  })

  it("should correctly replace external menuItem variable using '' as a fallback for localStorage and sessionStorage", () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: 1,
        disabled: false,
        external: true,
        target: Target.Blank,
        url: 'http://external.com?id=[[id]]',
        badge: 'check',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-check',
        target: Target.Blank,
        routerLink: undefined,
        queryParams: undefined,
        items: undefined,
        url: 'http://external.com?id='
      }
    ]
    sessionStorage.clear()
    localStorage.clear()
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(sessionStorage.getItem).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expected)
  })

  it("should correctly replace internal menuItem variable using '' as a fallback for localStorage and sessionStorage", () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: 1,
        disabled: false,
        external: false,
        target: Target.Self,
        url: '/item2?id=[[id]]',
        badge: 'star',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-star',
        target: Target.Self,
        routerLink: '/item2',
        queryParams: { id: '' },
        items: undefined,
        url: undefined
      }
    ]
    sessionStorage.clear()
    localStorage.clear()
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(sessionStorage.getItem).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expected)
  })

  it('should correctly replace multiple external menuItem variables using sessionStorage', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: 1,
        disabled: false,
        external: true,
        target: Target.Self,
        url: 'http://external.com?id=[[id]]&mykey=[[key]]',
        badge: 'check',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-check',
        target: Target.Self,
        routerLink: undefined,
        queryParams: undefined,
        items: undefined,
        url: 'http://external.com?id=2&mykey=my-sessionstorage-key'
      }
    ]
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(sessionStorage.getItem).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem).toHaveBeenCalledTimes(0)
    expect(result).toEqual(expected)
  })

  it('should correctly replace multiple internal menuItem variables using sessionStorage', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: 1,
        disabled: false,
        external: false,
        target: Target.Self,
        url: '/item2?id=[[id]]&mykey=[[key]]',
        badge: 'star',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-star',
        target: Target.Self,
        routerLink: '/item2',
        queryParams: { id: '2', mykey: 'my-sessionstorage-key' },
        items: undefined,
        url: undefined
      }
    ]
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(sessionStorage.getItem).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem).toHaveBeenCalledTimes(0)
    expect(result).toEqual(expected)
  })

  it('should sort menu items by position', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: 2,
        disabled: false,
        external: false,
        url: '/item2',
        badge: 'check',
        children: [],
        i18n: { en: 'Item 2 EN' }
      },
      {
        key: '1',
        name: 'Item 1',
        position: 1,
        disabled: false,
        external: false,
        url: '/item1',
        badge: 'star',
        i18n: { en: 'Item 1 EN' },
        children: [
          {
            key: '5',
            name: 'Item 5',
            position: 3,
            disabled: false,
            external: false,
            url: '/item5',
            badge: 'check',
            children: [],
            i18n: { en: 'Item 5 EN' }
          },
          {
            key: '3',
            name: 'Item 3',
            disabled: false,
            external: true,
            badge: 'check',
            children: [],
            i18n: { en: 'Item 3 EN' }
          },
          {
            key: '4',
            name: 'Item 4',
            position: 2,
            disabled: false,
            external: false,
            url: '/item4',
            badge: 'check',
            children: [],
            i18n: { en: 'Item 4 EN' }
          }
        ]
      }
    ]
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(result[0].id).toBe('1')
    expect(result[0].items?.length).toBe(3)
    expect(result[0].items?.at(0)?.id).toBe('3')
    expect(result[0].items?.at(1)?.id).toBe('4')
    expect(result[0].items?.at(2)?.id).toBe('5')
    expect(result[1].id).toBe('2')
  })

  it('should sort menu items by position with empty i18n and sort children', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: 2,
        disabled: false,
        external: false,
        url: '/item2',
        badge: 'check',
        children: [
          {
            key: '1.1',
            name: 'Child Item',
            position: 1,
            disabled: false,
            external: false,
            url: '/child',
            badge: 'child',
            children: [],
            i18n: { en: 'Child Item EN' }
          },
          {
            key: '1.1',
            name: 'Child Item',
            position: 1,
            disabled: false,
            external: false,
            url: '/child',
            badge: 'child',
            children: [],
            i18n: { en: 'Child Item EN' }
          }
        ]
      },
      {
        key: '1',
        name: 'Item 1',
        position: 1,
        disabled: false,
        external: false,
        url: '/item1',
        badge: 'star'
      }
    ]
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })

  it('should sort menu items items undefined', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: 2,
        disabled: false,
        external: false,
        url: '/item2',
        badge: 'check',
        children: [],
        i18n: { en: 'Item 2 EN' }
      },
      undefined!
    ]
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(result[0].id).toBe('2')
  })

  it('should handle empty menu items', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: 2,
        disabled: false,
        external: false,
        url: '/item2',
        badge: 'check',
        children: [],
        i18n: { en: 'Item 2 EN' }
      },
      {
        key: '1',
        name: 'Item 1',
        position: 1,
        disabled: false,
        external: false,
        url: '/item1',
        badge: 'star',
        children: [],
        i18n: { en: 'Item 1 EN' }
      },
      {}
    ]
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(result[0].id).toBe(undefined)
    expect(result[1].id).toBe('1')
    expect(result[2].id).toBe('2')
  })

  it('should map children correctly', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '1',
        name: 'Parent Item',
        position: 1,
        disabled: false,
        external: false,
        target: Target.Self,
        url: '/parent',
        badge: 'parent',
        children: [
          {
            key: '1.1',
            name: 'Child Item',
            position: 1,
            disabled: false,
            external: false,
            target: Target.Self,
            url: '/child',
            badge: 'child',
            children: [],
            i18n: { en: 'Child Item EN' }
          }
        ],
        i18n: { en: 'Parent Item EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '1',
        label: 'Parent Item EN',
        icon: 'pi pi-parent',
        target: Target.Self,
        routerLink: '/parent',
        queryParams: undefined,
        items: [
          {
            id: '1.1',
            label: 'Child Item EN',
            icon: 'pi pi-child',
            target: Target.Self,
            routerLink: '/child',
            queryParams: undefined,
            items: undefined,
            url: undefined
          }
        ],
        url: undefined
      }
    ]
    const result = service.constructMenuItems(input, 'en', '/base-path')
    expect(result).toEqual(expected)
  })

  it('should handle different languages', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '1',
        name: 'Item 1',
        position: 1,
        disabled: false,
        external: false,
        url: '/item1',
        badge: 'star',
        children: [],
        i18n: { en: 'Item 1 EN', fr: 'Item 1 FR' }
      }
    ]
    const resultEn = service.constructMenuItems(input, 'en', '/base-path')
    const resultFr = service.constructMenuItems(input, 'fr', '/base-path')
    expect(resultEn[0].label).toBe('Item 1 EN')
    expect(resultFr[0].label).toBe('Item 1 FR')
  })

  it('should select closest item as best match', () => {
    const items: MenuItem[] = [
      {
        label: 'Parent1',
        items: [
          {
            label: 'Workspace',
            routerLink: 'admin/workspace'
          },
          {
            label: 'User search',
            routerLink: 'admin/user/search/'
          },
          {
            label: 'Help',
            routerLink: 'admin/help'
          }
        ]
      },
      {
        label: 'Parent2',
        items: [
          {
            label: 'Tenant',
            routerLink: 'admin/tenant'
          },
          {
            label: 'MyPage',
            routerLink: 'admin/help/my-page'
          }
        ]
      }
    ]

    const result = service.findActiveItemBestMatch(items, '/admin/help/my-page')

    expect(result).toBeDefined()
    expect(result?.item.label).toBe('MyPage')
    expect(result?.matchedSegments).toEqual(3)
    expect(result?.parents.length).toBe(1)
    expect(result?.parents[0].label).toBe('Parent2')
  })

  describe('hasAction', () => {
    it('should return true if routerLink is defined', () => {
      const item: MenuItem = { routerLink: '/path' }
      expect(service.hasAction(item)).toBeTrue()
    })

    it('should return true if url is defined', () => {
      const item: MenuItem = { url: 'http://example.com' }
      expect(service.hasAction(item)).toBeTrue()
    })

    it('should return true if command is defined', () => {
      const item: MenuItem = {
        command: () => {
          console.log('Action')
        }
      }
      expect(service.hasAction(item)).toBeTrue()
    })
  })

  describe('getItemType', () => {
    it('should return ROUTER_LINK if routerLink is defined', () => {
      const item: MenuItem = { routerLink: '/path' }
      expect(service.getItemType(item)).toBe(ItemType.ROUTER_LINK)
    })

    it('should return URL if url is defined', () => {
      const item: MenuItem = { url: 'http://example.com' }
      expect(service.getItemType(item)).toBe(ItemType.URL)
    })

    it('should return ACTION if command is defined', () => {
      const item: MenuItem = {
        command: () => {
          console.log('Action')
        }
      }
      expect(service.getItemType(item)).toBe(ItemType.ACTION)
    })

    it('should return undefined if no action is defined', () => {
      const item: MenuItem = { label: 'No Action' }
      expect(service.getItemType(item)).toBeUndefined()
    })
  })

  describe('mapMenuItemsToSlimMenuItems', () => {
    beforeEach(() => {
      service.findActiveItemBestMatch = (() => {
        return {}
      }) as any
    })
    it('should map item', () => {
      const baseItem: MenuItem = {
        label: 'Base Item',
        icon: 'pi pi-base',
        tooltip: 'Base Tooltip',
        command: () => {
          console.log('baseItem')
        }
      }

      const result = service.mapMenuItemsToSlimMenuItems([baseItem])
      expect(result[0]).toEqual({
        active: false,
        type: ItemType.ACTION,
        label: baseItem.label,
        icon: baseItem.icon,
        command: baseItem.command,
        routerLink: baseItem.routerLink,
        url: baseItem.url,
        tooltip: baseItem.tooltip
      })
    })

    it('should map active item', () => {
      const activeItem = {
        label: 'Active Item',
        // needs to have an action to be considered
        command: () => {
          console.log('activeItem')
        }
      }
      const inactiveItem = {
        label: 'Inactive Item',
        // needs to have an action to be considered
        command: () => {
          console.log('inactiveItem')
        }
      }
      service.findActiveItemBestMatch = (() => {
        return { item: activeItem as MenuItem }
      }) as any
      const items = [activeItem, inactiveItem] as MenuItem[]

      const result = service.mapMenuItemsToSlimMenuItems(items, '/url')
      expect(result[0].active).toBeTrue()
      expect(result[1].active).toBeFalse()
    })

    it('should map item types correctly', () => {
      const routerLinkItem: MenuItem = {
        routerLink: '/router-link'
      }
      const urlItem: MenuItem = {
        url: '/url'
      }
      const actionItem: MenuItem = {
        command: () => {
          console.log('actionItem')
        }
      }
      const items: MenuItem[] = [routerLinkItem, urlItem, actionItem]

      const result = service.mapMenuItemsToSlimMenuItems(items)
      expect(result[0].type).toBe(ItemType.ROUTER_LINK)
      expect(result[1].type).toBe(ItemType.URL)
      expect(result[2].type).toBe(ItemType.ACTION)
    })

    it('should map label fallbacks correctly', () => {
      const withTitleFallback: MenuItem = {
        title: 'Title Fallback',
        command: () => {
          console.log('titleFallback')
        }
      }

      const result = service.mapMenuItemsToSlimMenuItems([withTitleFallback])
      expect(result[0].label).toBe(withTitleFallback.title)
    })

    it('should map tooltip fallbacks correctly', () => {
      const withTooltipLabelFallback: MenuItem = {
        label: 'Label Fallback',
        command: () => {
          console.log('labelFallback')
        }
      }
      const withTooltipTitleFallback: MenuItem = {
        title: 'Title Tooltip Fallback',
        command: () => {
          console.log('titleTooltipFallback')
        }
      }

      const result = service.mapMenuItemsToSlimMenuItems([withTooltipLabelFallback, withTooltipTitleFallback])
      expect(result[0].tooltip).toBe(withTooltipLabelFallback.label)
      expect(result[1].tooltip).toBe(withTooltipTitleFallback.title)
    })

    it('should not contain items without action', () => {
      const noActionItem: MenuItem = {
        label: 'No Action'
      }
      const actionItem: MenuItem = {
        label: 'Action Item',
        command: () => {
          console.log('actionItem')
        }
      }

      const result = service.mapMenuItemsToSlimMenuItems([noActionItem, actionItem])
      expect(result.length).toBe(1)
      expect(result[0].label).toBe(actionItem.label)
    })

    it('should flatten items and their children', () => {
      const parentItem: MenuItem = {
        label: 'Parent Item',
        items: [
          {
            label: 'Child Item 1',
            command: () => {
              console.log('childItem1')
            }
          },
          {
            label: 'Child Item 2',
            command: () => {
              console.log('childItem2')
            }
          }
        ]
      }

      const parentItemWithAction: MenuItem = {
        label: 'Parent Item With Action',
        command: () => {
          console.log('parentItemWithAction')
        },
        items: [
          {
            label: 'Child Item 3',
            command: () => {
              console.log('childItem1')
            }
          }
        ]
      }

      const result = service.mapMenuItemsToSlimMenuItems([parentItem, parentItemWithAction])
      expect(result.length).toBe(4)
      expect(result[0].label).toBe('Child Item 1')
      expect(result[1].label).toBe('Child Item 2')
      expect(result[2].label).toBe('Parent Item With Action')
      expect(result[3].label).toBe('Child Item 3')
    })
  })
})
