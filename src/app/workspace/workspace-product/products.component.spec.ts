import { NO_ERRORS_SCHEMA, Renderer2, SimpleChanges } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { ActivatedRoute, provideRouter } from '@angular/router'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReactiveFormsModule, FormBuilder, FormArray, FormControl } from '@angular/forms'

import { AppStateService, MfeInfo, PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import {
  Product,
  WorkspaceProductAPIService,
  ProductAPIService,
  Workspace,
  Microfrontend,
  MicrofrontendType,
  SlotPS,
  SlotAPIService,
  UIEndpoint
} from 'src/app/shared/generated'
import * as utils from 'src/app/shared/utils'

import { ExtendedMicrofrontend, ExtendedProduct, ExtendedSlot, ProductComponent } from './products.component'

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url',
  displayName: ''
}

const microfrontend: Microfrontend = {
  id: 'id',
  appId: 'appId',
  basePath: 'path',
  type: MicrofrontendType.Module
}

const microfrontendComponent: Microfrontend = {
  id: 'id',
  appId: 'appId',
  basePath: 'path',
  type: MicrofrontendType.Component
}

const product: ExtendedProduct = {
  id: 'prod id',
  productName: 'prod name',
  displayName: 'display name',
  description: 'description',
  version: '1.0',
  microfrontends: [microfrontend],
  modificationCount: 1,
  bucket: 'SOURCE',
  undeployed: false,
  changedComponents: false,
  apps: new Map().set('appId', { appId: 'appId', modules: [microfrontend] }),
  slots: [{ name: 'psSlot' } as SlotPS]
}

const prodStoreItem: ExtendedProduct = {
  productName: 'prodStoreItemName',
  displayName: 'display name2',
  description: 'description2',
  version: '1.0',
  microfrontends: [microfrontend],
  bucket: 'SOURCE',
  undeployed: false,
  changedComponents: false,
  apps: new Map().set('appId', { appId: 'appId', modules: [microfrontend] })
}

const prodStoreItemTarget: ExtendedProduct = {
  productName: 'prodStoreItemName',
  displayName: 'display name2',
  description: 'description2',
  version: '1.0',
  microfrontends: [microfrontend],
  bucket: 'TARGET',
  undeployed: false,
  changedComponents: false,
  apps: new Map().set('appId', { appId: 'appId', modules: [microfrontend] })
}

const prodStoreItemEmptyMicrofrontends: ExtendedProduct = {
  productName: 'prodStoreItemName',
  displayName: 'display name2',
  description: 'description2',
  version: '1.0',
  microfrontends: [],
  bucket: 'TARGET',
  undeployed: false,
  changedComponents: false,
  apps: new Map().set('appId', { appId: 'appId', modules: [microfrontend] })
}

const mfeInfo: MfeInfo = {
  mountPath: 'path',
  remoteBaseUrl: 'url',
  baseHref: 'href',
  shellName: 'shell',
  appId: 'appId',
  productName: 'prodName'
}

describe('ProductComponent', () => {
  let component: ProductComponent
  let fixture: ComponentFixture<ProductComponent>
  let mockActivatedRoute: ActivatedRoute
  let mockRenderer: Renderer2
  let fb: FormBuilder
  let mockAppState

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const wProductServiceSpy = {
    getProductsByWorkspaceId: jasmine.createSpy('getProductsByWorkspaceId').and.returnValue(of({})),
    getProductById: jasmine.createSpy('getProductById').and.returnValue(of({})),
    updateProductById: jasmine.createSpy('updateProductById').and.returnValue(of({})),
    createProductInWorkspace: jasmine.createSpy('createProductInWorkspace').and.returnValue(of({})),
    deleteProductById: jasmine.createSpy('deleteProductById').and.returnValue(of({}))
  }
  const productServiceSpy = {
    searchAvailableProducts: jasmine.createSpy('searchAvailableProducts').and.returnValue(of({}))
  }
  const slotApiServiceSpy = { createSlot: jasmine.createSpy('createSlot').and.returnValue(of({})) }
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
        provideRouter([{ path: '', component: ProductComponent }]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceProductAPIService, useValue: wProductServiceSpy },
        { provide: ProductAPIService, useValue: productServiceSpy },
        { provide: AppStateService, useValue: mockAppState },
        { provide: SlotAPIService, useValue: slotApiServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductComponent)
    mockRenderer = jasmine.createSpyObj('Renderer2', ['addClass', 'removeClass'])
    component = fixture.componentInstance
    component.workspace = workspace
    fb = TestBed.inject(FormBuilder)
    component.renderer = mockRenderer
    fixture.detectChanges()
    // to spy data: reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    wProductServiceSpy.getProductsByWorkspaceId.calls.reset()
    wProductServiceSpy.getProductById.calls.reset()
    wProductServiceSpy.updateProductById.calls.reset()
    wProductServiceSpy.createProductInWorkspace.calls.reset()
    wProductServiceSpy.deleteProductById.calls.reset()
    productServiceSpy.searchAvailableProducts.calls.reset()
    slotApiServiceSpy.createSlot.calls.reset()
    // to spy data: refill with neutral data
    wProductServiceSpy.createProductInWorkspace.and.returnValue(of({}))
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should set currentMfe', () => {
    expect(component.currentMfe).toEqual(mfeInfo)
  })

  it('should loadData onChanges: with and without ws id', () => {
    wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of([product]))
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(wProductServiceSpy.getProductsByWorkspaceId).toHaveBeenCalled()
    expect(productServiceSpy.searchAvailableProducts).toHaveBeenCalled()

    const workspace2: Workspace = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url',
      displayName: ''
    }
    component.workspace = workspace2

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(wProductServiceSpy.getProductsByWorkspaceId).toHaveBeenCalled()
  })

  it('should log error if getProductsByWorkspaceId call fails', () => {
    const errorResponse = { status: 404, statusText: 'products not found for workspace' }
    wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(console.error).toHaveBeenCalledWith('getProductsByWorkspaceId', errorResponse)
  })

  describe('searchPsProducts', () => {
    it('should loadData onChanges: searchPsProducts call success: prod deployed and only mfes', () => {
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of([product]))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [prodStoreItem] }))
      const changes = {
        ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true }
      }
      component.ngOnChanges(changes as unknown as SimpleChanges)

      expect(component.psProducts).toEqual([{ ...prodStoreItem }])
      const a: ExtendedProduct = component.wProducts.length > 0 ? component.wProducts[0] : ({} as ExtendedProduct)
      expect(a).toEqual({
        ...product,
        bucket: 'TARGET',
        undeployed: false,
        changedComponents: false
      } as ExtendedProduct)
      expect(component.psProductsOrg.get(prodStoreItem.productName!)!).toEqual({ ...prodStoreItem })
    })

    it('should loadData onChanges: searchPsProducts call success: prod deployed and only slots', () => {
      const pspItem: ExtendedProduct = {
        productName: 'pspItemName',
        displayName: 'display name',
        description: 'description',
        bucket: 'SOURCE',
        version: '1.0',
        slots: [{ name: 'slot' }],
        changedComponents: false,
        apps: new Map().set('appId', { appId: 'appId', modules: [microfrontend] })
      }
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of([product]))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [pspItem] }))
      const changes = {
        ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true }
      }
      component.ngOnChanges(changes as unknown as SimpleChanges)

      expect(component.psProducts).toEqual([{ ...pspItem }])
    })

    it('should loadData onChanges: searchPsProducts call success: prod undeployed', () => {
      prodStoreItem.productName = 'prod name'
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of([product]))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [prodStoreItem] }))
      const changes = {
        ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true }
      }
      component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]

      component.ngOnChanges(changes as unknown as SimpleChanges)

      expect(component.psProducts.length).toBe(0)
    })

    it('should loadData onChanges: searchPsProducts call error', () => {
      const errorResponse = { status: 404, statusText: 'product store products not found' }
      productServiceSpy.searchAvailableProducts.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      const changes = {
        ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true }
      }

      component.ngOnChanges(changes as unknown as SimpleChanges)

      expect(console.error).toHaveBeenCalledWith('searchAvailableProducts', errorResponse)
    })

    it('prepare product app parts: mfe type is component', () => {
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

      component['prepareProductAppParts'](psp)

      expect(psp.changedComponents).toBeTrue()
    })

    it('should handle slots and mark product as changed if undeployed or deprecated', () => {
      const psp: ExtendedProduct = {
        apps: new Map<string, any>(),
        slots: [{ undeployed: true }, { deprecated: true }]
      } as ExtendedProduct
      spyOn<any>(component, 'prepareProductAppParts').and.callThrough()

      component['prepareProductAppParts'](psp)

      expect(psp.changedComponents).toBeTrue()
    })
  })

  it('should subscribe to psProducts$', () => {
    const mockPsProducts$ = jasmine.createSpyObj('Observable', ['subscribe'])
    component.psProducts$ = mockPsProducts$

    component.onLoadPsProducts()

    expect(mockPsProducts$.subscribe).toHaveBeenCalled()
  })

  it('should subscribe to wProducts$', () => {
    const mockWProducts$ = jasmine.createSpyObj('Observable', ['subscribe'])
    component.wProducts$ = mockWProducts$

    component.onLoadWProducts()

    expect(mockWProducts$.subscribe).toHaveBeenCalled()
  })

  it('should sort products by displayName', () => {
    const products = [
      {
        id: 'prod id2',
        productName: 'prod name2',
        displayName: 'display name2'
      },
      product
    ]

    products.sort((a, b) => component.sortProductsByDisplayName(a, b))

    expect(products).toEqual([
      product,
      {
        id: 'prod id2',
        productName: 'prod name2',
        displayName: 'display name2'
      }
    ])
  })

  it('should sort products by displayName: no display name', () => {
    product.displayName = undefined
    const products = [
      {
        id: 'prod id2',
        productName: 'prod name2'
      },
      product
    ]

    products.sort((a, b) => component.sortProductsByDisplayName(a, b))

    expect(products).toEqual([
      {
        id: 'prod id2',
        productName: 'prod name2'
      },
      product
    ])
  })

  describe('sortMfesByAppId', () => {
    it('should sort mfes by appId', () => {
      const mfes = [{ appId: 'b' }, { appId: 'a' }, { appId: 'c' }]

      mfes.sort((a, b) => component.sortMfesByAppId(a, b))

      expect(mfes).toEqual([{ appId: 'a' }, { appId: 'b' }, { appId: 'c' }])
    })

    it('should sort mfes by appId: no appIds', () => {
      const mfes = [{ appId: '' }, { appId: '' }, { id: 'id a' }]

      mfes.sort((a, b) => component.sortMfesByAppId(a, b))

      expect(mfes).toEqual([{ appId: '' }, { appId: '' }, { id: 'id a' }])
    })
  })

  describe('sortMfesByExposedModule', () => {
    it('should sort mfes by exposedModule ', () => {
      const a: ExtendedMicrofrontend = {
        exposedModule: 'a'
      }
      const b: ExtendedMicrofrontend = {
        exposedModule: 'b'
      }
      const c: ExtendedMicrofrontend = {
        exposedModule: 'c'
      }
      const eMfes = [b, c, a]

      eMfes.sort((x, y) => component.sortMfesByExposedModule(x, y))

      expect(eMfes).toEqual([a, b, c])
    })

    it('should sort mfes by appId: some empty exposedModule ', () => {
      const a: ExtendedMicrofrontend = {
        exposedModule: 'a'
      }
      const b: ExtendedMicrofrontend = {
        exposedModule: ''
      }
      const c: ExtendedMicrofrontend = {
        exposedModule: ''
      }
      const eMfes = [b, c, a]

      eMfes.sort((x, y) => component.sortMfesByExposedModule(x, y))

      expect(eMfes).toEqual([b, c, a])
    })

    it('should sort mfes by appId: all empty exposedModule ', () => {
      const a: ExtendedMicrofrontend = {
        exposedModule: ''
      }
      const b: ExtendedMicrofrontend = {
        exposedModule: ''
      }
      const c: ExtendedMicrofrontend = {
        exposedModule: ''
      }
      const eMfes = [b, c, a]

      eMfes.sort((x, y) => component.sortMfesByExposedModule(x, y))

      expect(eMfes).toEqual([b, c, a])
    })

    it('should sort mfes by appId: special char exposedModule ', () => {
      const a: ExtendedMicrofrontend = {
        exposedModule: 'a'
      }
      const b: ExtendedMicrofrontend = {
        exposedModule: 'b'
      }
      const c: ExtendedMicrofrontend = {
        exposedModule: '$'
      }
      const eMfes = [b, c, a]

      eMfes.sort((x, y) => component.sortMfesByExposedModule(x, y))

      expect(eMfes).toEqual([c, a, b])
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

  /**
   * UI Events
   */
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

  it('should call fillForm when item is selected: mfe module', () => {
    component.formGroup = fb.group({
      displayName: new FormControl(''),
      baseUrl: new FormControl(''),
      modules: fb.array([])
    })
    const modules: FormArray = component.formGroup.get('modules') as FormArray
    const addMfeControl = (data: any) => {
      const formGroup = fb.group({
        id: [data.id],
        appId: [data.appId],
        basePath: [data.basePath]
      })
      modules.push(formGroup)
    }
    addMfeControl({ microfrontend })
    const psp = { items: [{ ...product, bucket: 'SOURCE' }] }
    component.displayDetails = true
    component.psProductsOrg = new Map()
    component.psProductsOrg.set(product.productName ?? '', product)

    component.onSourceSelect(psp)

    expect(component.displayDetails).toBeTrue()
  })

  it('should call fillForm when item is selected: mfe component', () => {
    component.formGroup = fb.group({
      displayName: new FormControl(''),
      baseUrl: new FormControl(''),
      modules: fb.array([])
    })
    const modules: FormArray = component.formGroup.get('modules') as FormArray
    const addMfeControl = (data: any) => {
      const formGroup = fb.group({
        id: [data.id],
        appId: [data.appId],
        basePath: [data.basePath]
      })
      modules.push(formGroup)
    }
    addMfeControl({ microfrontend })
    product.microfrontends = [microfrontendComponent]
    const event = { items: [{ ...product, bucket: 'SOURCE' }] }
    component.displayDetails = true
    component.psProductsOrg = new Map()
    component.psProductsOrg.set(product.productName ?? '', product)

    component.onSourceSelect(event)

    expect(component.displayDetails).toBeTrue()
  })

  it('should set displayDetails to false when no item is selected', () => {
    const event = { items: [] }

    component.onSourceSelect(event)

    expect(component.displayDetails).toBeFalse()
  })

  describe('onTargetSelect', () => {
    it('should call getWProduct when an item is selected: call getProductById', () => {
      const event = { items: [prodStoreItem] }
      component.displayDetails = true
      wProductServiceSpy.getProductById.and.returnValue(of(prodStoreItem))
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of([prodStoreItem]))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [prodStoreItem] }))
      const changes = {
        ['workspace']: { previousValue: 'ws0', currentValue: 'ws1', firstChange: true }
      }

      component.ngOnChanges(changes as unknown as SimpleChanges)
      component.onTargetSelect(event)

      expect(component.displayDetails).toBeTrue()
    })

    it('should call getWProduct when an item is selected: display error and hide detail panel', () => {
      const errorResponse = { status: 404, statusText: 'workspace product not found' }
      wProductServiceSpy.getProductById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      const event = { items: [{ id: 1 }] }
      component.displayDetails = true

      component.onTargetSelect(event)

      expect(component.displayDetails).toBeFalse()
      expect(console.error).toHaveBeenCalledWith('getProductById', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.LOAD_ERROR' })
    })

    it('should set displayDetails to false when no item is selected', () => {
      const event = { items: [] }

      component.onTargetSelect(event)

      expect(component.displayDetails).toBeFalse()
    })

    it('should call getWProduct when an item is selected: call getProductById forTARGET product', () => {
      const event = { items: [prodStoreItemTarget] }
      component.displayDetails = true
      wProductServiceSpy.getProductById.and.returnValue(of(prodStoreItemTarget))
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of([prodStoreItem]))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [prodStoreItem] }))
      const changes = {
        ['workspace']: {
          previousValue: 'ws0',
          currentValue: 'ws1',
          firstChange: true
        }
      }

      component.displayedDetailItem = prodStoreItemTarget

      component.ngOnChanges(changes as unknown as SimpleChanges)
      component.onTargetSelect(event)

      expect(component.displayDetails).toBeTrue()
    })
    it('should call getWProduct when an item is selected: call getProductById forTARGET product', () => {
      const event = { items: [prodStoreItemEmptyMicrofrontends] }
      component.displayDetails = true
      wProductServiceSpy.getProductById.and.returnValue(of(prodStoreItemEmptyMicrofrontends))
      wProductServiceSpy.getProductsByWorkspaceId.and.returnValue(of([prodStoreItemEmptyMicrofrontends]))
      productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [prodStoreItemEmptyMicrofrontends] }))
      const changes = {
        ['workspace']: {
          previousValue: 'ws0',
          currentValue: 'ws1',
          firstChange: true
        }
      }

      component.displayedDetailItem = prodStoreItemEmptyMicrofrontends

      component.ngOnChanges(changes as unknown as SimpleChanges)
      component.onTargetSelect(event)

      expect(component.displayDetails).toBeTrue()
      expect(component.displayedDetailItem.microfrontends).toBeUndefined()
    })
  })

  it('should access moduleControls as FormArray', () => {
    expect(component.moduleControls instanceof FormArray).toBeTruthy()
  })

  /**
   * UI Events: SAVE
   */
  it('should update a product by id', () => {
    wProductServiceSpy.updateProductById.and.returnValue(of({ resource: product }))
    const event: any = { items: [{ id: 1 }] }
    component.formGroup = fb.group({
      displayName: new FormControl(''),
      baseUrl: new FormControl(''),
      modules: fb.array([])
    })
    const modules: FormArray = component.formGroup.get('modules') as FormArray
    const addMfeControl = (data: any) => {
      const formGroup = fb.group({
        id: [data.id],
        appId: [data.appId],
        basePath: [data.basePath]
      })
      modules.push(formGroup)
    }
    addMfeControl({ microfrontend })
    component.displayedDetailItem = { ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }

    component.onProductSave(event)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_OK' })
  })

  it('should update a product by id: no ids in ws and product', () => {
    const product2: Product = {
      productName: 'prod name',
      displayName: 'display name',
      description: 'description',
      microfrontends: [microfrontend],
      modificationCount: 1
    }
    wProductServiceSpy.updateProductById.and.returnValue(of({ resource: product2 }))
    const event: any = { items: [{ id: 1 }] }
    component.formGroup = fb.group({
      displayName: new FormControl(''),
      baseUrl: new FormControl(''),
      modules: fb.array([])
    })
    component.displayedDetailItem = {
      ...product2,
      bucket: 'SOURCE',
      undeployed: false,
      changedComponents: false,
      apps: new Map()
    }
    const workspace2: Workspace = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url',
      displayName: ''
    }
    component.workspace = workspace2

    component.onProductSave(event)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_OK' })
  })

  it('should display error when trying to update a product by id', () => {
    const errorResponse = { status: 400, statusText: 'workspace product not updated' }
    wProductServiceSpy.updateProductById.and.returnValue(throwError(() => errorResponse))
    spyOn(console, 'error')
    const event: any = { items: [product] }
    component.formGroup = fb.group({
      displayName: new FormControl(''),
      baseUrl: new FormControl(''),
      modules: fb.array([])
    })
    component.displayedDetailItem = { ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }

    component.onProductSave(event)

    expect(console.error).toHaveBeenCalledWith('updateProductById', errorResponse)
    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_NOK' })
  })

  /**
   * REGISTER
   */
  describe('register a product => move from source to target picklist', () => {
    it('should createProductInWorkspace onMoveToTarget: one product', () => {
      wProductServiceSpy.createProductInWorkspace.and.returnValue(of({ resource: product }))
      const event: any = { items: [product] }
      component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]
      component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]

      component.onMoveToTarget(event)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_OK' })
    })

    it('should createProductInWorkspace onMoveToTarget: multiple products', () => {
      wProductServiceSpy.createProductInWorkspace.and.returnValue(of({ resource: product }))
      const product2: Product = {
        productName: 'prod name',
        displayName: 'display name',
        description: 'description',
        microfrontends: [microfrontend],
        modificationCount: 1
      }
      const event: any = { items: [product, product2] }
      component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]
      component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]

      component.onMoveToTarget(event)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATIONS_OK' })
    })

    it('should createProductInWorkspace onMoveToTarget: no ws id', () => {
      wProductServiceSpy.createProductInWorkspace.and.returnValue(of({ resource: product }))
      const event: any = { items: [product] }
      component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]
      component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]
      const workspace2: Workspace = {
        name: 'name',
        theme: 'theme',
        baseUrl: '/some/base/url',
        displayName: ''
      }
      component.workspace = workspace2

      component.onMoveToTarget(event)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_OK' })
    })

    it('should createProductInWorkspace onMoveToTarget: no modules', () => {
      wProductServiceSpy.createProductInWorkspace.and.returnValue(of({ resource: product }))
      component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]
      component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]
      const productNoMfes: Product = {
        id: 'prod id',
        productName: 'prod name',
        displayName: 'display name',
        description: 'description',
        modificationCount: 1
      }
      const event: any = { items: [productNoMfes] }

      component.onMoveToTarget(event)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_OK' })
    })

    it('should createProductInWorkspace onMoveToTarget: one mfe', () => {
      const product: Product = {
        id: 'prod id',
        productName: 'prod name',
        displayName: 'display name',
        description: 'description',
        microfrontends: [microfrontend],
        modificationCount: 1
      }
      wProductServiceSpy.createProductInWorkspace.and.returnValue(of({ resource: product }))
      component.wProducts = [
        { ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false, apps: new Map() }
      ]
      component.psProducts = [
        { ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false, apps: new Map() }
      ]
      const event: any = { items: [product] }

      component.onMoveToTarget(event)

      expect(component.workspace).toEqual(workspace)
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_OK' })
    })

    it('should createProductInWorkspace onMoveToTarget: multiple mfes', () => {
      const microfrontend2: Microfrontend = {
        id: 'id2',
        appId: 'appId2',
        basePath: 'path2',
        type: MicrofrontendType.Module
      }
      const product2: Product = {
        id: 'prod id',
        productName: 'prod name',
        displayName: 'display name',
        description: 'description',
        microfrontends: [microfrontend, microfrontend2],
        modificationCount: 1
      }
      wProductServiceSpy.createProductInWorkspace.and.returnValue(of({ resource: product2 }))
      component.wProducts = [
        { ...product2, bucket: 'SOURCE', undeployed: false, changedComponents: false, apps: new Map() }
      ]
      component.psProducts = [
        { ...product2, bucket: 'SOURCE', undeployed: false, changedComponents: false, apps: new Map() }
      ]
      const event: any = { items: [product2] }

      component.onMoveToTarget(event)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_OK' })
    })

    it('should display error when trying to createProductInWorkspace onMoveToTarget', () => {
      const errorResponse = { status: 400, statusText: 'workspace product not created' }
      wProductServiceSpy.createProductInWorkspace.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      const event: any = { items: [product] }
      component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]
      component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]

      component.onMoveToTarget(event)

      expect(console.error).toHaveBeenCalledWith('createProductInWorkspace', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_NOK' })
    })

    it('should display error when trying to createProductInWorkspace onMoveToTarget', () => {
      const errorResponse = { status: 400, statusText: 'workspace product not created' }
      wProductServiceSpy.createProductInWorkspace.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]
      component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]
      const product2: Product = {
        productName: 'prod name',
        displayName: 'display name',
        description: 'description',
        microfrontends: [microfrontend],
        modificationCount: 1
      }
      const event: any = { items: [product, product2] }

      component.onMoveToTarget(event)

      expect(console.error).toHaveBeenCalledWith('createProductInWorkspace', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATIONS_NOK' })
    })
  })

  describe('deregister a product', () => {
    it('should deleteProductById onMoveToSource', () => {
      const event: any = { items: [product] }
      component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]
      component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]

      component.onMoveToSource(event)

      expect(component.displayDeregisterConfirmation).toBeTrue()
    })

    it('should restore items on deregister cancellation', () => {
      component['deregisterItems'] = [product]
      component.displayDeregisterConfirmation = true
      component.psProducts = [prodStoreItem]
      component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedComponents: false }]

      component.onDeregisterCancellation()

      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(component['deregisterItems']).toEqual([])
    })

    it('should handle successful deregistration', () => {
      component['deregisterItems'] = [product]
      component.psProducts = [prodStoreItem]
      spyOn(component as any, 'displayRegisterMessages')

      component.onDeregisterConfirmation()

      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(wProductServiceSpy.deleteProductById).toHaveBeenCalledWith({
        id: 'id',
        productId: 'prod id'
      })
      expect(component.psProducts[0].bucket).toBe('SOURCE')
    })

    it('should handle failed deregistration', () => {
      const errorResponse = { status: 400, statusText: 'workspace product could not be deregistered' }
      wProductServiceSpy.deleteProductById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component['deregisterItems'] = [product]
      component.psProducts = [prodStoreItem]
      component.wProducts = []
      spyOn(component as any, 'displayRegisterMessages')

      component.onDeregisterConfirmation()

      expect(console.error).toHaveBeenCalledWith('deleteProductById', errorResponse)
      expect(component.displayDeregisterConfirmation).toBeFalse()
      expect(wProductServiceSpy.deleteProductById).toHaveBeenCalledWith({ id: 'id', productId: 'prod id' })
      expect(component.psProducts.length).toBe(0)
      expect(component.wProducts.length).toBe(1)
      expect(component.wProducts[0].productName).toBe('prod name')
    })
  })

  /**
   * UI Events: ADD slot
   */
  describe('slot creation', () => {
    it('should handle successful slot creation', () => {
      const extendedSlot: ExtendedSlot = { name: 'Test Slot' }

      component.onAddSlot({}, extendedSlot)

      expect(slotApiServiceSpy.createSlot).toHaveBeenCalledWith({
        createSlotRequest: { workspaceId: '', name: extendedSlot.name }
      })
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.SLOT.MESSAGES.CREATE_OK' })
      expect(msgServiceSpy.error).not.toHaveBeenCalled()
    })

    it('should handle failed slot creation', () => {
      const errorResponse = { status: 400, statusText: 'workspace slot could not be created' }
      slotApiServiceSpy.createSlot.and.returnValue(throwError(() => errorResponse))
      const extendedSlot: ExtendedSlot = { name: 'Test Slot' }

      component.onAddSlot({}, extendedSlot)

      expect(slotApiServiceSpy.createSlot).toHaveBeenCalledWith({
        createSlotRequest: { workspaceId: '', name: extendedSlot.name }
      })
      expect(msgServiceSpy.success).not.toHaveBeenCalled()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.SLOT.MESSAGES.CREATE_NOK' })
    })
  })

  describe('on go to other pages', () => {
    it('should follow link to current product detail in product store', () => {
      spyOn(utils, 'goToEndpoint')

      component.onGoToProduct('name')

      expect(utils.goToEndpoint).toHaveBeenCalled()
    })

    it('should follow link to current product detail in permission UI', () => {
      spyOn(utils, 'goToEndpoint')

      component.onGoToProductPermission('name')

      expect(utils.goToEndpoint).toHaveBeenCalled()
    })
  })
})
