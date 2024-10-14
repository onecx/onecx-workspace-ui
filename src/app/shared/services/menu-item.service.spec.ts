import { TestBed } from '@angular/core/testing'
import { MenuItemService } from './menu-item.service'
import { UserWorkspaceMenuItem } from '../generated'
import { MenuItem } from 'primeng/api'

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
    const result = service.constructMenuItems(undefined, 'en')
    expect(result).toEqual([])
  })

  it('should return an empty array if input is an empty array', () => {
    const result = service.constructMenuItems([], 'en')
    expect(result).toEqual([])
  })

  it('should correctly construct menu items from input data', () => {
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
        i18n: { en: 'Item 1 EN' }
      },
      {
        key: '2',
        name: 'Item 2',
        position: 2,
        disabled: false,
        external: true,
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
        icon: 'pi pi-star',
        routerLink: '/item1',
        items: undefined,
        url: undefined
      },
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-check',
        routerLink: undefined,
        items: undefined,
        url: 'http://external.com'
      }
    ]
    const result = service.constructMenuItems(input, 'en')
    expect(result).toEqual(expected)
  })

  it('should correctly replace external menuItem variable using sessionStorage', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '1',
        name: 'Item 1',
        position: 1,
        disabled: false,
        external: false,
        url: '/item1?param=[[DONTREPLACEME]]',
        badge: 'star',
        children: [],
        i18n: { en: 'Item 1 EN' }
      },
      {
        key: '2',
        name: 'Item 2',
        position: 2,
        disabled: false,
        external: true,
        url: 'http://external.com?id=[[id]]',
        badge: 'check',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '1',
        label: 'Item 1 EN',
        icon: 'pi pi-star',
        routerLink: '/item1?param=[[DONTREPLACEME]]',
        items: undefined,
        url: undefined
      },
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-check',
        routerLink: undefined,
        items: undefined,
        url: 'http://external.com?id=2'
      }
    ]
    const result = service.constructMenuItems(input, 'en')
    expect(sessionStorage.getItem).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem).toHaveBeenCalledTimes(0)
    expect(result).toEqual(expected)
  })

  it('should correctly replace external menuItem variable using localStorage as a fallback for sessionStorage', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '1',
        name: 'Item 1',
        position: 1,
        disabled: false,
        external: false,
        url: '/item1?param=[[DONTREPLACEME]]',
        badge: 'star',
        children: [],
        i18n: { en: 'Item 1 EN' }
      },
      {
        key: '2',
        name: 'Item 2',
        position: 2,
        disabled: false,
        external: true,
        url: 'http://external.com?id=[[id]]',
        badge: 'check',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '1',
        label: 'Item 1 EN',
        icon: 'pi pi-star',
        routerLink: '/item1?param=[[DONTREPLACEME]]',
        items: undefined,
        url: undefined
      },
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-check',
        routerLink: undefined,
        items: undefined,
        url: 'http://external.com?id=1'
      }
    ]
    sessionStorage.clear()
    const result = service.constructMenuItems(input, 'en')
    expect(sessionStorage.getItem).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expected)
  })

  it("should correctly replace external menuItem variable using '' as a fallback for localStorage and sessionStorage", () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '1',
        name: 'Item 1',
        position: 1,
        disabled: false,
        external: false,
        url: '/item1?param=[[DONTREPLACEME]]',
        badge: 'star',
        children: [],
        i18n: { en: 'Item 1 EN' }
      },
      {
        key: '2',
        name: 'Item 2',
        position: 2,
        disabled: false,
        external: true,
        url: 'http://external.com?id=[[id]]',
        badge: 'check',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '1',
        label: 'Item 1 EN',
        icon: 'pi pi-star',
        routerLink: '/item1?param=[[DONTREPLACEME]]',
        items: undefined,
        url: undefined
      },
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-check',
        routerLink: undefined,
        items: undefined,
        url: 'http://external.com?id='
      }
    ]
    sessionStorage.clear()
    localStorage.clear()
    const result = service.constructMenuItems(input, 'en')
    expect(sessionStorage.getItem).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expected)
  })

  it('should correctly replace multiple external menuItem variables using sessionStorage', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '1',
        name: 'Item 1',
        position: 1,
        disabled: false,
        external: false,
        url: '/item1?param=[[DONTREPLACEME]]',
        badge: 'star',
        children: [],
        i18n: { en: 'Item 1 EN' }
      },
      {
        key: '2',
        name: 'Item 2',
        position: 2,
        disabled: false,
        external: true,
        url: 'http://external.com?id=[[id]]&mykey=[[key]]',
        badge: 'check',
        children: [],
        i18n: { en: 'Item 2 EN' }
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '1',
        label: 'Item 1 EN',
        icon: 'pi pi-star',
        routerLink: '/item1?param=[[DONTREPLACEME]]',
        items: undefined,
        url: undefined
      },
      {
        id: '2',
        label: 'Item 2 EN',
        icon: 'pi pi-check',
        routerLink: undefined,
        items: undefined,
        url: 'http://external.com?id=2&mykey=my-sessionstorage-key'
      }
    ]
    const result = service.constructMenuItems(input, 'en')
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
        children: [],
        i18n: { en: 'Item 1 EN' }
      }
    ]
    const result = service.constructMenuItems(input, 'en')
    expect(result[0].id).toBe('1')
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
    const result = service.constructMenuItems(input, 'en')
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
    const result = service.constructMenuItems(input, 'en')
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
    const result = service.constructMenuItems(input, 'en')
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
        url: '/parent',
        badge: 'parent',
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
        routerLink: '/parent',
        items: [
          {
            id: '1.1',
            label: 'Child Item EN',
            icon: 'pi pi-child',
            routerLink: '/child',
            items: undefined,
            url: undefined
          }
        ],
        url: undefined
      }
    ]
    const result = service.constructMenuItems(input, 'en')
    expect(result).toEqual(expected)
  })

  it('should expand parents of current mfe item', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '1',
        name: 'Parent Item',
        position: 1,
        disabled: false,
        external: false,
        children: [
          {
            key: '1.1',
            name: 'Second parent Item',
            position: 1,
            disabled: false,
            external: false,
            children: [
              {
                key: '1.1.1',
                name: 'Child Item',
                position: 1,
                disabled: false,
                external: false,
                url: '/admin/mfe',
                children: []
              }
            ]
          }
        ]
      }
    ]
    const expected: MenuItem[] = [
      {
        id: '1',
        label: '',
        expanded: true,
        icon: undefined,
        routerLink: undefined,
        url: undefined,
        items: [
          {
            id: '1.1',
            label: '',
            expanded: true,
            icon: undefined,
            routerLink: undefined,
            url: undefined,
            items: [
              {
                id: '1.1.1',
                label: '',
                items: undefined,
                routerLink: '/admin/mfe',
                url: undefined,
                icon: undefined
              }
            ]
          }
        ]
      }
    ]
    const result = service.constructMenuItems(input, 'en', '/admin/mfe')
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
    const resultEn = service.constructMenuItems(input, 'en')
    const resultFr = service.constructMenuItems(input, 'fr')
    expect(resultEn[0].label).toBe('Item 1 EN')
    expect(resultFr[0].label).toBe('Item 1 FR')
  })
})
