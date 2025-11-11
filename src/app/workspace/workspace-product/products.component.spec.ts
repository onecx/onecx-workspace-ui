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
  UIEndpoint,
  SlotComponent
} from 'src/app/shared/generated'

import {
  AddMfeModuleFormControl,
  ExtendedApp,
  ExtendedMicrofrontend,
  ExtendedProduct,
  ProductComponent
} from './products.component'

const changes = { ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true } }
const workspace: Workspace = {
  id: 'wid',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  displayName: 'Workspace'
}
// 2 modules and 1 component for app 1
const mfeModule1: ExtendedMicrofrontend = {
  index: 0,
  id: 'id1',
  appId: 'app1',
  appName: 'appName1',
  basePath: '/path1',
  type: MicrofrontendType.Module,
  exposedModule: './mfeModule1',
  deprecated: false,
  undeployed: false
}
const mfeModule2: ExtendedMicrofrontend = {
  index: 1,
  id: 'id2',
  appId: 'app1',
  appName: 'appName1',
  basePath: '/path2',
  type: MicrofrontendType.Module,
  exposedModule: './mfeModule2',
  deprecated: true,
  undeployed: false
}
const mfeComponent1: ExtendedMicrofrontend = {
  id: 'id4',
  appId: 'app1',
  appName: 'appName1',
  basePath: '/path11',
  type: MicrofrontendType.Component,
  exposedModule: './mfeComponent1',
  deprecated: false,
  undeployed: false
}
const mfeSlotComponent1: SlotComponent = {
  appId: 'app1',
  productName: 'appName1',
  name: 'slotComponent1'
}
// 1 module for another app
const mfeModule3: ExtendedMicrofrontend = {
  index: 2,
  id: 'id3',
  appId: 'app2',
  basePath: '/path3',
  type: MicrofrontendType.Module,
  exposedModule: './mfeModule3',
  deprecated: true,
  undeployed: true
}
const app1: ExtendedApp = {
  appId: 'app1',
  appName: 'appName1',
  modules: [mfeModule1, mfeModule2],
  components: [mfeComponent1]
}
const app2: ExtendedApp = {
  appId: 'app2',
  appName: 'app2',
  modules: [mfeModule3]
}
const allAppMap = new Map().set(app1.appId, app1).set(app2.appId, app2)

const slot1: Slot = {
  id: 's1',
  workspaceId: workspace.id,
  name: 'slot1',
  components: [mfeSlotComponent1]
}
const slot2: Slot = {
  id: 's2',
  workspaceId: workspace.id,
  name: 'slot2',
  components: [mfeSlotComponent1]
}

// product store Item: 3 Modules in 2 Apps, 1 Component
const psProduct1: ProductStoreItem = {
  productName: 'product1',
  displayName: 'Display Name',
  description: 'Description',
  imageUrl: '/image/url',
  baseUrl: '/base',
  version: '1.0',
  microfrontends: [mfeModule1, mfeModule2, mfeModule3, mfeComponent1],
  slots: [slot1, slot2],
  undeployed: false
}

// registered product in Workspace: 1 Module in 1 App, 1 Component => outdated
const wProduct1: Product = {
  ...psProduct1,
  id: 'pid1',
  modificationCount: 0,
  microfrontends: [mfeModule1, { ...mfeModule2, exposedModule: undefined }, mfeComponent1],
  slots: [],
  undeployed: false
}
// empty workspace product which has no pendant in product store
const wProduct2: Product = {
  id: 'pid2',
  modificationCount: 0,
  productName: 'product2',
  description: 'Description',
  imageUrl: '/image/url',
  baseUrl: '/base',
  version: '1.0',
  microfrontends: [],
  slots: [],
  undeployed: false
}

const product1Source: ExtendedProduct = {
  ...psProduct1,
  bucket: 'SOURCE',
  exists: true,
  changedComponents: true,
  apps: allAppMap
}
const product1Target: ExtendedProduct = {
  ...wProduct1,
  bucket: 'TARGET',
  exists: true,
  changedComponents: true
}
const product2Target: ExtendedProduct = {
  ...wProduct2,
  bucket: 'TARGET',
  exists: false,
  changedComponents: true
}
// current MFE
const mfeInfo: MfeInfo = {
  mountPath: 'path',
  remoteBaseUrl: 'url',
  baseHref: 'href',
  shellName: 'shell',
  appId: 'app1',
  productName: 'prodName'
}

describe('ProductComponent', () => {
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
      wProductApiSpy.getProductsByWorkspaceId.and.returnValue(of([wProduct1, wProduct2]))
      productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [psProduct1] }))
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

        const psOrg = component.psProductsOrg.get(psProduct1.productName!)
        expect(psOrg?.microfrontends).toEqual(product1Source.microfrontends)
        expect(psOrg?.slots).toEqual(product1Source.slots)
        expect(psOrg?.apps?.get('app1')).toEqual(product1Source.apps?.get('app1'))
        expect(psOrg?.apps?.get('app2')).toEqual(product1Source.apps?.get('app2'))

        expect(component.wProducts[1]).toEqual(product1Target)
      })

      it('should loadData onChanges - successful, but no slots', () => {
        slotApiSpy.getSlotsForWorkspace.and.returnValue(of({ slots: undefined }))
        component.ngOnChanges(changes as unknown as SimpleChanges)

        expect(component.psProductsOrg.get(psProduct1.productName!)).toEqual(product1Source)
        expect(component.wProducts[1]).toEqual(product1Target)
      })

      it('should loadData onChanges: searchPsProducts call success: prod is now undeployed', () => {
        productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [{ ...psProduct1, undeployed: true }] }))

        component.ngOnChanges(changes as unknown as SimpleChanges)

        expect(component.psProducts.length).toBe(0) // prevent lading of undeployed products
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
      const modules = component.formGroup.get('modules') as FormArray
      AddMfeModuleFormControl(fb, modules, 0, mfeModule1)
      const event = { items: [product1Source] }
      component.displayDetails = true
      component.psProductsOrg = new Map()
      component.psProductsOrg.set(product1Source.productName!, product1Source)

      component.onSourceSelect(event)

      expect(component.displayDetails).toBeTrue()
      expect(component.displayedDetailItem).toEqual(product1Source)
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
      wProductApiSpy.getProductById.and.returnValue(of(wProduct1))
      wProductApiSpy.getProductsByWorkspaceId.and.returnValue(of([wProduct1]))
      productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [psProduct1] }))
      const event = { items: [{ ...product1Target }] }

      component.ngOnChanges(changes as unknown as SimpleChanges)
      component.onTargetSelect(event)

      expect(component.displayDetails).toBeTrue()

      component.getModuleControls('app1')
    })

    it('should call getWProduct when an target item is selected - successful but using product store displayName', () => {
      wProductApiSpy.getProductById.and.returnValue(of({ ...wProduct1, displayName: undefined }))
      wProductApiSpy.getProductsByWorkspaceId.and.returnValue(of([wProduct1]))
      productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [psProduct1] }))
      const event = { items: [product1Target] }

      component.ngOnChanges(changes as unknown as SimpleChanges)
      component.onTargetSelect(event)

      expect(component.displayDetails).toBeTrue()
      expect(component.displayedDetailItem?.displayName).toEqual(wProduct1.displayName)
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

    it('should call getWProduct when an item is selected: call getProductById for TARGET product', () => {
      const productWithoutMfes: Product = {
        ...wProduct1,
        microfrontends: []
      }
      const productSourceWithoutMfes: ProductStoreItem = {
        ...psProduct1,
        microfrontends: []
      }
      wProductApiSpy.getProductById.and.returnValue(of(productWithoutMfes))
      wProductApiSpy.getProductsByWorkspaceId.and.returnValue(of([productWithoutMfes]))
      productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [productSourceWithoutMfes] }))
      const event = { items: [{ ...product1Target, microfrontends: undefined }] }

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
  })

  describe('Saving', () => {
    beforeEach(() => {
      component.workspace = workspace
      // load data
      wProductApiSpy.getProductsByWorkspaceId.and.returnValue(of([wProduct1, wProduct2]))
      productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [psProduct1] }))
      component.ngOnChanges(changes as unknown as SimpleChanges)
    })

    it('should save product with existing and new MFE - successful - simulation', () => {
      // let's go...prepare form
      wProductApiSpy.updateProductById.and.returnValue(of({ resource: wProduct1 }))
      component.formGroup = productFormGroup
      const modules: FormArray = component.formGroup.get('modules') as FormArray
      component.displayedDetailItem = product1Target
      if (product1Target.microfrontends) {
        AddMfeModuleFormControl(fb, modules, 0, mfeModule1)
        AddMfeModuleFormControl(fb, modules, 1, { ...mfeModule2, id: undefined, change: 'create' })
      }

      component.onProductSave()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_OK' })
    })

    it('should save product - successful - user interaction', () => {
      const psProduct: Product = {
        ...psProduct1,
        microfrontends: [mfeModule1, { ...mfeModule2, basePath: undefined }, mfeComponent1]
      }
      productApiSpy.searchAvailableProducts.and.returnValue(of({ stream: [psProduct] }))
      wProductApiSpy.getProductById.and.returnValue(of(wProduct1))
      wProductApiSpy.updateProductById.and.returnValue(of({ resource: wProduct1 }))
      component.formGroup = productFormGroup

      component.ngOnChanges(changes as unknown as SimpleChanges)
      component.onTargetSelect({ items: [product1Target] }) // and fill form

      component.onProductSave()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_OK' })
    })

    it('should save product - failed: form invalid - missing basePath', () => {
      // let's go...prepare form
      wProductApiSpy.updateProductById.and.returnValue(of({ resource: wProduct1 }))
      component.formGroup = productFormGroup
      const modules: FormArray = component.formGroup.get('modules') as FormArray
      component.displayedDetailItem = product1Target
      if (product1Target.microfrontends) {
        // missing basePath => form will be invalid
        AddMfeModuleFormControl(fb, modules, 0, { ...mfeModule2, id: undefined, basePath: undefined })
      }

      component.onProductSave()

      expect(msgServiceSpy.success).not.toHaveBeenCalled()
    })

    it('should save product - failed: form invalid - non-unique basePath', () => {
      // let's go...prepare form
      wProductApiSpy.updateProductById.and.returnValue(of({ resource: wProduct1 }))
      component.formGroup = productFormGroup
      const modules: FormArray = component.formGroup.get('modules') as FormArray
      component.displayedDetailItem = product1Target
      if (product1Target.microfrontends) {
        // missing basePath => form will be invalid
        AddMfeModuleFormControl(fb, modules, 0, { ...mfeModule1, basePath: '/abc' })
        AddMfeModuleFormControl(fb, modules, 1, { ...mfeModule2, basePath: '/abc' })
      }

      component.onProductSave()

      expect(msgServiceSpy.success).not.toHaveBeenCalled()
    })

    it('should save product - failed: common display error', () => {
      const errorResponse = { status: 400, statusText: 'workspace product not updated' }
      wProductApiSpy.updateProductById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component.formGroup = productFormGroup
      component.displayedDetailItem = product1Target

      component.onProductSave()

      expect(console.error).toHaveBeenCalledWith('updateProductById', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_NOK' })
    })

    it('should save product - failed: constraint violation', () => {
      const errorResponse = {
        status: 400,
        statusText: 'workspace product not updated',
        error: { errorCode: 'MERGE_ENTITY_FAILED' }
      }
      wProductApiSpy.updateProductById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component.formGroup = productFormGroup
      component.displayedDetailItem = product1Target

      component.onProductSave()

      expect(console.error).toHaveBeenCalledWith('updateProductById', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({
        summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_NOK',
        detailKey: 'VALIDATION.ERRORS.APP_MODULE.' + errorResponse.error?.errorCode
      })
    })
  })

  describe('Registration', () => {
    it('should create a product onMoveToTarget', () => {
      wProductApiSpy.createProductInWorkspace.and.returnValue(of({ resource: wProduct1 }))
      const event: any = { items: [{ ...product1Source }] }
      // situation after picklist action
      component.wProducts = [{ ...product1Source }]
      component.psProducts = []

      component.onMoveToTarget(event)

      // now it is a target item
      expect(component.wProducts[0].bucket).toEqual('TARGET')
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_OK' })
    })

    it('should create multiple products onMoveToTarget', () => {
      wProductApiSpy.createProductInWorkspace.and.returnValue(of({ resource: wProduct1 }))
      const productItemSource2: ExtendedProduct = {
        ...product1Source,
        productName: 'prod name 2'
      }
      const event: any = { items: [{ ...product1Source }, productItemSource2] }
      // situation after picklist action
      component.wProducts = [{ ...product1Source }, productItemSource2]

      component.onMoveToTarget(event)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATIONS_OK' })
    })

    it('should createProductInWorkspace onMoveToTarget: no modules', () => {
      wProductApiSpy.createProductInWorkspace.and.returnValue(of({ resource: wProduct1 }))
      component.wProducts = [{ ...product1Source }]
      const product2Test: ExtendedProduct = {
        ...product1Source,
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
        ...product1Source,
        microfrontends: [mfeModule1, microfrontend2]
      }
      const event: any = { items: [product2Test] }
      wProductApiSpy.createProductInWorkspace.and.returnValue(of({ resource: wProduct1 }))
      component.wProducts = [{ ...product2Test }]

      component.onMoveToTarget(event)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_OK' })
    })

    it('should display error when trying to createProductInWorkspace onMoveToTarget', () => {
      const errorResponse = { status: 400, statusText: 'workspace product not created' }
      wProductApiSpy.createProductInWorkspace.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      const event: any = { items: [{ ...product1Source }] }
      component.wProducts = [{ ...product1Source }]

      component.onMoveToTarget(event)

      expect(console.error).toHaveBeenCalledWith('createProductInWorkspace', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_NOK' })
    })

    it('should display error when trying to createProductInWorkspace onMoveToTarget', () => {
      const errorResponse = { status: 400, statusText: 'workspace product not created' }
      wProductApiSpy.createProductInWorkspace.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component.wProducts = [{ ...product1Source }]
      const product2: Product = {
        productName: 'prod name',
        displayName: 'display name',
        description: 'description',
        microfrontends: [mfeModule1],
        modificationCount: 1
      }
      const event: any = { items: [wProduct1, product2] }

      component.onMoveToTarget(event)

      expect(console.error).toHaveBeenCalledWith('createProductInWorkspace', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATIONS_NOK' })
    })
  })

  describe('Deregistration', () => {
    it('should display confirmation dialog', () => {
      const event: any = { items: [product1Target] }

      component.onMoveToSource(event)

      expect(component['deregisterItems']).toEqual([product1Target])
      expect(component.displayDeregisterConfirmation).toBeTrue()
    })

    it('should restore items on deregister cancellation', () => {
      component['deregisterItems'] = [product1Target]
      component.displayDeregisterConfirmation = true
      // situation after move
      component.psProducts = [product1Source]
      component.wProducts = []

      component.onDeregisterCancellation()

      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(component['deregisterItems']).toEqual([])
      // reestablish old state
      expect(component.psProducts).toEqual([])
      expect(component.wProducts).toEqual([product1Target])
    })

    it('should handle successful deregistration - product exists in product store', () => {
      component['deregisterItems'] = [product1Target]
      component.psProducts = [{ ...product1Source, productName: 'other' }]
      component.wProducts = []
      spyOn(component as any, 'displayRegisterMessages')

      component.onDeregisterConfirmation()

      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(wProductApiSpy.deleteProductById).toHaveBeenCalledWith({
        id: 'wid',
        productId: product1Target.id
      })
    })

    it('should handle successful deregistration - product does not exist in product store', () => {
      component['deregisterItems'] = [product2Target]
      component.psProducts = [product1Source]
      component.wProducts = [product1Target, product2Target]
      spyOn(component as any, 'displayRegisterMessages')

      component.onDeregisterConfirmation()

      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(wProductApiSpy.deleteProductById).toHaveBeenCalledWith({
        id: 'wid',
        productId: product2Target.id
      })
    })

    it('should handle failed deregistration', () => {
      const errorResponse = { status: 400, statusText: 'workspace product could not be deregistered' }
      wProductApiSpy.deleteProductById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component['deregisterItems'] = [product1Target]
      component.psProducts = [product1Source]
      component.wProducts = []
      spyOn(component as any, 'displayRegisterMessages')

      component.onDeregisterConfirmation()

      expect(console.error).toHaveBeenCalledWith('deleteProductById', errorResponse)
      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(wProductApiSpy.deleteProductById).toHaveBeenCalledWith({
        id: 'wid',
        productId: product1Target.id
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
            ...wProduct1,
            id: 'p2',
            productName: 'prod2',
            displayName: wProduct1.displayName + ' a'
          },
          wProduct1
        ]

        products.sort((a, b) => component.sortProductsByDisplayName(a, b))

        expect(products[0]).toEqual(wProduct1)
      })

      it('should sort products by displayName: no display name', () => {
        const products = [
          { id: 'prod id2', productName: 'prod name2' },
          { ...wProduct1, displayName: undefined }
        ]

        products.sort((a, b) => component.sortProductsByDisplayName(a, b))

        expect(products[1]).toEqual({ ...wProduct1, displayName: undefined })
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
