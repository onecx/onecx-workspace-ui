import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, fakeAsync, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { BehaviorSubject, of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import { Slot, SlotAPIService } from 'src/app/shared/generated'
import { CombinedSlot, ExtendedComponent } from '../workspace-slots/workspace-slots.component'
import { WorkspaceSlotDetailComponent } from './workspace-slot-detail.component'

describe('WorkspaceSlotDetailComponent', () => {
  let component: WorkspaceSlotDetailComponent
  let fixture: ComponentFixture<WorkspaceSlotDetailComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const slotServiceSpy = {
    updateSlot: jasmine.createSpy('updateSlot').and.returnValue(of({})),
    deleteSlotById: jasmine.createSpy('deleteSlotById').and.returnValue(of({}))
  }

  const mockUserService = jasmine.createSpyObj('UserService', ['hasPermission'])
  mockUserService.hasPermission.and.callFake((permission: string) => {
    return ['WORKSPACE_SLOT#EDIT'].includes(permission)
  })
  mockUserService.lang$ = new BehaviorSubject('de')

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceSlotDetailComponent],
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
        { provide: SlotAPIService, useValue: slotServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    slotServiceSpy.updateSlot.calls.reset()
    slotServiceSpy.deleteSlotById.calls.reset()
  }))

  function initializeComponent(): void {
    fixture = TestBed.createComponent(WorkspaceSlotDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(() => {
    initializeComponent()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('OnChanges', () => {
    it('should initialize component state when slotOrg is provided', () => {
      component.displayDetailDialog = true
      const slotOrg: CombinedSlot = {
        name: 'slot1',
        new: false,
        type: 'WORKSPACE',
        changes: false,
        undeployed: false,
        deprecated: false,
        psSlots: [],
        psComponents: [
          {
            productName: 'productA',
            appId: 'appId1',
            name: 'compA',
            undeployed: false,
            deprecated: false
          }
        ]
      }
      component.slotOrg = slotOrg
      component.psComponentsOrg = [
        { name: 'compA', productName: 'productA', appId: 'appId1', undeployed: false, deprecated: false },
        { name: 'compB', productName: 'productA', appId: 'appId1', undeployed: false, deprecated: false },
        { name: 'compA', productName: 'productB', appId: 'appId2', undeployed: false, deprecated: false },
        { name: 'compB', productName: 'productB', appId: 'appId3', undeployed: false, deprecated: false }
      ]
      component.wProductNames = ['productA', 'productB']

      component.ngOnChanges()

      expect(component.slot).toEqual(slotOrg)
      expect(component.wComponents).toEqual(slotOrg.psComponents)
      // this is the reduced set of components in alphabetical order (minus slotOrg)
      expect(component.psComponents).toEqual([
        { name: 'compA', productName: 'productB', appId: 'appId2', undeployed: false, deprecated: false },
        { name: 'compB', productName: 'productA', appId: 'appId1', undeployed: false, deprecated: false },
        { name: 'compB', productName: 'productB', appId: 'appId3', undeployed: false, deprecated: false }
      ])
    })
  })

  describe('Closing', () => {
    beforeEach(() => {
      const slotOrg: CombinedSlot = {
        modificationCount: 0,
        name: 'slot1',
        new: false,
        type: 'WORKSPACE',
        changes: false,
        undeployed: false,
        deprecated: false,
        psSlots: [],
        psComponents: [
          {
            productName: 'slotComponentProdName',
            appId: 'slotComponentAppId',
            name: 'slotComponentName',
            undeployed: false,
            deprecated: false
          }
        ]
      }
      component.slotOrg = slotOrg
    })

    it('should always emit detailClosed event when dialog is closed', () => {
      spyOn(component.detailClosed, 'emit')

      component.onClose()

      expect(component.detailClosed.emit).toHaveBeenCalled()
    })

    it('should emit detailClosed event with false if there is no change ', () => {
      const slot: CombinedSlot = {
        modificationCount: 1,
        name: 'slot1',
        new: false,
        type: 'WORKSPACE',
        changes: false,
        undeployed: false,
        deprecated: false,
        psSlots: [],
        psComponents: [
          {
            productName: 'slotComponentProdName',
            appId: 'slotComponentAppId',
            name: 'slotComponentName',
            undeployed: false,
            deprecated: false
          }
        ]
      }
      component.slot = slot

      spyOn(component.detailClosed, 'emit')

      component.onClose()

      expect(component.detailClosed.emit).toHaveBeenCalledWith(true)
    })
  })

  /**
   * UI Events: DETAIL
   */
  describe('Extra UI events', () => {
    it('should return value from event object', () => {
      const event = { target: { value: 'test value' } }

      expect(component.getFilterValue(event)).toEqual('test value')
    })

    it('should call stopPropagation on the event when return is called', () => {
      const mockEvent = jasmine.createSpyObj('event', ['stopPropagation'])

      component.return(mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })

    it('should display target controls depends on selected items', () => {
      const ev = { items: [{}] }

      component.onTargetSelect(ev)

      expect(component.showTargetControls).toBeTrue()
    })
  })

  describe('Deregistration', () => {
    it('should set deregisterItems and displayDeregisterConfirmation when onMoveToSource is called', () => {
      const mockEvent = { items: ['item1', 'item2', 'item3'] }

      component.onDeregister(mockEvent)

      expect(component.displayDeregisterConfirmation).toBeTrue()
    })

    it('should not change state if deregisterItems is empty', () => {
      component['deregisterItems'] = []
      component.displayDeregisterConfirmation = true

      component.onDeregisterCancellation()

      expect(component.displayDeregisterConfirmation).toBeTrue()
      expect(component['deregisterItems']).toEqual([])
    })

    it('should update state correctly when onDeregisterCancellation is called', () => {
      component['deregisterItems'] = [
        {
          productName: 'product1',
          appId: 'app1',
          name: 'comp1',
          undeployed: false,
          deprecated: false
        }
      ]
      component.displayDeregisterConfirmation = true
      component.psComponents = [
        {
          productName: 'product1',
          appId: 'app1',
          name: 'comp1',
          undeployed: false,
          deprecated: false
        },
        {
          productName: 'product2',
          appId: 'app2',
          name: 'comp2',
          undeployed: false,
          deprecated: false
        }
      ]

      component.onDeregisterCancellation()

      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(component.psComponents).toEqual([
        {
          productName: 'product2',
          appId: 'app2',
          name: 'comp2',
          undeployed: false,
          deprecated: false
        }
      ])
      expect(component['deregisterItems']).toEqual([])
    })

    it('should save slot on deregister confirmation', () => {
      component.displayDeregisterConfirmation = true
      spyOn(component, 'onSaveSlot')

      component.onDeregisterConfirmation()

      expect(component.onSaveSlot).toHaveBeenCalled()
      expect(component.displayDeregisterConfirmation).toBeFalse()
    })
  })

  describe('Saving', () => {
    beforeEach(() => {
      component.slot = {
        name: 'slot1',
        new: false,
        type: 'WORKSPACE',
        changes: false,
        undeployed: false,
        deprecated: false,
        psSlots: [],
        psComponents: [
          {
            productName: 'product1',
            appId: 'app1',
            name: 'comp1',
            undeployed: false,
            deprecated: false
          }
        ]
      }
      component.wComponents = [
        { productName: 'product1', appId: 'app1', name: 'comp1', undeployed: false, deprecated: false }
      ]
    })

    it('should save slot and handle success response', () => {
      const slotResponse: Slot = {
        modificationCount: 1,
        modificationDate: 'date',
        components: [{ productName: 'product1', appId: 'app1', name: 'comp1' }]
      }
      slotServiceSpy.updateSlot.and.returnValue(of(slotResponse))

      component.onSaveSlot(false)

      expect(slotServiceSpy.updateSlot).toHaveBeenCalled()
      if (component.slot) {
        expect(component.slot.modificationCount).toBe(slotResponse.modificationCount)
        expect(component.slot.modificationDate).toBe(slotResponse.modificationDate)
        expect(component.slot.components).toEqual(slotResponse.components)
      }
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.SLOT_OK' })
    })

    it('should save slot and handle error response', () => {
      const errorResponse = { status: 400, statusText: 'Error on import menu items' }
      slotServiceSpy.updateSlot.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onSaveSlot(false)

      expect(slotServiceSpy.updateSlot).toHaveBeenCalled()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.SLOT_NOK' })
      expect(console.error).toHaveBeenCalledWith('updateSlot', errorResponse)
    })

    it('should save slot on deregister confirmation', fakeAsync(() => {
      component.displayDeregisterConfirmation = true
      component['deregisterItems'] = [
        {
          productName: 'product1',
          appId: 'app1',
          name: 'comp1',
          undeployed: false,
          deprecated: false
        }
      ]
      component.displayDeregisterConfirmation = true
      component.psComponents = [
        {
          productName: 'product1',
          appId: 'app1',
          name: 'comp1',
          undeployed: false,
          deprecated: false
        },
        {
          productName: 'product2',
          appId: 'app1',
          name: 'comp1',
          undeployed: false,
          deprecated: false
        }
      ]
      component.wComponents = [
        { name: 'comp2', productName: 'product1', appId: 'appId1', undeployed: false, deprecated: false },
        { name: 'comp2', productName: 'product2', appId: 'appId1', undeployed: false, deprecated: false }
      ]
      const slotResponse: Slot = {
        modificationCount: 1,
        modificationDate: 'date',
        components: [{ productName: 'product1', appId: 'app1', name: 'comp1' }]
      }
      slotServiceSpy.updateSlot.and.returnValue(of(slotResponse))

      component.onSaveSlot(false)

      expect(component['deregisterItems']).toEqual([])
    }))
  })

  describe('Reorder', () => {
    it('should ignore saving if slot has no or one component', () => {
      component.slot = {
        name: 'slot1',
        new: false,
        type: 'WORKSPACE',
        changes: false,
        undeployed: false,
        deprecated: false,
        psSlots: [],
        components: [{ productName: 'Product', appId: 'AppId', name: 'Component Name' }],
        psComponents: [
          { productName: 'Product', appId: 'AppId', name: 'Component Name', undeployed: false, deprecated: false }
        ]
      }
      slotServiceSpy.updateSlot.and.returnValue(of({}))

      component.onSaveSlot(true)

      expect(slotServiceSpy.updateSlot).not.toHaveBeenCalled()
    })

    it('should ignore saving if slot has no or one component', () => {
      component.slot = {
        name: 'slot1',
        new: false,
        type: 'WORKSPACE',
        changes: false,
        undeployed: false,
        deprecated: false,
        psSlots: [],
        components: [
          { productName: 'Product', appId: 'AppId', name: 'Component Name 1' },
          { productName: 'Product', appId: 'AppId', name: 'Component Name 2' }
        ],
        psComponents: [
          { productName: 'Product', appId: 'AppId', name: 'Component Name', undeployed: false, deprecated: false }
        ]
      }
      slotServiceSpy.updateSlot.and.returnValue(of({}))

      component.onSaveSlot(true)

      expect(slotServiceSpy.updateSlot).toHaveBeenCalled()
    })
  })

  describe('Deletion', () => {
    beforeEach(() => {
      component.slot = {
        name: 'slot1',
        id: '1',
        new: false,
        type: 'WORKSPACE',
        changes: false,
        undeployed: false,
        deprecated: false,
        psSlots: [],
        psComponents: [
          {
            productName: 'slotComponentProdName',
            appId: 'slotComponentAppId',
            name: 'slotComponentName',
            undeployed: false,
            deprecated: false
          }
        ]
      }
      component.wComponents = [
        { productName: 'mockProdName', appId: 'mockAppId', name: 'mockName', undeployed: false, deprecated: false }
      ]
    })

    it('should call deleteSlotById and handle success response', () => {
      slotServiceSpy.deleteSlotById.and.returnValue(of({}))
      spyOn(component.detailClosed, 'emit')

      component.onDeleteSlot()

      expect(slotServiceSpy.deleteSlotById).toHaveBeenCalledWith({ id: '1' })
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.SLOT.MESSAGE_OK' })
      expect(component.detailClosed.emit).toHaveBeenCalledWith(true)
    })

    it('should call deleteSlotById and handle error response', () => {
      const errorResponse = { status: 400, statusText: 'Error on deleting a slot' }
      slotServiceSpy.deleteSlotById.and.returnValue(throwError(() => errorResponse))

      spyOn(component.detailClosed, 'emit')
      spyOn(console, 'error')

      component.onDeleteSlot()

      expect(slotServiceSpy.deleteSlotById).toHaveBeenCalledWith({ id: '1' })
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.SLOT.MESSAGE_NOK' })
      expect(console.error).toHaveBeenCalledWith('deleteSlotById', errorResponse)
      expect(component.detailClosed.emit).not.toHaveBeenCalled()
    })
  })

  /**
   * EXTRAS
   */
  describe('language', () => {
    it('should set German date format', () => {
      mockUserService.lang$.next('de')
      initializeComponent()

      expect(component.dateFormat).toEqual('dd.MM.yyyy HH:mm:ss')
    })

    it('should set English date format', () => {
      mockUserService.lang$.next('en')
      initializeComponent()

      expect(component.dateFormat).toEqual('M/d/yy, hh:mm:ss a')
    })
  })

  describe('sort components', () => {
    it('should sort components by name correctly', () => {
      const compA: ExtendedComponent = {
        name: 'compA',
        productName: 'compA',
        appId: 'appId',
        undeployed: false,
        deprecated: false
      }
      const compB: ExtendedComponent = {
        name: 'compB',
        productName: 'compB',
        appId: 'appId',
        undeployed: false,
        deprecated: false
      }
      const compC: ExtendedComponent = {
        name: 'compC',
        productName: 'compC',
        appId: 'appId',
        undeployed: false,
        deprecated: false
      }
      const components: ExtendedComponent[] = [compB, compA, compC]

      components.sort((a, b) => component.sortComponents(a, b))

      expect(components).toEqual([compA, compB, compC])
    })

    it('should handle empty name values', () => {
      const compA: ExtendedComponent = {
        name: '',
        productName: 'compA',
        appId: 'appId',
        undeployed: false,
        deprecated: false
      }
      const compB: ExtendedComponent = {
        name: '',
        productName: 'compB',
        appId: 'appId',
        undeployed: false,
        deprecated: false
      }
      const compC: ExtendedComponent = {
        name: 'compC',
        productName: 'compC',
        appId: 'appId',
        undeployed: false,
        deprecated: false
      }
      const components: ExtendedComponent[] = [compB, compC, compA]

      components.sort((a, b) => component.sortComponents(a, b))

      expect(components).toEqual([compA, compB, compC])
    })
  })
})
