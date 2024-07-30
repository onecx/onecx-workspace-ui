import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import {
  ProductAPIService,
  Workspace,
  Slot,
  SlotAPIService,
  WorkspaceProductAPIService,
  Product,
  ProductStoreItem,
  MicrofrontendPS,
  MicrofrontendType
} from 'src/app/shared/generated'
import { CombinedSlot, ExtendedComponent, WorkspaceSlotsComponent } from './workspace-slots.component'

const workspace: Workspace = {
  id: 'id',
  displayName: 'displayName',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url'
}

const mfePs: MicrofrontendPS = {
  appName: 'mfePsAppName',
  type: MicrofrontendType.Component,
  exposedModule: 'slotComponentName',
  appId: 'appId'
}

describe('WorkspaceSlotsComponent', () => {
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
        HttpClientTestingModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceProductAPIService, useValue: wProductServiceSpy },
        { provide: ProductAPIService, useValue: productServiceSpy },
        { provide: SlotAPIService, useValue: slotServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    wProductServiceSpy.getProductsByWorkspaceId.calls.reset()
    slotServiceSpy.getSlotsForWorkspace.calls.reset()
    slotServiceSpy.createSlot.calls.reset()
    productServiceSpy.searchAvailableProducts.calls.reset()
  }))

  function initializeComponent(): void {
    fixture = TestBed.createComponent(WorkspaceSlotsComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(() => {
    initializeComponent()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

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

  describe('loadData', () => {
    beforeEach(() => {
      component.wSlots$ = of([])
      component.wProducts$ = of([])
      component.psSlots$ = of([])
    })

    it('should load data', () => {
      spyOn(component as any, 'declareWorkspaceProducts').and.callFake(() => {})
      spyOn(component as any, 'declareWorkspaceSlots').and.callFake(() => {})
      spyOn(component as any, 'declarePsSlots').and.callFake(() => {})

      component.loadData()

      expect(component.loading).toBe(true)
      expect(component.exceptionKey).toBeUndefined()
      expect(component['declareWorkspaceProducts']).toHaveBeenCalled()
      expect(component['declareWorkspaceSlots']).toHaveBeenCalled()
      expect(component['declarePsSlots']).toHaveBeenCalled()
    })

    it('should get ws product names', () => {
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(
        of([{ productName: 'wsProd1' }, { productName: 'wsProd2' }] as Product[])
      )
      spyOn(component as any, 'declareWorkspaceSlots').and.callFake(() => {})
      spyOn(component as any, 'declarePsSlots').and.callFake(() => {})

      component.loadData()

      expect(component.wProductNames).toEqual(['wsProd1', 'wsProd2'])
    })

    it('should display error when product names cannot be loaded', () => {
      const err = { status: '404' }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(throwError(() => err))
      spyOn(component as any, 'declareWorkspaceSlots').and.callFake(() => {})
      spyOn(component as any, 'declarePsSlots').and.callFake(() => {})

      component.loadData()

      expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS')
    })

    it('should get ws slots', () => {
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(
        of({ slots: [{ name: 'slot1' }, { name: 'slot2' }] as Slot[] })
      )
      spyOn(component as any, 'declareWorkspaceProducts').and.callFake(() => {})
      spyOn(component as any, 'declarePsSlots').and.callFake(() => {})

      component.loadData()

      expect(component.wSlotsIntern).toEqual([
        { name: 'slot1', new: false, bucket: 'TARGET', changes: false, psSlots: [], psComponents: [] },
        { name: 'slot2', new: false, bucket: 'TARGET', changes: false, psSlots: [], psComponents: [] }
      ] as CombinedSlot[])
    })

    it('should display error when ws slots cannot be loaded', () => {
      const err = { status: '404' }
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(throwError(() => err))
      spyOn(component as any, 'declareWorkspaceProducts').and.callFake(() => {})
      spyOn(component as any, 'declarePsSlots').and.callFake(() => {})

      component.loadData()

      expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_' + err.status + '.SLOTS')
    })

    it('should get ps slots', () => {
      productServiceSpy.searchAvailableProducts.and.returnValue(
        of({
          stream: [
            { productName: 'psItem1', microfrontends: [mfePs], slots: [{ name: 'slotPsName' }] },
            { productName: 'psItem2' }
          ] as ProductStoreItem[]
        })
      )
      spyOn(component as any, 'declareWorkspaceProducts').and.callFake(() => {})
      spyOn(component as any, 'declareWorkspaceSlots').and.callFake(() => {})
      component.psSlots = [
        {
          productName: 'product',
          name: 'slotPsName',
          new: false,
          bucket: 'SOURCE',
          changes: false,
          psSlots: [],
          psComponents: [],
          components: []
        }
      ]
      component.wSlotsIntern = [
        {
          productName: 'product',
          name: 'slotPsName',
          new: false,
          bucket: 'TARGET',
          changes: false,
          psSlots: [],
          psComponents: [],
          components: [{ productName: 'slotComponentProdName', appId: 'slotComponentAppId', name: 'slotComponentName' }]
        },
        { name: 'slot2', new: false, bucket: 'TARGET', changes: false, psSlots: [], psComponents: [] }
      ]
      component.wProductNames = ['psItem1', 'wsProd2', 'product']

      component.loadData()

      expect(component.psComponents).toEqual([
        {
          bucket: 'SOURCE',
          productName: 'psItem1',
          appId: 'appId',
          name: 'slotComponentName',
          undeployed: false,
          deprecated: false
        }
      ] as unknown as ExtendedComponent[])
    })

    it('should display error when ps slots cannot be loaded', () => {
      const err = { status: '404' }
      productServiceSpy.searchAvailableProducts.and.returnValue(throwError(() => err))
      spyOn(component as any, 'declareWorkspaceProducts').and.callFake(() => {})
      spyOn(component as any, 'declareWorkspaceSlots').and.callFake(() => {})

      component.loadData()

      expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_' + err.status + '.SLOTS')
    })
  })

  /**
   * UI Events
   */
  describe('onFilterChange', () => {
    it('should set filterBy to name,type when filter is empty', () => {
      component.onFilterChange('')

      expect(component.filterBy).toEqual('name')
    })

    it('should call filter method with "contains" when filter has a value', () => {
      component.dv = jasmine.createSpyObj('DataView', ['filter'])

      component.onFilterChange('testFilter')
    })
  })

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
        bucket: 'TARGET',
        changes: false,
        psSlots: []
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
        bucket: 'TARGET',
        changes: false,
        psSlots: []
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
        bucket: 'TARGET',
        changes: false,
        psSlots: []
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

    it('should loadData if detail has changed', () => {
      component.onSlotDetailChanged(true) // changed data

      expect(component.loadData).toHaveBeenCalled()
    })

    it('should not loadDate if detail has changed', () => {
      component.onSlotDetailChanged(false)

      expect(component.loadData).not.toHaveBeenCalled()
    })
  })

  describe('onAddSlot', () => {
    let mockEvent: any
    const mockSlot: CombinedSlot = {
      id: '123',
      new: true,
      bucket: 'TARGET',
      changes: false,
      psSlots: []
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

    it('should display error if call fails', () => {
      slotServiceSpy.createSlot.and.returnValue(throwError('Error'))

      component.onAddSlot(mockEvent, mockSlot)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(slotServiceSpy.createSlot).toHaveBeenCalledWith({
        createSlotRequest: { workspaceId: component.workspace?.id, name: mockSlot.name }
      })
      expect(component.loadData).not.toHaveBeenCalled()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EXPORT.MESSAGE.NOK' })
    })
  })

  describe('onDeleteSlot', () => {
    let mockEvent: any
    const mockSlot: CombinedSlot = {
      id: '123',
      new: true,
      bucket: 'TARGET',
      changes: false,
      psSlots: []
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
})
