import { TestBed } from '@angular/core/testing'
import { MenuItemService } from './menu-item.service'
import { UserWorkspaceMenuItem } from '../generated'
import { MenuItem } from 'primeng/api'

describe('MenuItemService', () => {
  let service: MenuItemService

  beforeEach(() => {
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

  it('should sort menu items by position', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '2',
        name: 'Item 2',
        position: 2,
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

  it('should map children correctly', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '1',
        name: 'Parent Item',
        position: 1,
        external: false,
        url: '/parent',
        badge: 'parent',
        children: [
          {
            key: '1.1',
            name: 'Child Item',
            position: 1,
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

  it('should handle different languages', () => {
    const input: UserWorkspaceMenuItem[] = [
      {
        key: '1',
        name: 'Item 1',
        position: 1,
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
