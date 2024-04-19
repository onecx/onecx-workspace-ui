import { NO_ERRORS_SCHEMA, Renderer2, SimpleChanges } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { ActivatedRoute } from '@angular/router'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { RouterTestingModule } from '@angular/router/testing'
import { ReactiveFormsModule, FormBuilder, FormArray, FormControl } from '@angular/forms'

import { MfeInfo, PortalMessageService, AppStateService } from '@onecx/portal-integration-angular'
import {
  Product,
  WorkspaceProductAPIService,
  ProductsAPIService,
  Workspace,
  ProductStoreItem,
  Microfrontend
} from 'src/app/shared/generated'

import { ExtendedProduct, ProductComponent } from './products.component'

const workspace: Workspace = {
  id: 'id',
  name: 'name',
  theme: 'theme',
  baseUrl: '/some/base/url'
}

const microfrontend: Microfrontend = {
  id: 'id',
  appId: 'appId',
  basePath: 'path'
}

const product: ExtendedProduct = {
  id: 'prod id',
  productName: 'prod name',
  displayName: 'display name',
  description: 'description',
  microfrontends: [microfrontend],
  modificationCount: 1,
  bucket: 'SOURCE',
  undeployed: false,
  changedMfe: false
}

const prodStoreItem: ProductStoreItem = {
  productName: 'prodStoreItemName'
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
    getProductsForWorkspaceId: jasmine.createSpy('getProductsForWorkspaceId').and.returnValue(of({})),
    getProductById: jasmine.createSpy('getProductById').and.returnValue(of({})),
    updateProductById: jasmine.createSpy('updateProductById').and.returnValue(of({})),
    createProductInWorkspace: jasmine.createSpy('createProductInWorkspace').and.returnValue(of({})),
    deleteProductById: jasmine.createSpy('deleteProductById').and.returnValue(of({}))
  }
  const productServiceSpy = {
    searchAvailableProducts: jasmine.createSpy('searchAvailableProducts').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    mockAppState = { currentMfe$: of(mfeInfo) }
    TestBed.configureTestingModule({
      declarations: [ProductComponent],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceProductAPIService, useValue: wProductServiceSpy },
        { provide: ProductsAPIService, useValue: productServiceSpy },
        { provide: AppStateService, useValue: mockAppState }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    wProductServiceSpy.getProductsForWorkspaceId.calls.reset()
    wProductServiceSpy.getProductById.calls.reset()
    wProductServiceSpy.updateProductById.calls.reset()
    wProductServiceSpy.createProductInWorkspace.calls.reset()
    wProductServiceSpy.deleteProductById.calls.reset()
    productServiceSpy.searchAvailableProducts.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductComponent)
    mockRenderer = jasmine.createSpyObj('Renderer2', ['addClass', 'removeClass'])
    component = fixture.componentInstance
    component.workspace = workspace
    fb = TestBed.inject(FormBuilder)
    component['renderer'] = mockRenderer
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should set currentMfe', () => {
    expect(component.currentMfe).toEqual(mfeInfo)
  })

  it('should loadData onChanges: with and without ws id', () => {
    wProductServiceSpy.getProductsForWorkspaceId.and.returnValue(of([product]))
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(wProductServiceSpy.getProductsForWorkspaceId).toHaveBeenCalled()
    expect(productServiceSpy.searchAvailableProducts).toHaveBeenCalled()

    const workspace2: Workspace = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url'
    }
    component.workspace = workspace2

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(wProductServiceSpy.getProductsForWorkspaceId).toHaveBeenCalled()
  })

  it('should log error if getProductsForWorkspaceId call fails', () => {
    const err = {
      status: '404'
    }
    wProductServiceSpy.getProductsForWorkspaceId.and.returnValue(throwError(() => err))
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    spyOn(console, 'error')

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(console.error).toHaveBeenCalledWith('getProductsForWorkspaceId():', err)
  })

  it('should loadData onChanges: searchPsProducts call success', () => {
    wProductServiceSpy.getProductsForWorkspaceId.and.returnValue(of([product]))
    productServiceSpy.searchAvailableProducts.and.returnValue(of({ stream: [prodStoreItem] }))
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(component.psProducts).toEqual([
      {
        ...prodStoreItem,
        bucket: 'SOURCE',
        undeployed: false,
        changedMfe: false
      }
    ])
  })

  it('should loadData onChanges: searchPsProducts call error', () => {
    const err = {
      status: '404'
    }
    productServiceSpy.searchAvailableProducts.and.returnValue(throwError(() => err))
    const changes = {
      ['workspace']: {
        previousValue: 'ws0',
        currentValue: 'ws1',
        firstChange: true
      }
    }
    spyOn(console, 'error')

    component.ngOnChanges(changes as unknown as SimpleChanges)

    expect(console.error).toHaveBeenCalledWith('searchAvailableProducts():', err)
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

  it('should return imageUrl path', () => {
    const result = component.getImageUrl('/url')

    expect(result).toBe('/url')
  })

  it('should return fallback imageUrl', () => {
    const mfe = {
      mountPath: 'mount',
      remoteBaseUrl: 'baseUrl',
      baseHref: 'href',
      shellName: 'shell',
      appId: 'appId',
      productName: 'prodName'
    }
    component.currentMfe = mfe
    const result = component.getImageUrl()

    expect(result).toBe('baseUrl/assets/images/product.jpg')
  })

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

  it('should call fillForm when item is selected', () => {
    component.formGroup = fb.group({
      productName: new FormControl(''),
      displayName: new FormControl(''),
      description: new FormControl(''),
      baseUrl: new FormControl(''),
      mfes: fb.array([])
    })
    const mfes: FormArray = component.formGroup.get('mfes') as FormArray
    const addMfeControl = (data: any) => {
      const formGroup = fb.group({
        id: [data.id],
        appId: [data.appId],
        basePath: [data.basePath]
      })
      mfes.push(formGroup)
    }
    addMfeControl({ microfrontend })
    const event = { items: [{ ...product, bucket: 'SOURCE' }] }
    component.displayDetails = true

    component.onSourceSelect(event)

    expect(component.displayDetails).toBeTrue()
  })

  it('should set displayDetails to false when no item is selected', () => {
    const event = { items: [] }

    component.onSourceSelect(event)

    expect(component.displayDetails).toBeFalse()
  })

  it('should call getWProduct when an item is selected: call getProductById', () => {
    const event = { items: [{ id: 1 }] }
    component.displayDetails = true

    component.onTargetSelect(event)

    expect(component.displayDetails).toBeTrue()
  })

  it('should call getWProduct when an item is selected: display error', () => {
    wProductServiceSpy.getProductById.and.returnValue(throwError(() => new Error()))
    const event = { items: [{ id: 1 }] }
    component.displayDetails = true

    component.onTargetSelect(event)

    expect(component.displayDetails).toBeTrue()
  })

  it('should set displayDetails to false when no item is selected', () => {
    const event = { items: [] }

    component.onTargetSelect(event)

    expect(component.displayDetails).toBeFalse()
  })

  it('should access mfeControls as FormArray', () => {
    expect(component.mfeControls instanceof FormArray).toBeTruthy()
  })

  it('should update a product by id', () => {
    wProductServiceSpy.updateProductById.and.returnValue(of({ resource: product }))
    const event: any = { items: [{ id: 1 }] }
    component.formGroup = fb.group({
      productName: new FormControl(''),
      displayName: new FormControl(''),
      description: new FormControl(''),
      baseUrl: new FormControl(''),
      mfes: fb.array([])
    })
    const mfes: FormArray = component.formGroup.get('mfes') as FormArray
    const addMfeControl = (data: any) => {
      const formGroup = fb.group({
        id: [data.id],
        appId: [data.appId],
        basePath: [data.basePath]
      })
      mfes.push(formGroup)
    }
    addMfeControl({ microfrontend })
    component.displayedDetailItem = { ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }

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
      productName: new FormControl(''),
      displayName: new FormControl(''),
      description: new FormControl(''),
      baseUrl: new FormControl(''),
      mfes: fb.array([])
    })
    component.displayedDetailItem = { ...product2, bucket: 'SOURCE', undeployed: false, changedMfe: false }
    const workspace2: Workspace = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url'
    }
    component.workspace = workspace2

    component.onProductSave(event)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_OK' })
  })

  it('should display error when trying to update a product by id', () => {
    wProductServiceSpy.updateProductById.and.returnValue(throwError(() => new Error()))
    const event: any = { items: [product] }
    component.formGroup = fb.group({
      productName: new FormControl(''),
      displayName: new FormControl(''),
      description: new FormControl(''),
      baseUrl: new FormControl(''),
      mfes: fb.array([])
    })
    component.displayedDetailItem = { ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }

    component.onProductSave(event)

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_NOK' })
  })

  it('should createProductInWorkspace onMoveToTarget: one product', () => {
    wProductServiceSpy.createProductInWorkspace.and.returnValue(of({ resource: product }))
    const event: any = { items: [product] }
    component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]

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
    component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]

    component.onMoveToTarget(event)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATIONS_OK' })
  })

  it('should createProductInWorkspace onMoveToTarget: no ws id', () => {
    wProductServiceSpy.createProductInWorkspace.and.returnValue(of({ resource: product }))
    const event: any = { items: [product] }
    component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    const workspace2: Workspace = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url'
    }
    component.workspace = workspace2

    component.onMoveToTarget(event)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_OK' })
  })

  it('should createProductInWorkspace onMoveToTarget: no mfes', () => {
    wProductServiceSpy.createProductInWorkspace.and.returnValue(of({ resource: product }))
    component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
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

  it('should createProductInWorkspace onMoveToTarget: multiple mfes', () => {
    const microfrontend2: Microfrontend = {
      id: 'id',
      appId: 'appId',
      basePath: 'path'
    }
    const productMfes: Product = {
      id: 'prod id',
      productName: 'prod name',
      displayName: 'display name',
      description: 'description',
      microfrontends: [microfrontend, microfrontend2],
      modificationCount: 1
    }
    wProductServiceSpy.createProductInWorkspace.and.returnValue(of({ resource: productMfes }))
    component.wProducts = [{ ...productMfes, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    component.psProducts = [{ ...productMfes, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    const event: any = { items: [productMfes] }

    component.onMoveToTarget(event)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_OK' })
  })

  it('should display error when trying to createProductInWorkspace onMoveToTarget', () => {
    wProductServiceSpy.createProductInWorkspace.and.returnValue(throwError(() => new Error()))
    const event: any = { items: [product] }
    component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]

    component.onMoveToTarget(event)

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATION_NOK' })
  })

  it('should display error when trying to createProductInWorkspace onMoveToTarget', () => {
    wProductServiceSpy.createProductInWorkspace.and.returnValue(throwError(() => new Error()))
    component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    const product2: Product = {
      productName: 'prod name',
      displayName: 'display name',
      description: 'description',
      microfrontends: [microfrontend],
      modificationCount: 1
    }
    const event: any = { items: [product, product2] }

    component.onMoveToTarget(event)

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.REGISTRATIONS_NOK' })
  })

  it('should deleteProductById onMoveToSource', () => {
    wProductServiceSpy.deleteProductById.and.returnValue(of({ resource: product }))
    const event: any = { items: [product] }
    component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]

    component.onMoveToSource(event)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.DEREGISTRATION_OK' })
  })

  it('should deleteProductById onMoveToSource: no ws id', () => {
    wProductServiceSpy.deleteProductById.and.returnValue(of({ resource: product }))
    const event: any = { items: [product] }
    component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    const workspace2: Workspace = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url'
    }
    component.workspace = workspace2

    component.onMoveToSource(event)

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.DEREGISTRATION_OK' })
  })

  it('should deleteProductById onMoveToSource', () => {
    wProductServiceSpy.deleteProductById.and.returnValue(throwError(() => new Error()))
    const event: any = { items: [product] }
    component.wProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]
    component.psProducts = [{ ...product, bucket: 'SOURCE', undeployed: false, changedMfe: false }]

    component.onMoveToSource(event)

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.DEREGISTRATION_NOK' })
  })
})
