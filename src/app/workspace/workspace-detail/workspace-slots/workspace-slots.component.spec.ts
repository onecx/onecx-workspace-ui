import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateService } from '@ngx-translate/core'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { PortalMessageService, UserService, WorkspaceService } from '@onecx/angular-integration-interface'

import {
  ProductAPIService,
  Workspace,
  Slot,
  SlotComponent,
  SlotPS,
  SlotAPIService,
  WorkspaceProductAPIService,
  Product,
  ProductStoreItem,
  MicrofrontendPS,
  MicrofrontendType
} from 'src/app/shared/generated'

import { ExtendedSlot, WorkspaceSlotsComponent } from './workspace-slots.component'

const workspace: Workspace = {
  id: 'wid',
  displayName: 'displayName',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url'
}

/**
 * Product Store Data
 */
const psComp1: MicrofrontendPS = {
  appId: 'app1',
  appName: 'App 1',
  exposedModule: 'comp1',
  type: MicrofrontendType.Component,
  deprecated: true,
  undeployed: false
}
const psComp2: MicrofrontendPS = {
  appId: 'app1',
  appName: 'App 1',
  exposedModule: 'comp2',
  type: MicrofrontendType.Component,
  deprecated: true,
  undeployed: true
}
const psComp3: MicrofrontendPS = {
  appId: 'app2',
  appName: 'App 2',
  exposedModule: 'comp3',
  type: MicrofrontendType.Component
  // no state flags
}
const psSlot1: SlotPS = {
  name: 'slot-1',
  deprecated: false,
  undeployed: false
}
const psSlot2: SlotPS = {
  name: 'slot-2',
  deprecated: true,
  undeployed: false
}
const psSlot3: SlotPS = {
  name: 'slot-3',
  deprecated: false,
  undeployed: true
}
const psSlot4: SlotPS = {
  name: 'slot-4'
  // without state properties
}
// new slot = unregistered in workspace
const psSlot5: SlotPS = {
  name: 'slot-5',
  deprecated: false,
  undeployed: false
}

const psProduct1: ProductStoreItem = {
  productName: 'product1',
  displayName: 'Product 1',
  baseUrl: '/some/base/url',
  undeployed: false,
  microfrontends: [psComp1, psComp2, psComp3],
  slots: [psSlot1, psSlot2, psSlot3]
}
const psProduct2: ProductStoreItem = {
  productName: 'product2',
  displayName: 'Product 2',
  baseUrl: '/some/base/url',
  undeployed: false,
  microfrontends: [psComp1],
  slots: [psSlot4, psSlot5]
}
const psProducts: ProductStoreItem[] = [psProduct1, psProduct2]
/**
 * Workspace Data: registered products with slots
 */
const wSlotComp1: SlotComponent = {
  productName: 'product1',
  appId: 'app1',
  name: 'comp1'
}
const wSlotComp2: SlotComponent = {
  productName: 'product1',
  appId: 'app1',
  name: 'comp2'
}
const wSlotComp3: SlotComponent = {
  productName: 'product1',
  appId: 'app3',
  name: 'comp3'
}
const wSlot1: Slot = {
  id: 'ws1',
  workspaceId: 'wid',
  name: 'slot-1',
  components: [wSlotComp1]
}
const wSlot2: Slot = {
  id: 'ws2',
  workspaceId: 'wid',
  name: 'slot-2',
  components: [wSlotComp2]
}
const wSlot3: Slot = {
  id: 'ws3',
  workspaceId: 'wid',
  name: 'slot-3',
  components: [wSlotComp3]
}
const wSlot4: Slot = {
  id: 'ws4',
  workspaceId: 'wid',
  name: 'slot-4',
  components: []
}
const wSlots: Slot[] = [wSlot1, wSlot2, wSlot3, wSlot4]

const wProduct1: Product = {
  id: 'p1',
  productName: 'product1',
  displayName: 'Product 1',
  baseUrl: '/some/base/url',
  undeployed: false,
  microfrontends: [psComp1, psComp2],
  slots: [wSlot1, wSlot2, wSlot3, wSlot4]
}
const wProduct2: Product = {
  id: 'p2',
  productName: 'product2',
  displayName: 'Product 2',
  baseUrl: '/some/base/url',
  undeployed: false,
  microfrontends: [],
  slots: [wSlot4]
}
const wProducts: Product[] = [wProduct1, wProduct2]

describe('WorkspaceSlotsComponent', () => {
  let component: WorkspaceSlotsComponent
  let fixture: ComponentFixture<WorkspaceSlotsComponent>

  function initializeComponent(): void {
    fixture = TestBed.createComponent(WorkspaceSlotsComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const wProductServiceSpy = {
    getProductsByWorkspaceId: jasmine.createSpy('getProductsByWorkspaceId').and.returnValue(of({}))
  }
  const slotServiceSpy = {
    getSlotsForWorkspace: jasmine.createSpy('getSlotsForWorkspace').and.returnValue(of({}))
  }
  const productServiceSpy = {
    searchAvailableProducts: jasmine.createSpy('searchAvailableProducts').and.returnValue(of({}))
  }
  const workspaceServiceSpy = jasmine.createSpyObj<WorkspaceService>('WorkspaceService', ['doesUrlExistFor', 'getUrl'])
  const mockUserService = jasmine.createSpyObj('UserService', ['hasPermission'])
  mockUserService.hasPermission.and.callFake((permission: string) => {
    return ['WORKSPACE_SLOT#EDIT', 'WORKSPACE_SLOT#CREATE', 'WORKSPACE_SLOT#DELETE'].includes(permission)
  })

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceSlotsComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClientTesting(),
        provideHttpClient(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceProductAPIService, useValue: wProductServiceSpy },
        { provide: ProductAPIService, useValue: productServiceSpy },
        { provide: SlotAPIService, useValue: slotServiceSpy },
        { provide: WorkspaceService, useValue: workspaceServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    initializeComponent()

    // to spy data: reset
    wProductServiceSpy.getProductsByWorkspaceId.calls.reset()
    slotServiceSpy.getSlotsForWorkspace.calls.reset()
    productServiceSpy.searchAvailableProducts.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    // to spy data: refill with neutral data
    wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of({}))
    slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({}))
    productServiceSpy.searchAvailableProducts.and.returnValue(of({}))
    // used in ngOnChanges
    workspaceServiceSpy.doesUrlExistFor.and.returnValue(of(true))
  })

  describe('initialize', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })

    it('should set hasEditPermission from user service', () => {
      expect(component.hasEditPermission).toBeTrue()
    })
  })

  describe('ngOnDestroy', () => {
    it('should complete the destroy$ subject', () => {
      spyOn(component['destroy$'], 'next')
      spyOn(component['destroy$'], 'complete')

      component.ngOnDestroy()

      expect(component['destroy$'].next).toHaveBeenCalledWith(undefined)
      expect(component['destroy$'].complete).toHaveBeenCalled()
    })
  })

  describe('on changes', () => {
    it('should load data onChanges', () => {
      component.workspace = workspace
      spyOn(component, 'loadData')

      component.ngOnChanges({
        workspace: {
          currentValue: 'ws',
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true
        }
      })

      expect(component.loadData).toHaveBeenCalled()
    })

    it('should not load data when workspace is undefined', () => {
      component.workspace = undefined
      spyOn(component, 'loadData')

      component.ngOnChanges({
        workspace: {
          currentValue: undefined,
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true
        }
      })

      expect(component.loadData).not.toHaveBeenCalled()
    })

    it('should not load data when changes do not include workspace', () => {
      component.workspace = workspace
      spyOn(component, 'loadData')

      component.ngOnChanges({})

      expect(component.loadData).not.toHaveBeenCalled()
    })

    it('should load data onReload', () => {
      spyOn(component, 'loadData')

      component.onReload()

      expect(component.loadData).toHaveBeenCalled()
    })
  })

  describe('loadData', () => {
    beforeEach(() => {
      component.workspace = workspace
    })

    it('should load data - all successfull', () => {
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of(wProducts))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: wSlots }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: psProducts }))

      component.loadData()

      expect(component.wProductNames.length).toBe(2)
      expect(component.slots.length).toBe(5)
      expect(component.psComponents.length).toBe(4)
    })

    it('should load data - workspace products failed', () => {
      const errorResponse = { status: '404', statusText: 'Not found' }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(throwError(() => errorResponse))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: wSlots }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: psProducts }))
      spyOn(console, 'error')

      component.loadData()

      expect(console.error).toHaveBeenCalledWith('getProductsByWorkspaceId', errorResponse)
      expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.PRODUCTS')
    })

    it('should load data - workspace slot failed', () => {
      component.psSlots$ = of([])
      const errorResponse = { status: '404', statusText: 'Not found' }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of(wProducts))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(throwError(() => errorResponse))
      spyOn(component as any, 'getPsSlotsAndComponents').and.callFake(() => {})
      spyOn(console, 'error')

      component.loadData()

      expect(console.error).toHaveBeenCalledWith('getSlotsForWorkspace', errorResponse)
      expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.SLOTS')
    })

    it('should load data - product store products failed', () => {
      const errorResponse = { status: '404', statusText: 'Not found' }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of(wProducts))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: wSlots }))
      productServiceSpy.searchAvailableProducts.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.loadData()

      expect(console.error).toHaveBeenCalledWith('searchAvailableProducts', errorResponse)
      expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.PRODUCTS')
    })

    it('should handle empty stream from product store', () => {
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of(wProducts))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: wSlots }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: undefined }))

      component.loadData()

      expect(component.psComponents.length).toBe(0)
    })

    it('should handle empty slots from workspace', () => {
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of(wProducts))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: undefined }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: psProducts }))

      component.loadData()

      expect(component.slotsInternal.length).toBeGreaterThan(0) // only PS unregistered slots
    })

    it('should skip products without productName in workspace products', () => {
      const productsWithMissing = [{ productName: 'product1' }, { productName: undefined }, { productName: 'product2' }]
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of(productsWithMissing))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: [] }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [] }))

      component.loadData()

      expect(component.wProductNames).toEqual(['product1', 'product2'])
    })

    it('should handle PS product without slots property', () => {
      const psProductNoSlots: ProductStoreItem = {
        productName: 'product-no-slots',
        displayName: 'No Slots',
        microfrontends: [psComp1]
        // no slots property
      }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of(wProducts))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: wSlots }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [psProductNoSlots] }))

      component.loadData()

      // No PS slots extracted, but components are still extracted
      expect(component.psComponents.length).toBe(1)
    })

    it('should handle PS product without microfrontends', () => {
      const psProductNoMfe: ProductStoreItem = {
        productName: 'product-no-mfe',
        displayName: 'No MFE',
        microfrontends: [],
        slots: [psSlot1]
      }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of(wProducts))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: wSlots }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [psProductNoMfe] }))

      component.loadData()

      expect(component.psComponents.length).toBe(0)
    })

    it('should mark component as productUnregistered when product is not in wProductNames', () => {
      // workspace slot with component from an unregistered product
      const unregComp: SlotComponent = { productName: 'unregistered-product', appId: 'app-x', name: 'comp-x' }
      const slotWithUnregComp: Slot = {
        id: 'ws-unreg',
        workspaceId: 'wid',
        name: 'slot-unreg',
        components: [unregComp]
      }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of([{ productName: 'product1' }]))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: [slotWithUnregComp] }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [] }))

      component.loadData()

      const slot = component.slotsInternal.find((s) => s.name === 'slot-unreg')
      expect(slot!.changes).toBeTrue()
      expect(slot!.type).toContain('WORKSPACE')
      expect(slot!.type).toContain('CHANGES')
    })

    it('should handle two PS products declaring the same slot name and slot used in workspace', () => {
      // Both products have a slot named 'shared-slot'
      const sharedSlot: SlotPS = { name: 'shared-slot', deprecated: false, undeployed: false }
      const sharedSlotDeprecated: SlotPS = { name: 'shared-slot', deprecated: true, undeployed: false }
      const product1: ProductStoreItem = {
        productName: 'prodA',
        displayName: 'Prod A',
        microfrontends: [],
        slots: [sharedSlot]
      }
      const product2: ProductStoreItem = {
        productName: 'prodB',
        displayName: 'Prod B',
        microfrontends: [],
        slots: [sharedSlotDeprecated]
      }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(
        of([{ productName: 'prodA' }, { productName: 'prodB' }])
      )
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: [{ name: sharedSlot.name }] }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [product1, product2] }))

      component.loadData()

      // shared-slot should appear once with both product names and changes=true (deprecated from prod2)
      const slot = component.slots.find((s) => s.name === sharedSlot.name)
      expect(slot).toBeDefined()
      expect(slot!.productNames).toContain('prodA')
      expect(slot!.productNames).toContain('prodB')
      expect(slot!.changes).toBeTrue()
      expect(slot!.type).toContain('WORKSPACE')
      expect(slot!.type).toContain('CHANGES')
    })

    it('should handle two PS products declaring the same slot name and slot NOT used in workspace', () => {
      // Both products have a slot named 'shared-slot'
      const sharedSlot: SlotPS = { name: 'shared-slot', deprecated: false, undeployed: false }
      const sharedSlotDeprecated: SlotPS = { name: 'shared-slot', deprecated: true, undeployed: false }
      const product1: ProductStoreItem = {
        productName: 'prodA',
        displayName: 'Prod A',
        microfrontends: [],
        slots: [sharedSlot]
      }
      const product2: ProductStoreItem = {
        productName: 'prodB',
        displayName: 'Prod B',
        microfrontends: [],
        slots: [sharedSlotDeprecated]
      }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(
        of([{ productName: 'prodA' }, { productName: 'prodB' }])
      )
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: [] })) // empty = not used
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [product1, product2] }))

      component.loadData()

      // shared-slot should appear once with both product names and changes=true (deprecated from prod2)
      const slot = component.slots.find((s) => s.name === sharedSlot.name)
      expect(slot).toBeDefined()
      expect(slot!.productNames).toContain('prodA')
      expect(slot!.productNames).toContain('prodB')
      expect(slot!.changes).toBeTrue()
      expect(slot!.type).toContain('UNUSED')
      expect(slot!.type).toContain('CHANGES')
    })

    it('should mark lost components on workspace slots', () => {
      // wSlotComp with name not existing in PS components
      const lostComp: SlotComponent = { productName: 'product1', appId: 'app-lost', name: 'lost-comp' }
      const slotWithLostComp: Slot = { id: 'ws-lost', workspaceId: 'wid', name: 'slot-lost', components: [lostComp] }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of([{ productName: 'product1' }]))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: [slotWithLostComp] }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [] }))

      component.loadData()

      const slot = component.slotsInternal.find((s) => s.name === 'slot-lost')
      expect(slot!.changes).toBeTrue()
      expect(slot!.type).toContain('WORKSPACE')
      expect(slot!.type).toContain('CHANGES')
      expect(slot!.psComponents!.length).toBe(1)
      expect(slot!.psComponents![0].exists).toBeFalse()
    })

    it('should set slot to WORKSPACE,CHANGES when component is deprecated in PS', () => {
      const comp: SlotComponent = { productName: 'product1', appId: 'app1', name: 'comp1' }
      const wsSlot: Slot = { id: 'ws-dep', workspaceId: 'wid', name: 'slot-dep', components: [comp] }
      const psProd: ProductStoreItem = {
        productName: 'product1',
        displayName: 'Product 1',
        microfrontends: [
          { appId: 'app1', exposedModule: 'comp1', type: MicrofrontendType.Component, deprecated: true }
        ],
        slots: [{ name: 'slot-dep', deprecated: false, undeployed: false }]
      }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of([{ productName: 'product1' }]))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: [wsSlot] }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [psProd] }))

      component.loadData()

      const slot = component.slotsInternal.find((s) => s.name === 'slot-dep')
      expect(slot!.changes).toBeTrue()
      expect(slot!.type).toContain('WORKSPACE')
      expect(slot!.type).toContain('CHANGES')
      expect(slot!.psComponents!.length).toBe(1)
      expect(slot!.psComponents![0].deprecated).toBeTrue()
    })

    it('should not set changes when slot component is found and has no state issues', () => {
      const comp: SlotComponent = { productName: 'product1', appId: 'app1', name: 'comp-ok' }
      const wsSlot: Slot = { id: 'ws-ok', workspaceId: 'wid', name: 'slot-ok', components: [comp] }
      const psProd: ProductStoreItem = {
        productName: 'product1',
        displayName: 'Product 1',
        microfrontends: [
          {
            appId: 'app1',
            exposedModule: 'comp-ok',
            type: MicrofrontendType.Component,
            deprecated: false,
            undeployed: false
          }
        ],
        slots: [{ name: 'slot-ok', deprecated: false, undeployed: false }]
      }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of([{ productName: 'product1' }]))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: [wsSlot] }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [psProd] }))

      component.loadData()

      const slot = component.slotsInternal.find((s) => s.name === 'slot-ok')
      expect(slot!.changes).toBeFalse()
      expect(slot!.type).toContain('WORKSPACE')
      expect(slot!.psComponents!.length).toBe(1)
    })
  })

  /**
   * UI Events
   */
  describe('filtering', () => {
    it('should reset filter to default when ALL is selected', () => {
      component.slots = [{ name: 'slot-1', type: ['WORKSPACE'] } as ExtendedSlot]
      component.onQuickFilterChange({ value: 'ALL' })

      expect(component.quickFilterValue).toEqual('ALL')
      expect(component.slotsFiltered).toEqual(component.slots)
    })

    it('should filter slots by type WORKSPACE', () => {
      component.slots = [
        { name: 'slot-1', type: ['WORKSPACE'] } as ExtendedSlot,
        { name: 'slot-2', type: ['UNUSED'] } as ExtendedSlot,
        { name: 'slot-3', type: ['WORKSPACE', 'CHANGES'] } as ExtendedSlot
      ]

      component.onQuickFilterChange({ value: 'WORKSPACE' })

      expect(component.quickFilterValue).toEqual('WORKSPACE')
      expect(component.slotsFiltered.length).toBe(2)
      expect(component.slotsFiltered[0].name).toBe('slot-1')
      expect(component.slotsFiltered[1].name).toBe('slot-3')
    })

    it('should filter slots by type CHANGES', () => {
      component.slots = [
        { name: 'slot-1', type: ['WORKSPACE'] } as ExtendedSlot,
        { name: 'slot-2', type: ['UNUSED', 'CHANGES'] } as ExtendedSlot,
        { name: 'slot-3', type: ['WORKSPACE', 'CHANGES'] } as ExtendedSlot
      ]

      component.onQuickFilterChange({ value: 'CHANGES' })

      expect(component.quickFilterValue).toEqual('CHANGES')
      expect(component.slotsFiltered.length).toBe(2)
    })

    it('should set filterBy to name and call dv.filter when filter is empty', () => {
      const dv = jasmine.createSpyObj('DataView', ['filter'])
      component.onFilterChange('', dv)

      expect(component.filterBy).toEqual('name')
      expect(dv.filter).toHaveBeenCalledWith('')
    })

    it('should set filterBy to name and call dv.filter with the value', () => {
      const dv = jasmine.createSpyObj('DataView', ['filter'])

      component.onFilterChange('testFilter', dv)

      expect(component.filterBy).toEqual('name')
      expect(dv.filter).toHaveBeenCalledWith('testFilter')
    })
  })

  describe('sorting', () => {
    it('should set sortField correctly when onSortChange is called', () => {
      const testField = 'name'

      component.onSortChange(testField)

      expect(component.sortField).toBe(testField)
    })

    it('should sort slots by name case-insensitive', () => {
      const slotA = { name: 'alpha' } as ExtendedSlot
      const slotB = { name: 'Beta' } as ExtendedSlot

      expect(component.sortSlotsByName(slotA, slotB)).toBeLessThan(0)
      expect(component.sortSlotsByName(slotB, slotA)).toBeGreaterThan(0)
      expect(component.sortSlotsByName(slotA, slotA)).toBe(0)
    })

    describe('onSortDirChange', () => {
      it('should set sortOrder to -1 when onSortDirChange is called with true', () => {
        component.onSortDirChange(true)

        expect(component.sortOrder).toBe(-1)
      })

      it('should set sortOrder to 1 when onSortDirChange is called with false', () => {
        component.onSortDirChange(false)

        expect(component.sortOrder).toBe(1)
      })
    })
  })

  describe('slot detail', () => {
    let mockEvent: any

    beforeEach(() => {
      mockEvent = new Event('click')
      spyOn(mockEvent, 'stopPropagation')
    })

    it('should handle slot detail event and update the component state', () => {
      const mockSlot: ExtendedSlot = {
        id: '123',
        new: false,
        type: ['WORKSPACE'],
        changes: false,
        psSlots: [],
        psComponents: [],
        undeployed: false,
        deprecated: false,
        productNames: ['product1']
      }
      component.hasEditPermission = true

      component.onSlotDetail(mockEvent, mockSlot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(component.item4Detail).toBe(mockSlot)
      expect(component.changeMode).toBe('EDIT')
      expect(component.showSlotDetailDialog).toBeTrue()
    })

    it('should handle slot detail event and set change mode to VIEW', () => {
      const mockSlot: ExtendedSlot = {
        id: '123',
        new: false,
        type: ['WORKSPACE'],
        changes: false,
        psSlots: [],
        psComponents: [],
        undeployed: false,
        deprecated: false,
        productNames: ['product1']
      }
      component.hasEditPermission = false

      component.onSlotDetail(mockEvent, mockSlot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(component.item4Detail).toBe(mockSlot)
      expect(component.changeMode).toBe('VIEW')
      expect(component.showSlotDetailDialog).toBeTrue()
    })

    it('should open detail dialog if slot is new and has EDIT permission', () => {
      const mockSlot: ExtendedSlot = {
        id: '123',
        new: true,
        type: ['WORKSPACE'],
        changes: false,
        psSlots: [],
        psComponents: [],
        undeployed: false,
        deprecated: false,
        productNames: ['product1']
      }
      component.hasEditPermission = true

      component.onSlotDetail(mockEvent, mockSlot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(component.item4Detail).toBe(mockSlot)
      expect(component.changeMode).toBe('EDIT')
      expect(component.showSlotDetailDialog).toBeTrue()
    })
  })

  describe('Load data depending on whether data has been changed within detail dialog', () => {
    beforeEach(() => {
      spyOn(component, 'loadData').and.callFake(() => {})
    })

    it('should reset the component state and call loadData when data was changed in detail', () => {
      component.item4Detail = { id: '123', new: false } as any
      component.changeMode = 'EDIT'
      component.showSlotDetailDialog = true

      component.onSlotDetailClosed(true) // changed data

      expect(component.item4Detail).toBeUndefined()
      expect(component.changeMode).toBe('VIEW')
      expect(component.showSlotDetailDialog).toBeFalse()
      expect(component.loadData).toHaveBeenCalled() // call
    })

    it('should reset the component state and not call loadData when data was not changed in detail', () => {
      component.item4Detail = { id: '123', new: false } as any
      component.changeMode = 'EDIT'
      component.showSlotDetailDialog = true

      component.onSlotDetailClosed(false) // no changes

      expect(component.item4Detail).toBeUndefined()
      expect(component.changeMode).toBe('VIEW')
      expect(component.showSlotDetailDialog).toBeFalse()
      expect(component.loadData).not.toHaveBeenCalled() // NOT called
    })

    it('should not call loadData when changeMode is DELETE even if changed', () => {
      component.item4Detail = { id: '123', new: false } as any
      component.changeMode = 'DELETE'

      component.onSlotDetailClosed(true) // changes

      expect(component.item4Detail).toBeUndefined()
      expect(component.changeMode).toBe('VIEW')
      expect(component.showSlotDetailDialog).toBeFalse()
      expect(component.loadData).not.toHaveBeenCalled()
    })

    it('should not call loadData when item4Detail has no id', () => {
      component.item4Detail = { new: true } as any // no id
      component.changeMode = 'EDIT'

      component.onSlotDetailClosed(true) // changes

      expect(component.item4Detail).toBeUndefined()
      expect(component.changeMode).toBe('VIEW')
      expect(component.showSlotDetailDialog).toBeFalse()
      expect(component.loadData).not.toHaveBeenCalled()
    })
  })

  describe('Test translations', () => {
    it('dataview translations', (done) => {
      const translationData = {
        'DIALOG.DATAVIEW.FILTER': 'filter',
        'DIALOG.DATAVIEW.FILTER_OF': 'filterOf',
        'DIALOG.DATAVIEW.SORT_BY': 'sortBy'
      }
      const translateService = TestBed.inject(TranslateService)
      spyOn(translateService, 'get').and.returnValue(of(translationData))

      component.ngOnInit()

      component.dataViewControlsTranslations$?.subscribe({
        next: (data) => {
          if (data) {
            expect(data.sortDropdownTooltip).toEqual('sortBy')
          }
          done()
        },
        error: done.fail
      })
    })

    it('should translate quick filter items', () => {
      component.prepareQuickFilter()

      let items: any = []
      component.quickFilterOptions$!.subscribe((data) => (items = data))

      items[0].value

      expect(items[0].value).toEqual('ALL')
    })
  })

  describe('getProductEndpointUrl', () => {
    beforeEach(() => {
      component.workspace = workspace
    })

    it('should productEndpointExist - exist', (done) => {
      component.productEndpointExist = true
      workspaceServiceSpy.getUrl.and.returnValue(of('/url'))

      const eu$ = component.getProductEndpointUrl$()

      eu$.subscribe({
        next: (data) => {
          if (data) {
            expect(data).toBe('/url')
          }
          done()
        },
        error: done.fail
      })
    })

    it('should productEndpointExist - not exist', (done) => {
      component.productEndpointExist = false

      const eu$ = component.getProductEndpointUrl$()

      eu$.subscribe({
        next: (data) => {
          expect(data).toBeUndefined()
          done()
        },
        error: done.fail
      })
    })
  })
})
