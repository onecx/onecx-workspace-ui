import { NO_ERRORS_SCHEMA, Renderer2, SimpleChanges } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReactiveFormsModule, FormBuilder, FormArray, FormControl, FormGroup } from '@angular/forms'

import {
  AppStateService,
  PortalMessageService,
  UserService,
  WorkspaceService
} from '@onecx/angular-integration-interface'
import { MfeInfo } from '@onecx/integration-interface'

import {
  Product,
  WorkspaceProductAPIService,
  ProductAPIService,
  ProductStoreItem,
  Workspace,
  Microfrontend,
  MicrofrontendType,
  Slot,
  SlotPS,
  SlotAPIService,
  UIEndpoint
} from 'src/app/shared/generated'

import { ExtendedApp, ExtendedMicrofrontend, ExtendedProduct, ProductComponent } from './products.component'

const changes = { ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true } }
const workspace: Workspace = {
  id: 'wid',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  displayName: 'Workspace'
}
const slot1: Slot = {
  id: 's1',
  workspaceId: workspace.id,
  name: 'slot1',
  components: [{ productName: 'product1', appId: 'appId', name: 'App' }]
}
const slot2: Slot = {
  id: 's2',
  workspaceId: workspace.id,
  name: 'slot2',
  components: [{ productName: 'product1', appId: 'appId', name: 'App' }]
}

const mfeModule: ExtendedMicrofrontend = {
  index: 0,
  id: 'id m',
  appId: 'appId',
  appName: 'appName',
  basePath: 'path',
  type: MicrofrontendType.Module,
  exposedModule: './exposedModule',
  deprecated: false,
  undeployed: false
}
const mfeModuleDeprecated: ExtendedMicrofrontend = {
  index: 1,
  id: 'id d',
  appId: 'appId',
  appName: 'appName',
  basePath: 'path',
  type: MicrofrontendType.Module,
  exposedModule: './exposedModuleDeprecated',
  deprecated: true,
  undeployed: false
}
const mfeModuleUndeployed: ExtendedMicrofrontend = {
  index: 2,
  id: 'id u',
  appId: 'appId',
  basePath: 'path',
  type: MicrofrontendType.Module,
  exposedModule: './exposedModuleUndeployed',
  deprecated: true,
  undeployed: true
}
const mfeComponent: ExtendedMicrofrontend = {
  id: 'id c',
  appId: 'appId',
  appName: 'appName',
  basePath: 'path',
  type: MicrofrontendType.Component,
  deprecated: false,
  undeployed: false
}
const appWithAll: ExtendedApp = {
  appId: 'appId',
  appName: 'appName',
  modules: [mfeModule, mfeModuleDeprecated, mfeModuleUndeployed],
  components: [mfeComponent]
}
const appsAllMfes = new Map().set('appId', appWithAll)

// product store Item
const prodStoreItem: ProductStoreItem = {
  productName: 'product1',
  displayName: 'Display Name',
  description: 'Description',
  imageUrl: '/image/url',
  baseUrl: '/base',
  version: '1.0',
  microfrontends: [mfeModule, mfeModuleDeprecated, mfeModuleUndeployed, mfeComponent],
  undeployed: false,
  slots: [slot1]
}

// registered product in Workspace with new display name
const productItem: Product = {
  id: 'pid',
  modificationCount: 0,
  productName: 'product1',
  displayName: 'Display Name',
  description: 'Description',
  imageUrl: '/image/url',
  baseUrl: '/base',
  version: '1.0',
  microfrontends: [mfeModule, mfeComponent],
  slots: [],
  undeployed: false
}

const productItemSource: ExtendedProduct = {
  ...prodStoreItem,
  bucket: 'SOURCE',
  exists: true,
  changedComponents: true,
  apps: appsAllMfes
}
const productItemTarget: ExtendedProduct = {
  ...productItem,
  bucket: 'TARGET',
  exists: true,
  changedComponents: true
}

const mfeInfo: MfeInfo = {
  mountPath: 'path',
  remoteBaseUrl: 'url',
  baseHref: 'href',
  shellName: 'shell',
  appId: 'appId',
  productName: 'prodName'
}

fdescribe('ProductComponent', () => {
  let component: ProductComponent
  let fixture: ComponentFixture<ProductComponent>
  let mockRenderer: Renderer2
  let fb: FormBuilder
  let mockAppState
  let productFormGroup: FormGroup

  const wProductApiSpy = {
    getProductsByWorkspaceId: jasmine.createSpy('getProductsByWorkspaceId').and.returnValue(of({})),
    getProductById: jasmine.createSpy('getProductById').and.returnValue(of({})),
    updateProductById: jasmine.createSpy('updateProductById').and.returnValue(of({})),
    createProductInWorkspace: jasmine.createSpy('createProductInWorkspace').and.returnValue(of({})),
    deleteProductById: jasmine.createSpy('deleteProductById').and.returnValue(of({}))
  }
  const productApiSpy = {
    searchAvailableProducts: jasmine.createSpy('searchAvailableProducts').and.returnValue(of({}))
  }
  const slotApiSpy = { getSlotsForWorkspace: jasmine.createSpy('getSlotsForWorkspace').and.returnValue(of({})) }

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const workspaceServiceSpy = jasmine.createSpyObj<WorkspaceService>('WorkspaceService', ['doesUrlExistFor', 'getUrl'])
  const mockUserService = jasmine.createSpyObj('UserService', ['hasPermission'])
  mockUserService.hasPermission.and.callFake((permission: string) => {
    return ['WORKSPACE_PRODUCTS#REGISTER'].includes(permission)
  })

  beforeEach(waitForAsync(() => {
    mockAppState = { currentMfe$: of(mfeInfo) }
    TestBed.configureTestingModule({
      declarations: [ProductComponent],
      imports: [
        ReactiveFormsModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceProductAPIService, useValue: wProductApiSpy },
        { provide: ProductAPIService, useValue: productApiSpy },
        { provide: AppStateService, useValue: mockAppState },
        { provide: SlotAPIService, useValue: slotApiSpy },
        { provide: WorkspaceService, useValue: workspaceServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductComponent)
    mockRenderer = jasmine.createSpyObj('Renderer2', ['addClass', 'removeClass'])
    fb = TestBed.inject(FormBuilder)
    productFormGroup = fb.group({
      displayName: new FormControl(null),
      baseUrl: new FormControl(null),
      modules: fb.array([])
    })
    component = fixture.componentInstance
    component.renderer = mockRenderer
    component.workspace = workspace
    component.displayDetails = false
    component.displayedDetailItem = undefined
    component.wProducts = []
    component.psProducts = []
    component.psProductsOrg = new Map()
    fixture.detectChanges()
    // to spy data: reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    wProductApiSpy.getProductById.calls.reset()
    wProductApiSpy.getProductsByWorkspaceId.calls.reset()
    wProductApiSpy.updateProductById.calls.reset()
    wProductApiSpy.createProductInWorkspace.calls.reset()
    wProductApiSpy.deleteProductById.calls.reset()
    productApiSpy.searchAvailableProducts.calls.reset()
    slotApiSpy.getSlotsForWorkspace.calls.reset()
    // to spy data: refill with neutral data
    wProductApiSpy.getProductById.and.returnValue(of({}))
    wProductApiSpy.getProductsByWorkspaceId.and.returnValue(of({}))
    wProductApiSpy.updateProductById.and.returnValue(of({}))
    wProductApiSpy.createProductInWorkspace.and.returnValue(of({}))
    wProductApiSpy.deleteProductById.and.returnValue(of({}))
    productApiSpy.searchAvailableProducts.and.returnValue(of({}))
    slotApiSpy.getSlotsForWorkspace.and.returnValue(of({}))
    // used in ngOnChanges
    workspaceServiceSpy.doesUrlExistFor.and.returnValue(of(true))
  })

  describe('initialize', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })

    it('should set currentMfe', () => {
      expect(component.currentMfe).toEqual(mfeInfo)
    })
  })

  describe('load data', () => {
    beforeEach(() => {
      component.workspace = workspace
      slotApiSpy.getSlotsForWorkspace.and.returnValue(of({ slots: [slot1, slot2] }))
      wProductApiSpy.getProductsByWorkspaceId.and.returnValue(of([productItem]))
      productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [prodStoreItem] }))
    })

    describe('with errors', () => {
      it('getSlotsForWorkspace fails', () => {
        const errorResponse = { status: 404, statusText: 'workspace slots not found' }
        slotApiSpy.getSlotsForWorkspace.and.returnValue(throwError(() => errorResponse))
        spyOn(console, 'error')

        component.ngOnChanges(changes as unknown as SimpleChanges)

        expect(console.error).toHaveBeenCalledWith('getSlotsForWorkspace', errorResponse)
      })

      it('getProductsByWorkspaceId fails', () => {
        const errorResponse = { status: 404, statusText: 'workspace products not found' }
        wProductApiSpy.getProductsByWorkspaceId.and.returnValue(throwError(() => errorResponse))
        spyOn(console, 'error')

        component.ngOnChanges(changes as unknown as SimpleChanges)

        expect(console.error).toHaveBeenCalledWith('getProductsByWorkspaceId', errorResponse)
      })

      it('searchAvailableProducts fails', () => {
        const errorResponse = { status: 404, statusText: 'product store products not found' }
        productApiSpy.searchAvailableProducts.and.returnValue(throwError(() => errorResponse))
        spyOn(console, 'error')

        component.ngOnChanges(changes as unknown as SimpleChanges)

        expect(console.error).toHaveBeenCalledWith('searchAvailableProducts', errorResponse)
      })
    })

    describe('with success', () => {
      it('should loadData onChanges - successful', () => {
        component.ngOnChanges(changes as unknown as SimpleChanges)

        expect(component.psProductsOrg.get(prodStoreItem.productName!)).toEqual(productItemSource)
        expect(component.wProducts[0]).toEqual(productItemTarget)
      })

      it('should loadData onChanges - successful, but no slots', () => {
        slotApiSpy.getSlotsForWorkspace.and.returnValue(of({ slots: undefined }))
        component.ngOnChanges(changes as unknown as SimpleChanges)

        expect(component.psProductsOrg.get(prodStoreItem.productName!)).toEqual(productItemSource)
        expect(component.wProducts[0]).toEqual(productItemTarget)
      })

      // ignored
      xit('should loadData onChanges: searchPsProducts call success: prod deployed and only slots', () => {
        const pspItem: ExtendedProduct = {
          productName: 'pspItemName',
          displayName: 'display name',
          description: 'description',
          bucket: 'SOURCE',
          version: '1.0',
          slots: [{ name: 'slot' }],
          exists: true,
          changedComponents: false,
          apps: new Map().set('appId', { appId: 'appId', modules: [mfeModule] })
        }
        wProductApiSpy.getProductsByWorkspaceId.and.returnValue(of([productItem]))
        productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [pspItem] }))

        component.ngOnChanges(changes as unknown as SimpleChanges)

        expect(component.psProducts).toEqual([{ ...pspItem }])
      })

      it('should loadData onChanges: searchPsProducts call success: prod is now undeployed', () => {
        productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [{ ...prodStoreItem, undeployed: true }] }))

        component.ngOnChanges(changes as unknown as SimpleChanges)

        expect(component.psProducts.length).toBe(0) // prevent lading of undeployed products
      })

      // ignored
      xit('prepare product app parts: mfe type is component', () => {
        const psp: ExtendedProduct = {
          microfrontends: [
            { appId: 'app1', type: MicrofrontendType.Module },
            { appId: 'app2', type: MicrofrontendType.Component, undeployed: true },
            { appId: 'app2', type: MicrofrontendType.Component, deprecated: true }
          ],
          apps: new Map<string, any>([
            ['app1', {}],
            ['app2', {}]
          ]),
          slots: [{ name: 'slot1', undeployed: true }, { name: 'slot2', deprecated: true }, { name: 'slot3' }]
        } as ExtendedProduct
        spyOn<any>(component, 'prepareProductAppParts').and.callThrough()

        //component['prepareProductAppParts'](psp)

        expect(psp.changedComponents).toBeTrue()
      })

      // ignored
      xit('should handle slots and mark product as changed if undeployed or deprecated', () => {
        const psp: ExtendedProduct = {
          apps: new Map<string, any>(),
          slots: [{ undeployed: true }, { deprecated: true }]
        } as ExtendedProduct
        spyOn<any>(component, 'prepareProductAppParts').and.callThrough()

        //component['prepareProductAppParts'](psp)

        expect(psp.changedComponents).toBeTrue()
      })
    })

    describe('picklist reloads', () => {
      it('should subscribe to psProducts$', () => {
        spyOn(component, 'loadData')

        component.onLoadPsProducts()

        expect(component.loadData).toHaveBeenCalled()
      })

      it('should subscribe to wProducts$', () => {
        const mockWProducts$ = jasmine.createSpyObj('Observable', ['subscribe'])
        component.wProducts$ = mockWProducts$

        component.onLoadWProducts()

        expect(mockWProducts$.subscribe).toHaveBeenCalled()
      })
    })
  })

  /**
   * UI Events: DETAIL
   */
  it('should call stopPropagation on the event', () => {
    const mockEvent = {
      stopPropagation: jasmine.createSpy('stopPropagation')
    }

    component.return(mockEvent)

    expect(mockEvent.stopPropagation).toHaveBeenCalled()
  })

  describe('onSourceSelect', () => {
    it('should set displayDetails to false when no item is selected', () => {
      const event = { items: [] }
      spyOn(component, 'onHideItemDetails')

      component.onSourceSelect(event)

      expect(component.displayDetails).toBeFalse()
      expect(component.onHideItemDetails).toHaveBeenCalled()
    })

    it('should call fillForm when item is selected: mfes', () => {
      component.formGroup = productFormGroup
      const modules: FormArray = component.formGroup.get('modules') as FormArray
      const addMfeControl = (data: any) => {
        const formGroup = fb.group({
          id: [data.id],
          appId: [data.appId],
          basePath: [data.basePath]
        })
        modules.push(formGroup)
      }
      addMfeControl({ mfeModule })
      const event = { items: [productItemSource] }
      component.displayDetails = true
      component.psProductsOrg = new Map()
      component.psProductsOrg.set(productItemSource.productName!, productItemSource)

      component.onSourceSelect(event)

      expect(component.displayDetails).toBeTrue()
      expect(component.displayedDetailItem).toEqual(productItemSource)
    })
  })

  describe('onTargetSelect', () => {
    it('should set displayDetails to false when no item is selected', () => {
      const event = { items: [] }

      component.onTargetSelect(event)

      expect(component.displayDetails).toBeFalse()
      expect(component.displayedDetailItem).toBeUndefined()
    })

    it('should call getWProduct when an target item is selected - successful', () => {
      wProductApiSpy.getProductById.and.returnValue(of(productItem))
      wProductApiSpy.getProductsByWorkspaceId.and.returnValue(of([productItem]))
      productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [prodStoreItem] }))
      const event = { items: [{ ...productItemTarget }] }

      component.ngOnChanges(changes as unknown as SimpleChanges)
      component.onTargetSelect(event)

      expect(component.displayDetails).toBeTrue()

      component.getModuleControls('appId')
    })

    it('should call getWProduct when an target item is selected - successful but using product store displayName', () => {
      wProductApiSpy.getProductById.and.returnValue(of({ ...productItem, displayName: undefined }))
      wProductApiSpy.getProductsByWorkspaceId.and.returnValue(of([productItem]))
      productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [prodStoreItem] }))
      const event = { items: [productItemTarget] }

      component.ngOnChanges(changes as unknown as SimpleChanges)
      component.onTargetSelect(event)

      expect(component.displayDetails).toBeTrue()
      expect(component.displayedDetailItem?.displayName).toEqual(productItem.productName)
    })

    it('should call getWProduct when an item is selected: display error and hide detail panel', () => {
      const errorResponse = { status: 404, statusText: 'workspace product not found' }
      wProductApiSpy.getProductById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      const event = { items: [{ id: 1 }] }
      component.displayDetails = true

      component.onTargetSelect(event)

      expect(component.displayDetails).toBeFalse()
      expect(console.error).toHaveBeenCalledWith('getProductById', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.LOAD_ERROR' })
    })

    it('should call getWProduct when an item is selected: call getProductById forTARGET product', () => {
      const productWithoutMfes: Product = {
        ...productItem,
        microfrontends: []
      }
      const productSourceWithoutMfes: ProductStoreItem = {
        ...prodStoreItem,
        microfrontends: []
      }
      wProductApiSpy.getProductById.and.returnValue(of(productWithoutMfes))
      wProductApiSpy.getProductsByWorkspaceId.and.returnValue(of([productWithoutMfes]))
      productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [productSourceWithoutMfes] }))
      const event = { items: [{ ...productItemTarget, microfrontends: undefined }] }

      component.ngOnChanges(changes as unknown as SimpleChanges)
      component.onTargetSelect(event)

      expect(component.displayDetails).toBeTrue()
      expect(component.displayedDetailItem?.microfrontends).toBeUndefined()
    })
  })

  describe('form extras', () => {
    it('should ignore filling form', () => {
      component['fillForm'](undefined)
      expect().nothing()
    })
    /*
    xit('should getModuleControls', () => {
      expect(component.moduleControls instanceof FormArray).toBeTruthy()

      component.getModuleControls('appId')
    })*/
  })

  /**
   * UI Events: SAVE
   */
  describe('Saving', () => {
    it('should update a product - successful', () => {
      // load data
      wProductApiSpy.getProductsByWorkspaceId.and.returnValue(of([productItem]))
      productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [prodStoreItem] }))

      component.ngOnChanges(changes as unknown as SimpleChanges)

      // let's go
      wProductApiSpy.updateProductById.and.returnValue(of({ resource: productItem }))
      component.formGroup = productFormGroup
      const modules: FormArray = component.formGroup.get('modules') as FormArray
      const addMfeControl = (data: any) => {
        const formGroup = fb.group({
          id: [data.id],
          appId: [data.appId],
          basePath: [data.basePath]
        })
        modules.push(formGroup)
      }
      addMfeControl({ mfeModule })
      component.displayedDetailItem = productItemTarget

      component.onProductSave()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_OK' })
    })

    it('should update a product - failed: display error', () => {
      const errorResponse = { status: 400, statusText: 'workspace product not updated' }
      wProductApiSpy.updateProductById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component.formGroup = productFormGroup
      component.displayedDetailItem = productItemTarget

      component.onProductSave()

      expect(console.error).toHaveBeenCalledWith('updateProductById', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_NOK' })
    })
  })

  /**
   * REGISTER
   */
  describe('Registration', () => {
    it('should create a product onMoveToTarget', () => {
      wProductApiSpy.createProductInWorkspace.and.returnValue(of({ resource: productItem }))
      const event: any = { items: [{ ...productItemSource }] }
      // situation after picklist action
      component.wProducts = [{ ...productItemSource }]
      component.psProducts = []

      component.onMoveToTarget(event)

      // now it is a target item
      expect(component.wProducts[0].bucket).toEqual('TARGET')
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_OK' })
    })

    it('should create multiple products onMoveToTarget', () => {
      wProductApiSpy.createProductInWorkspace.and.returnValue(of({ resource: productItem }))
      const productItemSource2: ExtendedProduct = {
        ...productItemSource,
        productName: 'prod name 2'
      }
      const event: any = { items: [{ ...productItemSource }, productItemSource2] }
      // situation after picklist action
      component.wProducts = [{ ...productItemSource }, productItemSource2]

      component.onMoveToTarget(event)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATIONS_OK' })
    })

    it('should createProductInWorkspace onMoveToTarget: no modules', () => {
      wProductApiSpy.createProductInWorkspace.and.returnValue(of({ resource: productItem }))
      component.wProducts = [{ ...productItemSource }]
      const product2Test: ExtendedProduct = {
        ...productItemSource,
        microfrontends: undefined
      }
      const event: any = { items: [product2Test] }

      component.onMoveToTarget(event)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_OK' })
    })

    it('should createProductInWorkspace onMoveToTarget: multiple mfes', () => {
      const microfrontend2: Microfrontend = {
        id: 'id2',
        appId: 'appId2',
        basePath: 'path2',
        type: MicrofrontendType.Module
      }
      const product2Test: ExtendedProduct = {
        ...productItemSource,
        microfrontends: [mfeModule, microfrontend2]
      }
      const event: any = { items: [product2Test] }
      wProductApiSpy.createProductInWorkspace.and.returnValue(of({ resource: productItem }))
      component.wProducts = [{ ...product2Test }]

      component.onMoveToTarget(event)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_OK' })
    })

    it('should display error when trying to createProductInWorkspace onMoveToTarget', () => {
      const errorResponse = { status: 400, statusText: 'workspace product not created' }
      wProductApiSpy.createProductInWorkspace.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      const event: any = { items: [{ ...productItemSource }] }
      component.wProducts = [{ ...productItemSource }]

      component.onMoveToTarget(event)

      expect(console.error).toHaveBeenCalledWith('createProductInWorkspace', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_NOK' })
    })

    it('should display error when trying to createProductInWorkspace onMoveToTarget', () => {
      const errorResponse = { status: 400, statusText: 'workspace product not created' }
      wProductApiSpy.createProductInWorkspace.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component.wProducts = [{ ...productItemSource }]
      const product2: Product = {
        productName: 'prod name',
        displayName: 'display name',
        description: 'description',
        microfrontends: [mfeModule],
        modificationCount: 1
      }
      const event: any = { items: [productItem, product2] }

      component.onMoveToTarget(event)

      expect(console.error).toHaveBeenCalledWith('createProductInWorkspace', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATIONS_NOK' })
    })
  })

  describe('Deregistration', () => {
    it('should display confirmation dialog', () => {
      const event: any = { items: [productItemTarget] }

      component.onMoveToSource(event)

      expect(component['deregisterItems']).toEqual([productItemTarget])
      expect(component.displayDeregisterConfirmation).toBeTrue()
    })

    it('should restore items on deregister cancellation', () => {
      component['deregisterItems'] = [productItemTarget]
      component.displayDeregisterConfirmation = true
      // situation after move
      component.psProducts = [productItemSource]
      component.wProducts = []

      component.onDeregisterCancellation()

      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(component['deregisterItems']).toEqual([])
      // reestablish old state
      expect(component.psProducts).toEqual([])
      expect(component.wProducts).toEqual([productItemTarget])
    })

    it('should handle successful deregistration', () => {
      component['deregisterItems'] = [productItemTarget]
      component.psProducts = [productItemSource]
      component.wProducts = []
      spyOn(component as any, 'displayRegisterMessages')

      component.onDeregisterConfirmation()

      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(wProductApiSpy.deleteProductById).toHaveBeenCalledWith({
        id: 'wid',
        productId: productItemTarget.id
      })
    })

    it('should handle failed deregistration', () => {
      const errorResponse = { status: 400, statusText: 'workspace product could not be deregistered' }
      wProductApiSpy.deleteProductById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component['deregisterItems'] = [productItemTarget]
      component.psProducts = [productItemSource]
      component.wProducts = []
      spyOn(component as any, 'displayRegisterMessages')

      component.onDeregisterConfirmation()

      expect(console.error).toHaveBeenCalledWith('deleteProductById', errorResponse)
      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(wProductApiSpy.deleteProductById).toHaveBeenCalledWith({
        id: 'wid',
        productId: productItemTarget.id
      })
      expect(component.psProducts.length).toBe(0)
      expect(component.wProducts.length).toBe(1)
    })
  })

  describe('sorting', () => {
    describe('sort products', () => {
      it('should sort products by displayName', () => {
        const products = [
          {
            ...productItem,
            id: 'p2',
            productName: 'prod2',
            displayName: productItem.displayName + ' a'
          },
          productItem
        ]

        products.sort((a, b) => component.sortProductsByDisplayName(a, b))

        expect(products[0]).toEqual(productItem)
      })

      it('should sort products by displayName: no display name', () => {
        const products = [
          { id: 'prod id2', productName: 'prod name2' },
          { ...productItem, displayName: undefined }
        ]

        products.sort((a, b) => component.sortProductsByDisplayName(a, b))

        expect(products[1]).toEqual({ ...productItem, displayName: undefined })
      })
    })

    describe('sortMicrofrontends', () => {
      it('should sort mfes by appId', () => {
        const mfes = [{ appId: 'b' }, { appId: 'a' }, { appId: 'c' }]

        mfes.sort((a, b) => component.sortMicrofrontends(a, b))

        expect(mfes).toEqual([mfes[0], mfes[1], mfes[2]])
      })

      it('should sort mfes by appId: no appIds', () => {
        const mfes = [{ appId: 'a' }, { id: '2' }, { id: '3' }]

        mfes.sort((a, b) => component.sortMicrofrontends(a, b))

        expect(mfes).toEqual([mfes[0], mfes[1], mfes[2]])
      })

      it('should sort mfes by exposedModule', () => {
        const mfes = [{ appId: 'a', exposedModule: 'z' }, { appId: 'a', exposedModule: 'x' }, { appId: 'a' }]

        mfes.sort((a, b) => component.sortMicrofrontends(a, b))

        expect(mfes).toEqual([mfes[0], mfes[1], mfes[2]])
      })
    })

    describe('sortSlotsByName', () => {
      it('should sort slots by name ', () => {
        const a: SlotPS = { name: 'a' }
        const b: SlotPS = { name: 'b' }
        const c: SlotPS = { name: 'c' }
        const eMfes = [b, c, a]

        eMfes.sort((x, y) => component.sortSlotsByName(x, y))

        expect(eMfes).toEqual([a, b, c])
      })

      it('should sort slots by name : some empty name ', () => {
        const a: SlotPS = { name: 'a' }
        const b: SlotPS = { name: '' }
        const c: SlotPS = { name: '' }
        const eMfes: SlotPS[] = [b, c, a]

        eMfes.sort((x, y) => component.sortSlotsByName(x, y))

        expect(eMfes).toEqual([b, c, a])
      })

      it('should sort slots by name : all empty name ', () => {
        const a: SlotPS = { name: '' }
        const b: SlotPS = { name: '' }
        const c: SlotPS = { name: '' }
        const eMfes = [b, c, a]

        eMfes.sort((x, y) => component.sortSlotsByName(x, y))

        expect(eMfes).toEqual([b, c, a])
      })

      it('should sort slots by name : special char name ', () => {
        const a: SlotPS = { name: 'a' }
        const b: SlotPS = { name: 'b' }
        const c: SlotPS = { name: '$' }
        const eMfes = [b, a, c]

        eMfes.sort((x, y) => component.sortSlotsByName(x, y))

        expect(eMfes).toEqual([c, a, b])
      })
    })

    describe('sort endpoints by name', () => {
      it('should sort slots by name ', () => {
        const a: UIEndpoint = { name: 'a' }
        const b: UIEndpoint = { name: 'b' }
        const arr = [b, a]

        arr.sort((x, y) => component['sortEndpointsByName'](x, y))

        expect(arr).toEqual([a, b])
      })

      it('should sort endpoints by name : some empty name ', () => {
        const a: UIEndpoint = { name: undefined }
        const b: UIEndpoint = { name: 'b' }
        const arr = [a, b]

        arr.sort((x, y) => component['sortEndpointsByName'](x, y))

        expect(arr).toEqual([a, b])

        arr.sort((x, y) => component['sortEndpointsByName'](y, x))

        expect(arr).toEqual([b, a])
      })
    })
  })

  describe('image', () => {
    it('should return imageUrl path', () => {
      const result = component.getImageUrl({ imageUrl: '/url' } as ExtendedProduct)

      expect(result).toBe('/url')
    })

    it('should return imageUrl path', () => {
      const result = component.getImageUrl()

      expect(result).toBeUndefined()
    })

    it('should return uploaded imageUrl', () => {
      const result = component.getImageUrl({ productName: 'product' } as ExtendedProduct)

      expect(result).toBe('http://onecx-workspace-bff:8080/images/product/product')
    })
  })

  /**
   * UI Events
   */
  describe('Picklist', () => {
    it('should return value from event object', () => {
      const event = { target: { value: 'test value' } }

      expect(component.getFilterValue(event)).toEqual('test value')
    })

    it('should set displayDetails to false', () => {
      component.displayDetails = true

      component.onHideItemDetails()

      expect(component.displayDetails).toBeFalse()
    })

    it('should update sourceListViewMode based on event mode: grid', () => {
      const event = { icon: 'grid-icon', mode: 'grid' }

      component.onSourceViewModeChange(event)

      expect(component.sourceListViewMode).toEqual({
        mode: 'grid',
        icon: 'pi pi-th-large',
        titleKey: 'DIALOG.DATAVIEW.VIEW_MODE_GRID'
      })
      expect(mockRenderer.addClass).toHaveBeenCalledWith(component.sourceList, 'tile-view')
    })

    it('should update sourceListViewMode based on event mode: list', () => {
      const event = { icon: 'list-icon', mode: 'list' }

      component.onSourceViewModeChange(event)

      expect(component.sourceListViewMode).toEqual({
        mode: 'list',
        icon: 'pi pi-list',
        titleKey: 'DIALOG.DATAVIEW.VIEW_MODE_LIST'
      })
      expect(mockRenderer.removeClass).toHaveBeenCalledWith(component.sourceList, 'tile-view')
    })

    it('should update targetListViewMode based on event mode', () => {
      const event = { icon: 'grid-icon', mode: 'grid' }

      component.onTargetViewModeChange(event)

      expect(component.targetListViewMode).toEqual({
        mode: 'grid',
        icon: 'pi pi-th-large',
        titleKey: 'DIALOG.DATAVIEW.VIEW_MODE_GRID'
      })
      expect(mockRenderer.addClass).toHaveBeenCalledWith(component.targetList, 'tile-view')
    })

    it('should handle mode changes appropriately for the target list', () => {
      let event = { icon: 'list-icon', mode: 'list' }
      component.onTargetViewModeChange(event)
      expect(mockRenderer.removeClass).toHaveBeenCalledWith(component.targetList, 'tile-view')

      event = { icon: 'grid-icon', mode: 'grid' }
      component.onTargetViewModeChange(event)
      expect(mockRenderer.addClass).toHaveBeenCalledWith(component.targetList, 'tile-view')
    })
  })

  describe('getProductEndpointUrl', () => {
    beforeEach(() => {
      component.workspace = workspace
    })

    it('should productEndpointExist - exist', (done) => {
      component.productEndpointExist = true
      workspaceServiceSpy.getUrl.and.returnValue(of('/url'))

      const eu$ = component.getProductEndpointUrl$('name')

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

      const eu$ = component.getProductEndpointUrl$('name')

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

    it('should permissionEndpointExist - exist', (done) => {
      component.permissionEndpointExist = true
      workspaceServiceSpy.getUrl.and.returnValue(of('/url'))

      const eu$ = component.getPermissionEndpointUrl$('name')

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

    it('should permissionEndpointExist - not exist', (done) => {
      component.permissionEndpointExist = false
      const errorResponse = { status: 400, statusText: 'Error on check endpoint' }
      workspaceServiceSpy.getUrl.and.returnValue(throwError(() => errorResponse))

      const eu$ = component.getPermissionEndpointUrl$('name')

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
