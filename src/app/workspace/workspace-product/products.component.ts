import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Renderer2,
  Input,
  Output,
  OnDestroy,
  OnChanges,
  SimpleChanges
} from '@angular/core'
import { Router } from '@angular/router'
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms'
import { catchError, finalize, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs'
import { TranslateService } from '@ngx-translate/core'

import { MfeInfo } from '@onecx/portal-integration-angular'
import {
  AppStateService,
  PortalMessageService,
  UserService,
  WorkspaceService
} from '@onecx/angular-integration-interface'

import {
  CreateSlot,
  CreateSlotRequest,
  ImagesInternalAPIService,
  Microfrontend,
  MicrofrontendType,
  GetProductByIdRequestParams,
  CreateProductRequest,
  UpdateProductRequest,
  Product,
  ProductAPIService,
  SlotPS,
  SlotAPIService,
  Workspace,
  WorkspaceProductAPIService,
  UIEndpoint
} from 'src/app/shared/generated'

import { environment } from 'src/environments/environment'
import { bffProductImageUrl, goToEndpoint, limitText, prepareUrlPath } from 'src/app/shared/utils'

export type ExtendedMicrofrontend = Microfrontend & {
  exposedModule?: string // MicrofrontendPS
}
export type AppType = {
  appId: string
  modules?: ExtendedMicrofrontend[]
  components?: ExtendedMicrofrontend[]
}
export type ExtendedSlot = SlotPS & { new?: boolean }
// combine Workspace Product with properties from product store (ProductStoreItem)
// => bucket is used to recognize the origin within HTML
export type ExtendedProduct = Product & {
  bucket: 'SOURCE' | 'TARGET' // target: workspace product = registered
  changedComponents: boolean // true if there is a MFE with deprecated or undeployed
  apps: Map<string, AppType> // key: appId
  slots?: Array<ExtendedSlot> // from ProductStoreItem
}
interface ViewingModes {
  icon: string
  mode: string
  titleKey?: string
}
const ALL_VIEW_MODES = [
  { icon: 'pi pi-list', mode: 'list', titleKey: 'DIALOG.DATAVIEW.VIEW_MODE_LIST' },
  { icon: 'pi pi-th-large', mode: 'grid', titleKey: 'DIALOG.DATAVIEW.VIEW_MODE_GRID' }
]

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductComponent implements OnChanges, OnDestroy, AfterViewInit {
  @Input() workspace!: Workspace | undefined
  @Output() changed = new EventEmitter()

  private readonly destroy$ = new Subject()
  public exceptionKey: string | undefined = undefined
  public psLoading = false
  public wpLoading = false
  public editMode = false
  public hasRegisterPermission = false
  public displayDetails = false
  public displayedDetailItem: ExtendedProduct | undefined = undefined
  public formGroup: FormGroup
  public sourceFilterValue: string | undefined // product store
  public targetFilterValue: string | undefined // workspace
  public sourceList!: HTMLElement | null
  public targetList!: HTMLElement | null
  public sourceListViewMode: ViewingModes | undefined
  public targetListViewMode: ViewingModes | undefined
  public viewingModes: ViewingModes[] = []
  public displayDeregisterConfirmation = false
  private deregisterItems: ExtendedProduct[] = []

  limitText = limitText
  environment = environment
  prepareUrlPath = prepareUrlPath

  // data
  public wProducts$!: Observable<ExtendedProduct[]>
  public wProducts: ExtendedProduct[] = [] // registered products
  public psProducts: ExtendedProduct[] = [] // not registered product store products
  public psProducts$!: Observable<ExtendedProduct[]>
  public psProductsOrg!: Map<string, ExtendedProduct> // all products in product store (not undeployed)
  public currentMfe!: MfeInfo

  constructor(
    private readonly router: Router,
    private readonly workspaceService: WorkspaceService,
    private readonly wProductApi: WorkspaceProductAPIService,
    private readonly psProductApi: ProductAPIService,
    private readonly imageApi: ImagesInternalAPIService,
    private readonly slotApi: SlotAPIService,
    private readonly user: UserService,
    private readonly appState: AppStateService,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService,
    private readonly fb: FormBuilder,
    private readonly elem: ElementRef,
    public renderer: Renderer2
  ) {
    this.hasRegisterPermission = this.user.hasPermission('WORKSPACE_PRODUCTS#REGISTER')
    this.appState.currentMfe$.pipe(map((mfe) => (this.currentMfe = mfe))).subscribe()
    this.formGroup = this.fb.group({
      displayName: new FormControl({ value: null, disabled: true }),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(200)]),
      modules: this.fb.array(['a', 'b'])
    })
    this.viewingModes = ALL_VIEW_MODES
    this.sourceListViewMode = this.viewingModes.find((v) => v.mode === 'list')
    this.targetListViewMode = this.viewingModes.find((v) => v.mode === 'list')
  }

  public ngAfterViewInit() {
    this.sourceList = (<HTMLElement>this.elem.nativeElement).querySelector('.p-picklist-list.p-picklist-source')
    this.targetList = (<HTMLElement>this.elem.nativeElement).querySelector('.p-picklist-list.p-picklist-target')
  }
  public ngOnChanges(changes: SimpleChanges): void {
    if (this.workspace && changes['workspace']) this.loadData()
  }
  public ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }

  public loadData(): void {
    this.exceptionKey = undefined
    this.onHideItemDetails()
    this.searchPsProducts()
    this.searchWProducts()
    this.wProducts$
      .pipe(
        switchMap((wProducts) => {
          return this.psProducts$
        })
      )
      .subscribe()
  }

  public onLoadPsProducts(): void {
    this.onHideItemDetails()
    this.psProducts$.subscribe()
  }
  public onLoadWProducts(): void {
    this.onHideItemDetails()
    this.wProducts$.subscribe()
  }
  private searchWProducts(): void {
    this.wpLoading = true
    this.wProducts$ = this.wProductApi
      .getProductsByWorkspaceId({ id: this.workspace?.id ?? '' })
      .pipe(
        map((products) => {
          this.wProducts = []
          for (const p of products) this.wProducts.push({ ...p, bucket: 'TARGET' } as ExtendedProduct)
          return this.wProducts.sort(this.sortProductsByDisplayName)
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
          console.error('getProductsByWorkspaceId', err)
          return of([] as ExtendedProduct[])
        }),
        finalize(() => (this.wpLoading = false))
      )
      .pipe(takeUntil(this.destroy$))
  }

  /**
   * GET all (!) Product Store products (which are not yet registered)
   */
  private searchPsProducts(): void {
    this.psLoading = true
    this.psProducts$ = this.psProductApi
      .searchAvailableProducts({ productStoreSearchCriteria: {} })
      .pipe(
        map((result) => {
          // filter: return psProducts which are not yet registered
          this.psProducts = []
          this.psProductsOrg = new Map()
          if (result.stream)
            for (const p of result.stream) {
              const psp = { ...p, bucket: 'SOURCE', changedComponents: false } as ExtendedProduct
              this.prepareProductApps(psp)
              this.psProductsOrg.set(psp.productName!, psp)
              // add product to SOURCE picklist only if not yet registered
              const wp = this.wProducts.filter((wp) => wp.productName === psp.productName)
              if (wp.length === 0 && !psp.undeployed) this.psProducts.push(psp)
              if (wp.length === 1) {
                wp[0].changedComponents = psp.changedComponents
                wp[0].undeployed = psp.undeployed
              }
            }
          return this.psProducts.sort(this.sortProductsByDisplayName)
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
          console.error('searchAvailableProducts', err)
          return of([] as ExtendedProduct[])
        }),
        finalize(() => (this.psLoading = false))
      )
      .pipe(takeUntil(this.destroy$))
  }

  // build map of apps, which containing modules and components
  private prepareProductApps(psp: ExtendedProduct): void {
    if (psp.microfrontends) {
      psp.apps = new Map()
      psp.microfrontends.forEach((mfe) => {
        if (mfe.appId && !psp.apps.has(mfe.appId)) psp.apps.set(mfe.appId, { appId: mfe.appId })
      })
    }
    if (psp.microfrontends || psp.slots) this.prepareProductAppParts(psp)
  }
  private prepareProductAppPart(mfe: Microfrontend, psp: ExtendedProduct): void {
    const app = psp.apps.get(mfe.appId!)
    if (app && mfe.type === MicrofrontendType.Module) {
      if (!app.modules) app.modules = []
      app.modules.push(mfe as ExtendedMicrofrontend)
    }
    if (app && mfe.type === MicrofrontendType.Component) {
      if (!app.components) app.components = []
      app.components.push(mfe as ExtendedMicrofrontend)
      app.components.sort(this.sortMfesByExposedModule)
    }
  }
  private prepareProductAppParts(psp: ExtendedProduct) {
    // step through mfe array and pick modules and components
    if (psp.microfrontends)
      for (const mfe of psp.microfrontends) {
        this.prepareProductAppPart(mfe, psp)
        // mark product if there are important changes on microfrontends
        psp.changedComponents = mfe.undeployed || mfe.deprecated || psp.changedComponents
      }
    if (psp.slots)
      for (const slot of psp.slots) {
        psp.changedComponents = slot.undeployed || slot.deprecated || psp.changedComponents
      }
  }

  public sortProductsByDisplayName(a: Product, b: Product): number {
    return (a.displayName ? a.displayName.toUpperCase() : '').localeCompare(
      b.displayName ? b.displayName.toUpperCase() : ''
    )
  }
  public sortMfesByAppId(a: Microfrontend, b: Microfrontend): number {
    return (a.appId ? a.appId.toUpperCase() : '').localeCompare(b.appId ? b.appId.toUpperCase() : '')
  }
  public sortMfesByExposedModule(a: ExtendedMicrofrontend, b: ExtendedMicrofrontend): number {
    return (a.exposedModule ? a.exposedModule.toUpperCase() : '').localeCompare(
      b.exposedModule ? b.exposedModule.toUpperCase() : ''
    )
  }
  public sortSlotsByName(a: SlotPS, b: SlotPS): number {
    return (a.name ? a.name.toUpperCase() : '').localeCompare(b.name ? b.name.toUpperCase() : '')
  }

  public getImageUrl(product?: ExtendedProduct): string | undefined {
    if (!product) return undefined
    if (product.imageUrl && product.imageUrl != '') {
      return product.imageUrl
    }
    return bffProductImageUrl(this.imageApi.configuration.basePath, product.productName)
  }

  /**
   * UI Events
   */
  public getFilterValue(ev: any): string {
    return ev.target.value
  }
  public onHideItemDetails() {
    this.displayDetails = false
    this.displayedDetailItem = undefined
  }
  public onSourceViewModeChange(ev: { icon: string; mode: string }): void {
    this.sourceListViewMode = this.viewingModes.find((v) => v.mode === ev.mode)
    if (ev.mode === 'grid') this.renderer.addClass(this.sourceList, 'tile-view')
    if (ev.mode === 'list') this.renderer.removeClass(this.sourceList, 'tile-view')
  }
  public onTargetViewModeChange(ev: { icon: string; mode: string }): void {
    this.targetListViewMode = this.viewingModes.find((v) => v.mode === ev.mode)
    if (ev.mode === 'grid') this.renderer.addClass(this.targetList, 'tile-view')
    if (ev.mode === 'list') this.renderer.removeClass(this.targetList, 'tile-view')
  }

  /**
   * UI Events: DETAIL
   */
  return(event: any) {
    event.stopPropagation()
  }
  public onSourceSelect(ev: any): void {
    if (ev.items[0] && this.psProductsOrg.has(ev.items[0].productName)) {
      const pspOrg = this.psProductsOrg.get(ev.items[0].productName)
      if (pspOrg) this.fillForm(pspOrg)
    } else this.onHideItemDetails()
  }
  public onTargetSelect(ev: any): void {
    if (ev.items[0]) this.getWProduct(ev.items[0])
    else this.onHideItemDetails()
  }

  private getWProduct(wProduct: ExtendedProduct) {
    this.wProductApi
      .getProductById({ id: this.workspace?.id, productId: wProduct.id } as GetProductByIdRequestParams)
      .subscribe({
        next: (data) => {
          const item = data as ExtendedProduct
          item.bucket = wProduct.bucket
          item.microfrontends?.sort(this.sortMfesByAppId)
          this.prepareWProduct(item)
          this.fillForm(item)
        },
        error: (err) => {
          this.displayedDetailItem = undefined
          this.displayDetails = false
          console.error('getProductById', err)
          this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.LOAD_ERROR' })
        },
        complete() {}
      })
  }

  // enrich workspace product with info from product store
  private prepareWProduct(item: ExtendedProduct) {
    if (this.psProductsOrg.has(item.productName!)) {
      const pspOrg = this.psProductsOrg.get(item.productName!)
      if (pspOrg) {
        item.undeployed = pspOrg.undeployed
        item.changedComponents = pspOrg.changedComponents
        item.slots = pspOrg.slots
        item.apps = pspOrg.apps
        if (item.microfrontends && pspOrg.microfrontends) {
          this.syncMfeState(item.microfrontends, pspOrg.microfrontends)
        }
      }
    }
  }
  private syncMfeState(itemMfes: Microfrontend[], pspOrgMfes: Microfrontend[]): void {
    for (const iMfe of itemMfes)
      if (iMfe.type === MicrofrontendType.Module)
        for (const mfe of pspOrgMfes) {
          // the workspace knows only one module
          if (mfe.appId === iMfe.appId && mfe.type === MicrofrontendType.Module) {
            iMfe.deprecated = mfe.deprecated
            iMfe.undeployed = mfe.undeployed
          }
        }
  }

  private fillForm(item: ExtendedProduct) {
    this.displayedDetailItem = item
    this.displayedDetailItem.slots?.sort(this.sortSlotsByName)
    this.formGroup.controls['displayName'].setValue(this.displayedDetailItem.displayName)
    this.formGroup.controls['baseUrl'].setValue(this.displayedDetailItem.baseUrl)
    // build a dynamic form array for all microfrontend modules for a TARGET product
    if (item.bucket === 'TARGET') {
      const modules = this.formGroup.get('modules') as FormArray
      while (modules.length > 0) modules.removeAt(0) // clear form
      if (this.displayedDetailItem.microfrontends) {
        if (this.displayedDetailItem.microfrontends.length === 0) {
          this.displayedDetailItem.microfrontends = undefined
        }
        this.prepareFormForModulesAndComponents(this.displayedDetailItem, modules)
      }
    }
    this.displayDetails = true
  }
  private prepareFormForModulesAndComponents(item: ExtendedProduct, modules: FormArray): void {
    if (!item || !item.microfrontends) return
    item.microfrontends?.forEach((mfe, i) => {
      const psMfeModule = this.getProductStoreMfeData(item, mfe.appId!)
      modules.push(
        this.fb.group({
          id: new FormControl(null),
          appId: new FormControl(null),
          basePath: new FormControl(null, [Validators.required, Validators.maxLength(255)]),
          deprecated: new FormControl(null),
          undeployed: new FormControl(null),
          exposedModule: new FormControl(null),
          endpoints: new FormControl(null)
        })
      )
      modules.at(i).patchValue({
        id: mfe.id,
        appId: mfe.appId,
        basePath: mfe.basePath,
        deprecated: psMfeModule?.deprecated,
        undeployed: psMfeModule?.undeployed,
        exposedModule: psMfeModule?.exposedModule,
        endpoints: mfe.endpoints?.sort(this.sortEndpointsByName)
      })
    })
  }
  private sortEndpointsByName(a: UIEndpoint, b: UIEndpoint): number {
    return (a.name ? a.name.toUpperCase() : '').localeCompare(b.name ? b.name.toUpperCase() : '')
  }

  private getProductStoreMfeData(item: ExtendedProduct, appId: string): ExtendedMicrofrontend | undefined {
    let module: ExtendedMicrofrontend | undefined
    if (item.apps.has(appId)) {
      const a = item.apps.get(appId)
      module = a?.modules ? a.modules[0] : undefined
    }
    return module
  }

  private clearForm() {
    this.onHideItemDetails()
    this.formGroup.reset()
  }
  get moduleControls(): any {
    return this.formGroup.get('modules') as FormArray
  }

  /**
   * UI Events: SAVE
   */
  public onProductSave(ev: any): void {
    this.editMode = false
    if (this.formGroup.valid && this.displayedDetailItem) {
      this.displayedDetailItem.baseUrl = this.formGroup.controls['baseUrl'].value
      this.displayedDetailItem.microfrontends = [] // clear
      const modules = this.formGroup.get('modules') as FormArray
      modules.controls.forEach((item) => {
        this.displayedDetailItem?.microfrontends?.push(item.value)
      })
      this.wProductApi
        .updateProductById({
          id: this.workspace?.id ?? '',
          productId: this.displayedDetailItem.id ?? '',
          updateProductRequest: {
            modificationCount: this.displayedDetailItem.modificationCount,
            baseUrl: this.displayedDetailItem.baseUrl,
            microfrontends: this.displayedDetailItem.microfrontends?.map((m) => ({
              appId: m.appId,
              basePath: m.basePath
            }))
          } as UpdateProductRequest
        })
        .subscribe({
          next: (data) => {
            if (this.displayedDetailItem) this.displayedDetailItem.modificationCount = data.resource.modificationCount
            this.msgService.success({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_OK' })
          },
          error: (err) => {
            console.error('updateProductById', err)
            this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_NOK' })
          },
          complete() {}
        })
    }
  }

  /**
   * REGISTER
   *
   * This event fires after the items were moved from source to target => PrimeNG
   * Afterwards, Step through the list and on each error roll back the move.
   */
  private prepareMfePaths(mfes: any): any[] | undefined {
    return mfes.length === 0
      ? undefined
      : mfes.map((m: any, i: number) => ({
          appId: m.appId,
          basePath: '/' + (mfes.length > 1 ? i + 1 : '') // create initial unique base paths
        }))
  }

  public onMoveToTarget(ev: any): void {
    this.clearForm()
    const itemCount = ev.items.length
    let successCounter = 0
    let errorCounter = 0
    for (const p of ev.items) {
      // register modules only
      const mfes = p.microfrontends?.filter((m: Microfrontend) => m.type === MicrofrontendType.Module) ?? []
      if (this.workspace) {
        this.wProductApi
          .createProductInWorkspace({
            id: this.workspace.id!,
            createProductRequest: {
              productName: p.productName,
              baseUrl: p.baseUrl,
              microfrontends: this.prepareMfePaths(mfes),
              slots: p.slots
                ? p.slots.filter((s: SlotPS) => !s.undeployed).map((s: SlotPS) => ({ name: s.name }) as CreateSlot)
                : undefined
            } as CreateProductRequest
          })
          .subscribe({
            next: (data) => {
              successCounter++
              // update id of the workspace item to be used on select
              const wp = this.wProducts.filter((wp) => wp.productName === p.productName)[0]
              wp.id = data.resource.id
              wp.bucket = 'TARGET'
              this.changed.emit()
              if (itemCount === successCounter + errorCounter)
                this.displayRegisterMessages('REGISTRATION', successCounter, errorCounter)
            },
            error: (err) => {
              console.error('createProductInWorkspace', err)
              errorCounter++
              // Revert change: remove item in target + add item in source list
              this.wProducts = this.wProducts.filter((wp) => wp.productName !== p.productName)
              this.psProducts.push(p)
              if (itemCount === successCounter + errorCounter)
                this.displayRegisterMessages('REGISTRATION', successCounter, errorCounter)
            }
          })
      }
    }
  }

  /**
   * DEREGISTER
   *
   * This event fires after the items were moved from source to target => PrimeNG
   * Afterwards, ask for confirmation:
   *   accepted: delete product from workspace, on each error roll back the moved item
   *   rejected: roll back the moved items
   */
  public onMoveToSource(event: any): void {
    this.deregisterItems = [...event.items]
    this.displayDeregisterConfirmation = true
  }
  public onDeregisterCancellation() {
    this.displayDeregisterConfirmation = false
    // restore
    for (const p of this.deregisterItems) {
      this.psProducts = this.psProducts.filter((psp) => psp.productName !== p.productName)
      this.wProducts.push(p)
    }
    this.deregisterItems = []
    this.psProducts.sort(this.sortProductsByDisplayName)
    this.wProducts.sort(this.sortProductsByDisplayName)
  }
  public onDeregisterConfirmation(): void {
    this.displayDeregisterConfirmation = false
    this.clearForm()
    const itemCount = this.deregisterItems.length
    let successCounter = 0
    let errorCounter = 0
    if (this.workspace) {
      for (const p of this.deregisterItems) {
        this.wProductApi
          .deleteProductById({
            id: this.workspace.id!,
            productId: p.id!
          })
          .subscribe({
            next: () => {
              successCounter++
              const psp = this.psProducts.filter((psp) => psp.productName === p.productName)[0]
              psp.bucket = 'SOURCE'
              this.changed.emit()
              if (itemCount === successCounter + errorCounter)
                this.displayRegisterMessages('DEREGISTRATION', successCounter, errorCounter)
            },
            error: (err) => {
              errorCounter++
              // Revert change: remove item in source + add item in target list
              this.psProducts = this.psProducts.filter((psp) => psp.productName !== p.productName)
              this.wProducts.push(p)
              console.error('deleteProductById', err)
              if (itemCount === successCounter + errorCounter)
                this.displayRegisterMessages('DEREGISTRATION', successCounter, errorCounter)
            }
          })
      }
    }
  }

  private displayRegisterMessages(type: string, success: number, error: number) {
    this.deregisterItems = []
    this.psProducts.sort(this.sortProductsByDisplayName)
    this.wProducts.sort(this.sortProductsByDisplayName)
    if (success > 0) {
      if (success === 1) this.msgService.success({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.' + type + '_OK' })
      else this.msgService.success({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.' + type + 'S_OK' })
    }
    if (error > 0)
      if (error === 1) this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.' + type + '_NOK' })
      else this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.' + type + 'S_NOK' })
  }

  /**
   * UI Events
   */
  public onAddSlot(ev: any, item: ExtendedSlot) {
    this.slotApi
      .createSlot({ createSlotRequest: { workspaceId: '', name: item.name } as CreateSlotRequest })
      .subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'DIALOG.SLOT.MESSAGES.CREATE_OK' })
        },
        error: () => {
          this.msgService.error({ summaryKey: 'DIALOG.SLOT.MESSAGES.CREATE_NOK' })
        }
      })
  }

  public onGoToProduct(name?: string): void {
    goToEndpoint(
      this.workspaceService,
      this.msgService,
      this.router,
      'onecx-product-store',
      'onecx-product-store-ui',
      'product-detail',
      { 'product-name': name }
    )
  }
  public onGoToProductPermission(name?: string): void {
    goToEndpoint(
      this.workspaceService,
      this.msgService,
      this.router,
      'onecx-permission',
      'onecx-permission-ui',
      'product',
      { 'product-name': name }
    )
  }
}
