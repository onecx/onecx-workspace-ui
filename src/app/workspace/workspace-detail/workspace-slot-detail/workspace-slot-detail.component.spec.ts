import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { BehaviorSubject, of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import { SlotAPIService } from 'src/app/shared/generated'
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
      const slotOrg: CombinedSlot = {
        name: 'slot1',
        new: false,
        changes: false,
        psSlots: [],
        psComponents: [{ productName: 'slotComponentProdName', appId: 'slotComponentAppId', name: 'slotComponentName' }]
      }
      component.slotOrg = slotOrg
      component.psComponentsOrg = [
        { name: 'compA', productName: 'compA', appId: 'appId', undeployed: false, deprecated: false },
        { name: 'compB', productName: 'compA', appId: 'appId', undeployed: false, deprecated: false }
      ]
      component.wProductNames = ['compA']

      component.ngOnChanges()

      expect(component.slot).toEqual(slotOrg)
      expect(component.wComponents).toEqual(slotOrg.psComponents)
      expect(component.psComponents).toEqual([
        { name: 'compA', productName: 'compA', appId: 'appId', undeployed: false, deprecated: false },
        { name: 'compB', productName: 'compA', appId: 'appId', undeployed: false, deprecated: false }
      ])
    })
  })

  describe('Closing', () => {
    it('should NOT emit detailClosed event when dialog is simply closed', () => {
      spyOn(component.detailClosed, 'emit')

      component.onClose()

      expect(component.detailClosed.emit).not.toHaveBeenCalled()
    })

    it('should emit detailClosed event with false if there is no change ', () => {
      const slotOrg: CombinedSlot = {
        modificationCount: 0,
        name: 'slot1',
        new: false,
        changes: false,
        psSlots: [],
        psComponents: [{ productName: 'slotComponentProdName', appId: 'slotComponentAppId', name: 'slotComponentName' }]
      }
      component.slotOrg = slotOrg
      const slot: CombinedSlot = {
        modificationCount: 1,
        name: 'slot1',
        new: false,
        changes: false,
        psSlots: [],
        psComponents: [{ productName: 'slotComponentProdName', appId: 'slotComponentAppId', name: 'slotComponentName' }]
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
        { productName: 'slotComponentProdName', appId: 'slotComponentAppId', name: 'slotComponentName' }
      ]
      component.displayDeregisterConfirmation = true
      component.psComponents = [
        { productName: 'slotComponentProdName', appId: 'slotComponentAppId', name: 'slotComponentName' },
        { productName: 'slotComponentProdName2', appId: 'slotComponentAppId2', name: 'slotComponentName2' }
      ]

      component.onDeregisterCancellation()

      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(component.psComponents).toEqual([
        { productName: 'slotComponentProdName2', appId: 'slotComponentAppId2', name: 'slotComponentName2' }
      ])
      expect(component['deregisterItems']).toEqual([])
    })

    it('should update displayDeregisterConfirmation and call onSaveSlot when onDeregisterConfirmation is called', () => {
      component.displayDeregisterConfirmation = true
      spyOn(component, 'onSaveSlot')

      component.onDeregisterConfirmation()

      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(component.onSaveSlot).toHaveBeenCalled()
    })
  })

  describe('Saving', () => {
    beforeEach(() => {
      component.slot = {
        name: 'slot1',
        new: false,
        changes: false,
        psSlots: [],
        psComponents: [{ productName: 'slotComponentProdName', appId: 'slotComponentAppId', name: 'slotComponentName' }]
      }
      component.wComponents = [{ productName: 'mockProdName', appId: 'mockAppId', name: 'mockName' }]
    })

    it('should save slot and handle success response', () => {
      const slotResponse = {
        modificationCount: 1,
        modificationDate: 'date',
        components: [{ productName: 'slotProdName', appId: 'mockAppId', name: 'mockName' }]
      }
      slotServiceSpy.updateSlot.and.returnValue(of(slotResponse))
      component.wComponents = [{ productName: 'mockProdName', appId: 'mockAppId', name: 'mockName' }]

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
  })

  describe('Reorder', () => {
    it('should ignore saving if slot has no or one component', () => {
      component.slot = {
        name: 'slot1',
        new: false,
        changes: false,
        psSlots: [],
        components: [{ productName: 'Product', appId: 'AppId', name: 'Component Name' }],
        psComponents: [{ productName: 'Product', appId: 'AppId', name: 'Component Name' }]
      }
      slotServiceSpy.updateSlot.and.returnValue(of({}))

      component.onSaveSlot(true)

      expect(slotServiceSpy.updateSlot).not.toHaveBeenCalled()
    })

    it('should ignore saving if slot has no or one component', () => {
      component.slot = {
        name: 'slot1',
        new: false,
        changes: false,
        psSlots: [],
        components: [
          { productName: 'Product', appId: 'AppId', name: 'Component Name 1' },
          { productName: 'Product', appId: 'AppId', name: 'Component Name 2' }
        ],
        psComponents: [{ productName: 'Product', appId: 'AppId', name: 'Component Name' }]
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
        changes: false,
        psSlots: [],
        psComponents: [{ productName: 'slotComponentProdName', appId: 'slotComponentAppId', name: 'slotComponentName' }]
      }
      component.wComponents = [{ productName: 'mockProdName', appId: 'mockAppId', name: 'mockName' }]
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

  describe('sortComponentsByName', () => {
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

      components.sort((a, b) => component.sortComponentsByName(a, b))

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
      const components: ExtendedComponent[] = [compB, compA, compC]

      components.sort((a, b) => component.sortComponentsByName(a, b))

      expect(components).toEqual([compB, compA, compC])
    })
  })
})
