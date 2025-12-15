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

import { CombinedSlot, WorkspaceSlotsComponent } from './workspace-slots.component'

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
    getSlotsForWorkspace: jasmine.createSpy('getSlotsForWorkspace').and.returnValue(of({})),
    createSlot: jasmine.createSpy('createSlot').and.returnValue(of({})),
    deleteSlotById: jasmine.createSpy('deleteSlotById').and.returnValue(of({}))
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
    slotServiceSpy.createSlot.calls.reset()
    slotServiceSpy.deleteSlotById.calls.reset()
    productServiceSpy.searchAvailableProducts.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    // to spy data: refill with neutral data
    wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of({}))
    slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({}))
    slotServiceSpy.createSlot.and.returnValue(of({}))
    productServiceSpy.searchAvailableProducts.and.returnValue(of({}))
    // used in ngOnChanges
    workspaceServiceSpy.doesUrlExistFor.and.returnValue(of(true))
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
  })

  /**
   * UI Events
   */
  describe('filtering', () => {
    it('should reset filter to default when ALL is selected', () => {
      const dv = jasmine.createSpyObj('DataView', ['filter'])

      component.onQuickFilterChange({ value: 'ALL' }, dv)

      expect(component.filterBy).toEqual(component.filterByDefault)
      expect(component.quickFilterValue).toEqual('ALL')
    })

    it('should set filter by specific type', () => {
      const dv = jasmine.createSpyObj('DataView', ['filter'])
      component.onQuickFilterChange({ value: 'UNREGISTERED' }, dv)

      expect(component.filterBy).toEqual('type')
      expect(component.quickFilterValue).toEqual('UNREGISTERED')
    })

    it('should set filterBy to name,type when filter is empty', () => {
      const dv = jasmine.createSpyObj('DataView', ['filter'])
      component.onFilterChange('', dv)

      expect(component.filterBy).toEqual(component.filterByDefault)
    })

    it('should call filter method with "contains" when filter has a value', () => {
      const dv = jasmine.createSpyObj('DataView', ['filter'])

      component.onFilterChange('testFilter', dv)
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

  describe('slot detail', () => {
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
      expect(component.item4Detail).toBe(mockSlot)
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
      expect(component.item4Detail).toBe(mockSlot)
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
      expect(component.item4Detail).toBeUndefined()
      expect(component.changeMode).toBe('VIEW')
      expect(component.showSlotDetailDialog).toBeFalse()
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

    it('should adjust slot array after a slot was deleted', () => {
      component.item4Detail = { id: '123', new: false } as any
      component.changeMode = 'DELETE'
      component.showSlotDeleteDialog = true

      component.onSlotDetailClosed(true) // changes

      expect(component.item4Detail).toBeUndefined()
      expect(component.changeMode).toBe('VIEW')
      expect(component.showSlotDeleteDialog).toBeFalse()
    })
  })

  describe('onAddSlot', () => {
    let mockEvent: any
    const slot: CombinedSlot = {
      id: 'id5',
      name: 'slot-5',
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
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of(wProducts))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: wSlots }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: psProducts }))
      component.workspace = workspace
      component.loadData()
    })

    it('should create a slot ', () => {
      slotServiceSpy.createSlot.and.returnValue(
        of({
          ...slot,
          id: 'id',
          creationDate: 'date',
          creationUser: 'test',
          modificationDate: 'date',
          modificationUser: 'test'
        })
      )
      spyOn(mockEvent, 'stopPropagation')

      component.onAddSlot(mockEvent, slot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.SLOT.MESSAGE.OK' })
      expect(slotServiceSpy.createSlot).toHaveBeenCalledWith({
        createSlotRequest: { workspaceId: component.workspace?.id, name: slot.name }
      })
    })

    it('should display error if slot creation fails', () => {
      const errorResponse = { status: 400, statusText: 'Error on creating a slot' }
      slotServiceSpy.createSlot.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onAddSlot(mockEvent, slot)

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.SLOT.MESSAGE.NOK' })
      expect(console.error).toHaveBeenCalledWith('createSlot', errorResponse)
    })
  })

  describe('onDeleteSlot', () => {
    let mockEvent: any
    const slot: CombinedSlot = {
      id: 'id5',
      name: 'slot-5',
      new: false,
      type: 'WORKSPACE',
      changes: false,
      psSlots: [],
      psComponents: [],
      undeployed: false,
      deprecated: false,
      creationDate: 'date',
      creationUser: 'test',
      modificationDate: 'date',
      modificationUser: 'test'
    }

    beforeEach(() => {
      mockEvent = new Event('click')
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of(wProducts))
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(of({ slots: wSlots }))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: psProducts }))
      component.workspace = workspace
      component.loadData()
    })

    it('should delete a slot ', () => {
      slotServiceSpy.deleteSlotById.and.returnValue(of({}))
      spyOn(mockEvent, 'stopPropagation')

      component.onDeleteSlot(mockEvent, slot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.SLOT.MESSAGE.OK' })
      expect(slotServiceSpy.deleteSlotById).toHaveBeenCalledWith({ id: slot.id })
    })

    it('should display error if slot creation fails', () => {
      const errorResponse = { status: 400, statusText: 'Error on creating a slot' }
      slotServiceSpy.deleteSlotById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onDeleteSlot(mockEvent, slot)

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.SLOT.MESSAGE.NOK' })
      expect(console.error).toHaveBeenCalledWith('deleteSlotById', errorResponse)
    })
  })

  describe('deletion', () => {
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

    it('should call deletion dialog for a slot', () => {
      mockEvent = new Event('click')
      spyOn(mockEvent, 'stopPropagation')

      component.onSlotDelete(mockEvent, mockSlot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(component.changeMode).toBe('DELETE')
      expect(component.showSlotDeleteDialog).toBeTrue()
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
      const errorResponse = { status: 400, statusText: 'Error on check endpoint' }
      workspaceServiceSpy.getUrl.and.returnValue(throwError(() => errorResponse))

      const eu$ = component.getProductEndpointUrl$()

      eu$.subscribe({
        next: (data) => {
          if (data) {
            expect(data).toBeFalse()
          }
          done()
        },
        error: done.fail
      })
    })
  })
})
