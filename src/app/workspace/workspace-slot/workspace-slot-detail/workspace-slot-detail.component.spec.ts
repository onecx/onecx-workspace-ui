import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { BehaviorSubject, of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import { Slot, SlotAPIService } from 'src/app/shared/generated'
import { ExtendedSlot, ExtendedComponent, PSSlot } from '../workspace-slots/workspace-slots.component'
import { WorkspaceSlotDetailComponent } from './workspace-slot-detail.component'

describe('WorkspaceSlotDetailComponent', () => {
  let component: WorkspaceSlotDetailComponent
  let fixture: ComponentFixture<WorkspaceSlotDetailComponent>

  function initializeComponent(): void {
    fixture = TestBed.createComponent(WorkspaceSlotDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const slotServiceSpy = { addOrUpdateSlot: jasmine.createSpy('addOrUpdateSlot').and.returnValue(of({})) }
  const mockUserService = {
    lang$: new BehaviorSubject<string>('de'),
    getPermission: jasmine.createSpy('getPermission').and.returnValue(Promise.resolve(true)),
    hasPermission: jasmine.createSpy('hasPermission').and.callFake((permission) => {
      return ['WORKSPACE_SLOT#EDIT'].includes(permission)
    })
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        WorkspaceSlotDetailComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: UserService, useValue: mockUserService }
      ]
    })
      .overrideComponent(WorkspaceSlotDetailComponent, {
        add: {
          providers: [
            { provide: PortalMessageService, useValue: msgServiceSpy },
            { provide: SlotAPIService, useValue: slotServiceSpy }
          ]
        }
      })
      .compileComponents()

    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    slotServiceSpy.addOrUpdateSlot.calls.reset()
  }))

  beforeEach(() => {
    initializeComponent()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should log error when checking hasEditPermission rejects', fakeAsync(() => {
    spyOn(console, 'error')
    mockUserService.hasPermission.and.returnValue(Promise.reject(new Error('perm failed')))

    initializeComponent()
    tick()

    expect(console.error).toHaveBeenCalled()

    // restore neutral behaviour for subsequent tests
    mockUserService.hasPermission.and.callFake((permission) => ['WORKSPACE_SLOT#EDIT'].includes(permission))
  }))

  describe('OnChanges', () => {
    it('should initialize component state when slot is provided', () => {
      component.displayDialog = true
      // products which using the slot
      const psSlots: PSSlot[] = [
        { name: 'slot1', pName: 'productB', pDisplayName: 'Product B' },
        { name: 'slot1', pName: 'productC', pDisplayName: 'Product C' }
      ]
      const slot: ExtendedSlot = {
        name: 'slot1',
        productNames: ['productB', 'productC'],
        type: ['WORKSPACE'],
        changes: false,
        undeployed: false,
        deprecated: false,
        psSlots: psSlots,
        psComponents: [
          {
            name: 'compB',
            appId: 'appId1',
            productName: 'productB',
            changes: false,
            exists: true,
            undeployed: false,
            deprecated: false
          }
        ]
      }
      component.slot = slot
      component.psComponentsOrg = [
        {
          name: 'compA',
          appId: 'appId1',
          productName: 'productA',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        },
        {
          name: 'compB',
          appId: 'appId1',
          productName: 'productA',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        },
        {
          name: 'compA',
          appId: 'appId2',
          productName: 'productB',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        },
        {
          name: 'compB',
          appId: 'appId3',
          productName: 'productB',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        }
      ]
      component.wProductNames = ['productA', 'productB', 'productC']

      component.ngOnChanges()

      expect(component.slot).toEqual(slot)
      expect(component.wComponentsOrg).toEqual(slot.psComponents)
    })

    it('should initialize component state when slot is provided, but slot is a lost slot', () => {
      component.displayDialog = true
      // products which using the slot
      const psSlots: PSSlot[] = [
        {
          name: 'slot1',
          pName: 'productB',
          pDisplayName: 'Product B'
        }
      ]
      // original product store data of the assigned components
      const psComponentsOrg: ExtendedComponent[] = [
        {
          name: 'compA',
          appId: 'appId1',
          productName: 'productA',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        }
      ]
      const slot: ExtendedSlot = {
        name: 'slot1',
        productNames: [], // slot is a lost slot if productNames is empty
        type: ['WORKSPACE'],
        changes: false,
        undeployed: false,
        deprecated: false,
        psSlots: psSlots,
        psComponents: psComponentsOrg
      }
      component.slot = slot
      component.psComponentsOrg = [
        {
          name: 'compA',
          appId: 'appId1',
          productName: 'productA',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        },
        {
          name: 'compB',
          appId: 'appId1',
          productName: 'productA',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        },
        {
          name: 'compA',
          appId: 'appId2',
          productName: 'productB',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        },
        {
          name: 'compB',
          appId: 'appId3',
          productName: 'productB',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        }
      ]
      component.wProductNames = ['productA', 'productB', 'productC']

      component.ngOnChanges()

      expect(component.slot).toEqual(slot)
      expect(component.wComponentsOrg).toEqual(slot.psComponents)
      // this is the reduced set of components in alphabetical order (minus slot)
      expect(component.psComponents).toEqual([
        {
          name: 'compA',
          productName: 'productB',
          appId: 'appId2',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        },
        {
          name: 'compB',
          productName: 'productA',
          appId: 'appId1',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        },
        {
          name: 'compB',
          productName: 'productB',
          appId: 'appId3',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        }
      ])
    })
  })

  describe('Closing', () => {
    const slot: ExtendedSlot = {
      modificationCount: 0,
      name: 'slot1',
      productNames: ['productA'],
      type: ['WORKSPACE'],
      changes: false,
      undeployed: false,
      deprecated: false,
      psSlots: [],
      psComponents: [
        {
          productName: 'slotComponentProdName',
          appId: 'slotComponentAppId',
          name: 'slotComponentName',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        }
      ]
    }
    beforeEach(() => {
      component.slot = slot
      component.workspace_id = 'workspace1'
      component.displayDialog = true
      component.ngOnChanges()
    })

    it('should emit detailClosed event with false if there is no change ', () => {
      component.slot = undefined
      spyOn(component.detailClosed, 'emit')

      component.onClose()

      expect(component.detailClosed.emit).not.toHaveBeenCalled()
    })

    it('should emit detailClosed event with true if there is a change ', () => {
      const slot2: ExtendedSlot = {
        ...slot,
        modificationCount: 1 // changed
      }
      component.slot = slot2
      spyOn(component.detailClosed, 'emit')

      component.onClose()

      expect(component.detailClosed.emit).toHaveBeenCalledWith(true)
    })
  })

  /**
   * UI Events: DETAIL
   */
  describe('Filtering', () => {
    const createComponent = (name: string, productName: string): ExtendedComponent => ({
      name,
      appId: 'appId',
      productName,
      changes: false,
      exists: true,
      undeployed: false,
      deprecated: false
    })
    const unregistered = [createComponent('Alpha', 'productA'), createComponent('Beta', 'productA')]
    const registered = [createComponent('Gamma', 'productB'), createComponent('Delta', 'productB')]

    beforeEach(() => {
      component.psComponents = unregistered
      component.wComponentsOrg = registered
    })

    it('should set filter values to empty string when slot is provided', () => {
      component.displayDialog = true
      component.slot = {
        name: 'slot1',
        productNames: ['productB'],
        type: ['WORKSPACE'],
        changes: false,
        undeployed: false,
        deprecated: false,
        psSlots: [],
        psComponents: [createComponent('compB', 'productB')]
      }
      component.psComponentsOrg = [createComponent('compA', 'productB'), createComponent('compB', 'productB')]
      component.wProductNames = ['productB']

      component.ngOnChanges()

      expect(component.sourceFilterValue).toBeUndefined()
      expect(component.targetFilterValue).toBeUndefined()
    })

    it('should initialize filtered lists with all components when slot is provided', () => {
      component.displayDialog = true
      component.slot = {
        name: 'slot1',
        productNames: ['productB'],
        type: ['WORKSPACE'],
        changes: false,
        undeployed: false,
        deprecated: false,
        psSlots: [],
        psComponents: [createComponent('compB', 'productB')]
      }
      component.psComponentsOrg = [createComponent('compA', 'productB'), createComponent('compB', 'productB')]
      component.wProductNames = ['productB']

      component.ngOnChanges()

      expect(component.filteredWComponents).toEqual([createComponent('compB', 'productB')])
      expect(component.filteredPsComponents).toEqual([createComponent('compA', 'productB')])
    })

    it('should filter unregistered components by name when source value is given', () => {
      component.filterComponents('SOURCE', 'alp')

      expect(component.filteredPsComponents).toEqual([unregistered[0]])
    })

    it('should not touch registered components when source value is given', () => {
      component.filteredWComponents = []

      component.filterComponents('SOURCE', 'alp')

      expect(component.filteredWComponents).toEqual([])
    })

    it('should filter registered components by name when target value is given', () => {
      component.filterComponents('TARGET', 'DELTA')

      expect(component.filteredWComponents).toEqual([registered[1]])
    })

    it('should not touch unregistered components when target value is given', () => {
      component.filteredPsComponents = []

      component.filterComponents('TARGET', 'delta')

      expect(component.filteredPsComponents).toEqual([])
    })

    it('should return no unregistered components when nothing matches', () => {
      component.filterComponents('SOURCE', 'unknown')

      expect(component.filteredPsComponents).toEqual([])
    })

    it('should reset unregistered components when source value is empty', () => {
      component.filteredPsComponents = []

      component.filterComponents('SOURCE', '')

      expect(component.filteredPsComponents).toEqual(unregistered)
    })

    it('should reset unregistered components when source value is only whitespace', () => {
      component.filteredPsComponents = []

      component.filterComponents('SOURCE', '   ')

      expect(component.filteredPsComponents).toEqual(unregistered)
    })

    it('should reset registered components when target value is empty', () => {
      component.filteredWComponents = []

      component.filterComponents('TARGET', '')

      expect(component.filteredWComponents).toEqual(registered)
    })

    it('should not touch registered components when source value is empty', () => {
      component.filteredWComponents = []

      component.filterComponents('SOURCE', '')

      expect(component.filteredWComponents).toEqual([])
    })

    it('should not touch unregistered components when target value is empty', () => {
      component.filteredPsComponents = []

      component.filterComponents('TARGET', '')

      expect(component.filteredPsComponents).toEqual([])
    })

    it('should reset unregistered components when source value is undefined', () => {
      component.filteredPsComponents = []

      component.filterComponents('SOURCE')

      expect(component.filteredPsComponents).toEqual(unregistered)
    })

    it('should clear the selected component when the filter value is empty', () => {
      component.selectedComponent = createComponent('Alpha', 'productA')

      component.filterComponents('SOURCE')

      expect(component.selectedComponent).toBeUndefined()
    })

    it('should clear the selected component when a filter value is applied', () => {
      component.selectedComponent = createComponent('Alpha', 'productA')

      component.filterComponents('SOURCE', 'alp')

      expect(component.selectedComponent).toBeUndefined()
    })
  })

  describe('Adding components to slot', () => {
    const makeComponent = (name: string, productName: string): ExtendedComponent => ({
      name,
      appId: 'appId',
      productName,
      changes: false,
      exists: true,
      undeployed: false,
      deprecated: false
    })

    it('should move components from source to target, reset the target filter and save the slot', () => {
      const toMove = makeComponent('Gamma', 'productB')
      const kept = makeComponent('Alpha', 'productA')
      component.psComponents = [kept, toMove]
      component.wComponentsOrg = [makeComponent('Delta', 'productB')]
      component.sourceFilterValue = 'alp'
      component.targetFilterValue = 'del'
      component.selectedComponent = toMove
      spyOn(component, 'onSaveSlot')

      component.onAddComponentsToSlot({ items: [toMove] })

      expect(component.psComponents.map((c) => c.name)).toEqual(['Alpha'])
      expect(component.wComponentsOrg.map((c) => c.name)).toEqual(['Delta', 'Gamma'])
      expect(component.targetFilterValue).toBeUndefined()
      expect(component.sourceFilterValue).toBe('alp')
      // target is refreshed without filter, source keeps the active filter
      expect(component.filteredWComponents.map((c) => c.name)).toEqual(['Delta', 'Gamma'])
      expect(component.filteredPsComponents.map((c) => c.name)).toEqual(['Alpha'])
      expect(component.selectedComponent).toBeUndefined()
      expect(component.onSaveSlot).toHaveBeenCalledWith(false)
    })

    it('should do nothing and not save when no items are moved', () => {
      component.psComponents = [makeComponent('Alpha', 'productA')]
      component.wComponentsOrg = []
      spyOn(component, 'onSaveSlot')

      component.onAddComponentsToSlot({ items: [] })

      expect(component.psComponents.map((c) => c.name)).toEqual(['Alpha'])
      expect(component.wComponentsOrg).toEqual([])
      expect(component.onSaveSlot).not.toHaveBeenCalled()
    })
  })

  describe('Deregistration', () => {
    it('should set deregisterItems and displayDeregisterConfirmation when onMoveToSource is called', () => {
      const mockEvent = { items: ['item1', 'item2', 'item3'] }

      component.onRemoveComponentsFromSlot(mockEvent)

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
          changes: false,
          exists: true,
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
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        },
        {
          productName: 'product2',
          appId: 'app2',
          name: 'comp2',
          changes: false,
          exists: true,
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
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        }
      ])
      expect(component['deregisterItems']).toEqual([])
    })

    it('should move components back to source, reset state and save slot on deregister confirmation', () => {
      component.displayDeregisterConfirmation = true
      component['deregisterItems'] = [
        {
          productName: 'product1',
          appId: 'app1',
          name: 'comp1',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        }
      ]
      component.psComponents = [
        {
          productName: 'product2',
          appId: 'app2',
          name: 'comp2',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        }
      ]
      component.wComponentsOrg = [
        {
          productName: 'product1',
          appId: 'app1',
          name: 'comp1',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        },
        {
          productName: 'product3',
          appId: 'app3',
          name: 'comp3',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        }
      ]
      const wComponentsOrgCopy = [...component.wComponentsOrg]
      spyOn(component, 'onSaveSlot')

      component.onDeregisterConfirmation()

      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(component.onSaveSlot).toHaveBeenCalledWith(false)
      // the confirmation only adds the items back to the source list; the slot
      // data is synced from the filtered list in the onSaveSlot response
      expect(component.psComponents.map((c) => c.name)).toEqual(['comp2', 'comp1'])
      expect(component.wComponentsOrg).toEqual(wComponentsOrgCopy)
      expect(component['deregisterItems']).not.toEqual([]) // still cleared in the onSaveSlot response
    })
  })

  describe('Saving', () => {
    beforeEach(() => {
      component.workspace_id = 'workspace1'
      component.slot = {
        name: 'slot1',
        productNames: ['productA'],
        type: ['WORKSPACE'],
        changes: false,
        undeployed: false,
        deprecated: false,
        psSlots: [],
        psComponents: [
          {
            productName: 'product1',
            appId: 'app1',
            name: 'comp1',
            changes: false,
            exists: true,
            undeployed: false,
            deprecated: false
          }
        ]
      }
      component.wComponentsOrg = [
        {
          productName: 'product1',
          appId: 'app1',
          name: 'comp1',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        }
      ]
    })

    it('should save slot and handle success response', () => {
      const slotResponse: Slot = {
        modificationCount: 1,
        modificationDate: 'date',
        components: [{ productName: 'product1', appId: 'app1', name: 'comp1' }]
      }
      slotServiceSpy.addOrUpdateSlot.and.returnValue(of(slotResponse))

      component.onSaveSlot(false)

      expect(slotServiceSpy.addOrUpdateSlot).toHaveBeenCalled()
      if (component.slot) {
        expect(component.slot.modificationCount).toBe(slotResponse.modificationCount)
        expect(component.slot.modificationDate).toBe(slotResponse.modificationDate)
        expect(component.slot.components).toEqual(slotResponse.components)
      }
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.SLOT_OK' })
    })

    it('should save slot and handle error response', () => {
      const errorResponse = { status: 400, statusText: 'Error on import menu items' }
      slotServiceSpy.addOrUpdateSlot.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onSaveSlot(false)

      expect(slotServiceSpy.addOrUpdateSlot).toHaveBeenCalled()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.SLOT_NOK' })
      expect(console.error).toHaveBeenCalledWith('addOrUpdateSlot', errorResponse)
    })

    it('should save slot on deregister confirmation', fakeAsync(() => {
      component.displayDeregisterConfirmation = true
      component['deregisterItems'] = [
        {
          productName: 'product1',
          appId: 'app1',
          name: 'comp1',
          changes: false,
          exists: true,
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
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        },
        {
          productName: 'product2',
          appId: 'app1',
          name: 'comp1',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        }
      ]
      component.wComponentsOrg = [
        {
          name: 'comp2',
          productName: 'product1',
          appId: 'appId1',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        },
        {
          name: 'comp2',
          productName: 'product2',
          appId: 'appId1',
          changes: false,
          exists: true,
          undeployed: false,
          deprecated: false
        }
      ]
      slotServiceSpy.addOrUpdateSlot.and.returnValue(of(undefined))

      component.onSaveSlot(false)

      expect(component['deregisterItems']).toEqual([])
    }))
  })

  describe('Reorder', () => {
    const makeComponent = (name: string): ExtendedComponent => ({
      name,
      appId: 'AppId',
      productName: 'Product',
      changes: false,
      exists: true,
      undeployed: false,
      deprecated: false
    })
    const slot: ExtendedSlot = {
      name: 'slot1',
      type: ['WORKSPACE'],
      changes: false,
      undeployed: false,
      deprecated: false,
      psSlots: [],
      productNames: [],
      psComponents: []
    }

    beforeEach(() => {
      component.workspace_id = 'workspace1'
    })

    it('should ignore saving if the target list has no or one component', () => {
      component.slot = slot
      component.filteredWComponents = [makeComponent('Component Name 1')]
      slotServiceSpy.addOrUpdateSlot.and.returnValue(of({}))

      component.onSaveSlot(true)

      expect(slotServiceSpy.addOrUpdateSlot).not.toHaveBeenCalled()
    })

    it('should save the slot with the current target list if the target list has two or more components', () => {
      component.slot = slot
      component.filteredWComponents = [makeComponent('Component Name 1'), makeComponent('Component Name 2')]
      slotServiceSpy.addOrUpdateSlot.and.returnValue(of({}))

      component.onSaveSlot(true)

      expect(slotServiceSpy.addOrUpdateSlot).toHaveBeenCalledWith({
        id: component.workspace_id,
        updateSlotRequest: {
          modificationCount: undefined,
          name: 'slot1',
          components: [
            { productName: 'Product', appId: 'AppId', name: 'Component Name 1' },
            { productName: 'Product', appId: 'AppId', name: 'Component Name 2' }
          ]
        }
      })
    })
  })

  /**
   * EXTRAS
   */
  describe('extras', () => {
    it('should set component name', () => {
      const comp: ExtendedComponent = {
        name: 'compB',
        appId: 'appId1',
        productName: 'productB',
        changes: false,
        exists: true,
        undeployed: false,
        deprecated: false
      }

      initializeComponent()

      component.onComponentSelect(comp)

      expect(component.selectedComponent?.name).toEqual('compB')
    })
  })

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
        changes: false,
        exists: true,
        undeployed: false,
        deprecated: false
      }
      const compB: ExtendedComponent = {
        name: 'compB',
        productName: 'compB',
        appId: 'appId',
        changes: false,
        exists: true,
        undeployed: false,
        deprecated: false
      }
      const compC: ExtendedComponent = {
        name: 'compC',
        productName: 'compC',
        appId: 'appId',
        changes: false,
        exists: true,
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
        changes: false,
        exists: true,
        undeployed: false,
        deprecated: false
      }
      const compB: ExtendedComponent = {
        name: '',
        productName: 'compB',
        appId: 'appId',
        changes: false,
        exists: true,
        undeployed: false,
        deprecated: false
      }
      const compC: ExtendedComponent = {
        name: 'compC',
        productName: 'compC',
        appId: 'appId',
        changes: false,
        exists: true,
        undeployed: false,
        deprecated: false
      }
      const components: ExtendedComponent[] = [compB, compC, compA]

      components.sort((a, b) => component.sortComponents(a, b))

      expect(components).toEqual([compA, compB, compC])
    })
  })
})
