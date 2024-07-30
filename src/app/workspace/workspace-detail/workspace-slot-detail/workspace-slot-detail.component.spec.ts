import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { BehaviorSubject, of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import { SlotAPIService } from 'src/app/shared/generated'
import { WorkspaceSlotDetailComponent } from './workspace-slot-detail.component'
import { CombinedSlot, ExtendedComponent } from '../workspace-slots/workspace-slots.component'

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
        HttpClientTestingModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
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

  it('should set German date format', () => {
    mockUserService.lang$.next('de')
    initializeComponent()

    expect(component.dateFormat).toEqual('dd.MM.yyyy HH:mm')
  })

  it('should set English date format', () => {
    mockUserService.lang$.next('en')
    initializeComponent()

    expect(component.dateFormat).toEqual('medium')
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

  describe('OnChanges', () => {
    it('should initialize component state when slotOrg is provided', () => {
      const slotOrg: CombinedSlot = {
        name: 'slot1',
        new: false,
        bucket: 'TARGET',
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
      expect(component.slotName).toBe('slot1')
      expect(component.wComponents).toEqual(slotOrg.psComponents!)
      expect(component.psComponents).toEqual([
        { name: 'compA', productName: 'compA', appId: 'appId', undeployed: false, deprecated: false },
        { name: 'compB', productName: 'compA', appId: 'appId', undeployed: false, deprecated: false }
      ])
    })
  })

  it('should emit detailClosed event with false when onClose is called', () => {
    spyOn(component.detailClosed, 'emit')

    component.onClose()

    expect(component.detailClosed.emit).toHaveBeenCalledWith(false)
  })

  /**
   * UI Events: DETAIL
   */
  it('should call stopPropagation on the event when return is called', () => {
    const mockEvent = jasmine.createSpyObj('event', ['stopPropagation'])

    component.return(mockEvent)

    expect(mockEvent.stopPropagation).toHaveBeenCalled()
  })

  it('should set deregisterItems and displayDeregisterConfirmation when onMoveToSource is called', () => {
    const mockEvent = { items: ['item1', 'item2', 'item3'] }

    component.onMoveToSource(mockEvent)

    expect(component.displayDeregisterConfirmation).toBeTrue()
  })

  describe('onDeregisterCancellation', () => {
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
  })

  it('should update displayDeregisterConfirmation and call onSaveSlot when onDeregisterConfirmation is called', () => {
    component.displayDeregisterConfirmation = true
    spyOn(component, 'onSaveSlot')

    component.onDeregisterConfirmation()

    expect(component.displayDeregisterConfirmation).toBeFalse()
    expect(component.onSaveSlot).toHaveBeenCalled()
  })

  describe('onSaveSlot', () => {
    beforeEach(() => {
      component.slot = {
        name: 'slot1',
        new: false,
        bucket: 'TARGET',
        changes: false,
        psSlots: [],
        psComponents: [{ productName: 'slotComponentProdName', appId: 'slotComponentAppId', name: 'slotComponentName' }]
      }
      component.wComponents = [{ productName: 'mockProdName', appId: 'mockAppId', name: 'mockName' }]
    })

    it('should call updateSlot and handle success response', () => {
      const slotResponse = {
        modificationCount: 1,
        modificationDate: 'date',
        components: [{ productName: 'slotProdName', appId: 'mockAppId', name: 'mockName' }]
      }
      slotServiceSpy.updateSlot.and.returnValue(of(slotResponse))
      component.wComponents = [{ productName: 'mockProdName', appId: 'mockAppId', name: 'mockName' }]
      spyOn(component.changed, 'emit')

      component.onSaveSlot()

      expect(slotServiceSpy.updateSlot).toHaveBeenCalled()
      if (component.slot) {
        expect(component.slot.modificationCount).toBe(slotResponse.modificationCount)
        expect(component.slot.modificationDate).toBe(slotResponse.modificationDate)
        expect(component.slot.components).toEqual(slotResponse.components)
      }
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.SLOT_OK' })
      expect(component.changed.emit).toHaveBeenCalledWith(true)
    })

    it('should call updateSlot and handle error response', () => {
      const err = { error: 'err' }
      slotServiceSpy.updateSlot.and.returnValue(throwError(() => err))
      spyOn(component.changed, 'emit')
      spyOn(console, 'error')

      component.onSaveSlot()

      expect(slotServiceSpy.updateSlot).toHaveBeenCalled()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.SLOT_NOK' })
      expect(console.error).toHaveBeenCalledWith(err.error)
    })
  })

  describe('onDeleteSlot', () => {
    beforeEach(() => {
      component.slot = {
        name: 'slot1',
        id: '1',
        new: false,
        bucket: 'TARGET',
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
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.SLOT_OK' })
      expect(component.detailClosed.emit).toHaveBeenCalledWith(true)
    })

    it('should call deleteSlotById and handle error response', () => {
      const mockError = { error: 'mockError' }
      slotServiceSpy.deleteSlotById.and.returnValue(throwError(() => mockError))

      spyOn(component.detailClosed, 'emit')
      spyOn(console, 'error')

      component.onDeleteSlot()

      expect(slotServiceSpy.deleteSlotById).toHaveBeenCalledWith({ id: '1' })
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.SLOT_NOK' })
      expect(console.error).toHaveBeenCalledWith(mockError.error)
      expect(component.detailClosed.emit).not.toHaveBeenCalled()
    })
  })
})
