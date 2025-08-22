import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateService } from '@ngx-translate/core'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

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
import { CombinedSlot, WorkspaceSlotsComponent } from './workspace-slots.component'
import { Utils } from 'src/app/shared/utils'

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

fdescribe('WorkspaceSlotsComponent', () => {
  let component: WorkspaceSlotsComponent
  let fixture: ComponentFixture<WorkspaceSlotsComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const wProductServiceSpy = {
    getProductsByWorkspaceId: jasmine.createSpy('getProductsByWorkspaceId').and.returnValue(of({}))
  }
  const slotServiceSpy = {
    getSlotsForWorkspace: jasmine.createSpy('getSlotsForWorkspace').and.returnValue(of({})),
    createSlot: jasmine.createSpy('createSlot').and.returnValue(of({}))
  }
  const productServiceSpy = {
    searchAvailableProducts: jasmine.createSpy('searchAvailableProducts').and.returnValue(of({}))
  }
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
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    // to spy data: reset
    wProductServiceSpy.getProductsByWorkspaceId.calls.reset()
    slotServiceSpy.getSlotsForWorkspace.calls.reset()
    slotServiceSpy.createSlot.calls.reset()
    productServiceSpy.searchAvailableProducts.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    // to spy data: refill with neutral data
    wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of({}))
    slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({}))
    slotServiceSpy.createSlot.and.returnValue(of({}))
    productServiceSpy.searchAvailableProducts.and.returnValue(of({}))
  }))

  function initializeComponent(): void {
    fixture = TestBed.createComponent(WorkspaceSlotsComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(() => {
    initializeComponent()
  })

  describe('initialize', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
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
      expect(component.wSlots.length).toBe(5)
      expect(component.psSlots.length).toBe(5)
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
      spyOn(component as any, 'declarePsProducts').and.callFake(() => {})
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
  })

  /**
   * UI Events
   */
  describe('filtering', () => {
    it('should reset filter to default when ALL is selected', () => {
      component.onQuickFilterChange({ value: 'ALL' })

      expect(component.filterBy).toEqual('name,type')
      expect(component.quickFilterValue).toEqual('ALL')
    })

    it('should set filter by specific type', () => {
      component.onQuickFilterChange({ value: 'UNREGISTERED' })

      expect(component.filterBy).toEqual('type')
      expect(component.quickFilterValue).toEqual('UNREGISTERED')
    })

    it('should set filterBy to name,type when filter is empty', () => {
      component.onFilterChange('')

      expect(component.filterBy).toEqual('name')
    })

    it('should call filter method with "contains" when filter has a value', () => {
      component.dv = jasmine.createSpyObj('DataView', ['filter'])

      component.onFilterChange('testFilter')
    })
  })

  describe('sorting', () => {
    it('should set sortField correctly when onSortChange is called', () => {
      const testField = 'name'

      component.onSortChange(testField)

      expect(component.sortField).toBe(testField)
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

  describe('onSlotDetail', () => {
    let mockEvent: any

    beforeEach(() => {
      mockEvent = new Event('click')
      spyOn(mockEvent, 'stopPropagation')
    })

    it('should handle slot detail event and update the component state', () => {
      const mockSlot: CombinedSlot = {
        id: '123',
        new: false,
        type: 'WORKSPACE',
        changes: false,
        psSlots: [],
        psComponents: [],
        undeployed: false,
        deprecated: false
      }
      component.hasEditPermission = true

      component.onSlotDetail(mockEvent, mockSlot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(component.slot).toBe(mockSlot)
      expect(component.detailSlotId).toBe('123')
      expect(component.changeMode).toBe('EDIT')
      expect(component.showSlotDetailDialog).toBeTrue()
    })

    it('should handle slot detail event and set change mode to VIEW', () => {
      const mockSlot: CombinedSlot = {
        id: '123',
        new: false,
        type: 'WORKSPACE',
        changes: false,
        psSlots: [],
        psComponents: [],
        undeployed: false,
        deprecated: false
      }
      component.hasEditPermission = false

      component.onSlotDetail(mockEvent, mockSlot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(component.slot).toBe(mockSlot)
      expect(component.detailSlotId).toBe('123')
      expect(component.changeMode).toBe('VIEW')
      expect(component.showSlotDetailDialog).toBeTrue()
    })

    it('should not update state if slot is new', () => {
      const mockSlot: CombinedSlot = {
        id: '123',
        new: true,
        type: 'WORKSPACE',
        changes: false,
        psSlots: [],
        psComponents: [],
        undeployed: false,
        deprecated: false
      }
      component.hasEditPermission = true

      component.onSlotDetail(mockEvent, mockSlot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(component.slot).toBeUndefined()
      expect(component.detailSlotId).toBeUndefined()
      expect(component.changeMode).toBe('VIEW')
      expect(component.showSlotDetailDialog).toBeFalse()
    })
  })

  describe('Load data depending on whether data has been changed within detail dialog', () => {
    beforeEach(() => {
      spyOn(component, 'loadData').and.callFake(() => {})
    })

    it('should reset the component state and call loadData when data was changed in detail', () => {
      component.slot = { id: '123', new: false } as any
      component.detailSlotId = '123'
      component.changeMode = 'EDIT'
      component.showSlotDetailDialog = true
      component.showSlotDeleteDialog = false

      component.onSlotDetailClosed(true) // changed data

      expect(component.slot).toBeUndefined()
      expect(component.detailSlotId).toBeUndefined()
      expect(component.changeMode).toBe('VIEW')
      expect(component.showSlotDetailDialog).toBeFalse()
      expect(component.showSlotDeleteDialog).toBeFalse()
      expect(component.loadData).toHaveBeenCalled() // call
    })

    it('should reset the component state and not call loadData when data was not changed in detail', () => {
      component.slot = { id: '123', new: false } as any
      component.detailSlotId = '123'
      component.changeMode = 'EDIT'
      component.showSlotDetailDialog = true
      component.showSlotDeleteDialog = false

      component.onSlotDetailClosed(false) // no changes

      expect(component.slot).toBeUndefined()
      expect(component.detailSlotId).toBeUndefined()
      expect(component.changeMode).toBe('VIEW')
      expect(component.showSlotDetailDialog).toBeFalse()
      expect(component.showSlotDeleteDialog).toBeFalse()
      expect(component.loadData).not.toHaveBeenCalled() // NOT called
    })
  })

  describe('onAddSlot', () => {
    let mockEvent: any
    const mockSlot: CombinedSlot = {
      id: '123',
      new: true,
      type: 'UNREGISTERED',
      changes: false,
      psSlots: [],
      psComponents: [],
      undeployed: false,
      deprecated: false
    }

    beforeEach(() => {
      mockEvent = new Event('click')
      spyOn(mockEvent, 'stopPropagation')
      spyOn(component, 'loadData').and.callFake(() => {})
    })

    it('should create a slot and load data', () => {
      component.onAddSlot(mockEvent, mockSlot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(slotServiceSpy.createSlot).toHaveBeenCalledWith({
        createSlotRequest: { workspaceId: component.workspace?.id, name: mockSlot.name }
      })
      expect(component.loadData).toHaveBeenCalled()
    })

    it('should display error if slot creation fails', () => {
      const errorResponse = { status: 400, statusText: 'Error on creating a slot' }
      slotServiceSpy.createSlot.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onAddSlot(mockEvent, mockSlot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(slotServiceSpy.createSlot).toHaveBeenCalledWith({
        createSlotRequest: { workspaceId: component.workspace?.id, name: mockSlot.name }
      })
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.SLOT.MESSAGE_NOK' })
      expect(console.error).toHaveBeenCalledWith('createSlot', errorResponse)
    })
  })

  describe('onDeleteSlot', () => {
    let mockEvent: any
    const mockSlot: CombinedSlot = {
      id: '123',
      new: true,
      type: 'WORKSPACE',
      changes: false,
      psSlots: [],
      psComponents: [],
      undeployed: false,
      deprecated: false
    }

    beforeEach(() => {
      mockEvent = new Event('click')
      spyOn(mockEvent, 'stopPropagation')
      spyOn(component, 'loadData').and.callFake(() => {})
    })

    it('should delete a slot and update component state', () => {
      component.hasEditPermission = true

      component.onDeleteSlot(mockEvent, mockSlot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(component.slot).toBe(mockSlot)
      expect(component.detailSlotId).toBe('123')
      expect(component.changeMode).toBe('EDIT')
      expect(component.showSlotDeleteDialog).toBeTrue()
    })

    it('should delete a slot and update component state', () => {
      component.hasEditPermission = false

      component.onDeleteSlot(mockEvent, mockSlot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(component.slot).toBe(mockSlot)
      expect(component.detailSlotId).toBe('123')
      expect(component.changeMode).toBe('VIEW')
      expect(component.showSlotDeleteDialog).toBeTrue()
    })
  })

  it('should go to product slots', () => {
    spyOn(Utils, 'goToEndpoint')

    component.onGoToProductSlots()

    expect(Utils.goToEndpoint).toHaveBeenCalled()
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
})
