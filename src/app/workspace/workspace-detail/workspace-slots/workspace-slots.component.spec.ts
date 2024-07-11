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
  Product
} from 'src/app/shared/generated'
import { CombinedSlot, WorkspaceSlotsComponent } from './workspace-slots.component'

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url'
}

fdescribe('WorkspaceSlotsComponent', () => {
  let component: WorkspaceSlotsComponent
  let fixture: ComponentFixture<WorkspaceSlotsComponent>
  let mockUserService: any

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
  mockUserService = jasmine.createSpyObj('UserService', ['hasPermission'])
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

    it('should display error when slots cannot be loaded', () => {
      const err = { status: '404' }
      slotServiceSpy.getSlotsForWorkspace.and.returnValue(throwError(() => err))
      spyOn(component as any, 'declareWorkspaceProducts').and.callFake(() => {})
      spyOn(component as any, 'declarePsSlots').and.callFake(() => {})

      component.loadData()

      expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_' + err.status + '.SLOTS')
    })
  })
})
