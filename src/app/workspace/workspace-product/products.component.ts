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
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms'
import {
  catchError,
  combineLatest,
  finalize,
  firstValueFrom,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  takeUntil
} from 'rxjs'
import { TranslateService } from '@ngx-translate/core'

import { MfeInfo } from '@onecx/integration-interface'
import {
  AppStateService,
  PortalMessageService,
  UserService,
  WorkspaceService
} from '@onecx/angular-integration-interface'

import {
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
  Slot,
  WorkspaceProductAPIService,
  UIEndpoint
} from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'

type ChangeStatus = {
  index?: number
  new?: boolean
  change?: boolean
  exists?: boolean
  deprecated?: boolean
  undeployed?: boolean
}
export type ExtendedMicrofrontend = Microfrontend & ChangeStatus
export type ExtendedSlot = SlotPS & ChangeStatus
export type ExtendedApp = {
  appId: string
  appName: string
  modules?: ExtendedMicrofrontend[]
  components?: ExtendedMicrofrontend[] // type is only needed to use the same sort method
}
export type WorkspaceData = { slots: Slot[]; products: ExtendedProduct[] }

// combine Workspace Product with properties from product store (ProductStoreItem)
// => bucket is used to recognize the origin within HTML
export type ExtendedProduct = Product &
  ChangeStatus & {
    bucket: 'SOURCE' | 'TARGET' // target: workspace product = registered
    changedComponents: boolean // true if there is a MFE with deprecated or undeployed
    apps?: Map<string, ExtendedApp> // key: appId
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

export function ValidateModuleBasePath(fa: FormArray): ValidatorFn {
  return (): ValidationErrors | null => {
    const paths: string[] = []
    for (const m of fa.controls) {
      const bp = m.get('basePath')?.value
      if (!bp) return { basePathRequired: true }
      if (paths.includes(bp)) return { basePathsNotUnique: true }
      else paths.push(bp)
    }
    return null
  }
}

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductComponent implements OnChanges, OnDestroy, AfterViewInit {
  @Input() workspace!: Workspace | undefined
  @Output() changed = new EventEmitter()

  private readonly destroy$ = new Subject()
  // dialog
  public exceptionKey: string | undefined = undefined
  public psLoading = false
  public wpLoading = false
  public editMode = false
  public hasRegisterPermission = false
  public permissionEndpointExist = false
  public productEndpointExist = false
  public displayDetails = false
  public displayedDetailItem: ExtendedProduct | undefined = undefined
  public formGroup: FormGroup
  public formChanged = false
  public sourceFilterValue: string | undefined // product store
  public targetFilterValue: string | undefined // workspace
  public sourceList!: HTMLElement | null
  public targetList!: HTMLElement | null
  public sourceListViewMode: ViewingModes | undefined
  public targetListViewMode: ViewingModes | undefined
  public viewingModes: ViewingModes[] = []
  public displayDeregisterConfirmation = false
  private deregisterItems: ExtendedProduct[] = []

  // data
  public wSlots$!: Observable<Slot[]>
  public wProducts$!: Observable<ExtendedProduct[]>
  public wProducts: ExtendedProduct[] = [] // registered products
  public psProducts: ExtendedProduct[] = [] // not registered product store products
  public psProducts$!: Observable<ExtendedProduct[]>
  public psProductsOrg!: Map<string, ExtendedProduct> // all products in product store (not undeployed)
  public currentMfe!: MfeInfo

  constructor(
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
      modules: this.fb.array([])
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
    if (this.workspace && changes['workspace']) {
      this.loadData()
      // check detail endpoint exists
      this.productEndpointExist = Utils.doesEndpointExist(
        this.workspaceService,
        'onecx-product-store',
        'onecx-product-store-ui',
        'product-detail'
      )
      this.permissionEndpointExist = Utils.doesEndpointExist(
        this.workspaceService,
        'onecx-permission',
        'onecx-permission-ui',
        'product'
      )
    }
  }
  public ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }

  public loadData(): void {
    this.exceptionKey = undefined
    this.onHideItemDetails()
    this.searchWProducts()
    this.searchWSlots()
    firstValueFrom(
      combineLatest([this.wSlots$, this.wProducts$]).pipe(
        switchMap((data) => this.searchPsProducts({ slots: data[0], products: data[1] } as WorkspaceData))
      )
    )
  }

  /**************************************************
   * Searching
   *   * Product Store products inlc. ms, mfe (modules, components, endpoints), slots
   *   * Workspace products (registered)
   *   * Workspace slots
   */
  public onLoadPsProducts(): void {
    this.loadData()
  }
  public onLoadWProducts(): void {
    this.onHideItemDetails()
    this.wpLoading = true
    firstValueFrom(this.wProducts$)
  }
  private searchWProducts(): void {
    this.wpLoading = true
    if (this.workspace?.id)
      this.wProducts$ = this.wProductApi
        .getProductsByWorkspaceId({ id: this.workspace?.id })
        .pipe(
          map((products) => {
            this.wProducts = []
            for (const p of products)
              this.wProducts.push({ ...p, bucket: 'TARGET', exists: true, changedComponents: false } as ExtendedProduct)
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
  private searchWSlots(): void {
    if (this.workspace?.id)
      this.wSlots$ = this.slotApi.getSlotsForWorkspace({ id: this.workspace?.id }).pipe(
        map((response) => response.slots ?? []),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
          console.error('getSlotsForWorkspace', err)
          return of([] as Slot[])
        })
      )
  }
  private searchPsProducts(workspaceData: WorkspaceData): any {
    this.psLoading = true
    return this.psProductApi
      .searchAvailableProducts({ productStoreSearchCriteria: { pageSize: 1000 } })
      .pipe(
        map((result) => {
          // filter: return psProducts which are not yet registered
          this.psProducts = []
          this.psProductsOrg = new Map()
          if (result.stream)
            for (const p of result.stream) {
              const psP = { ...p, bucket: 'SOURCE', exists: true, changedComponents: false } as ExtendedProduct
              this.prepareProductApps(psP, workspaceData.slots)
              this.psProductsOrg.set(psP.productName!, psP)
              const wP = workspaceData.products.find((wp) => wp.productName === psP.productName)
              if (wP) this.syncProductState(wP, psP)
              // add product to SOURCE picklist only if not yet registered
              else if (!psP.undeployed) this.psProducts.push(psP)
            }
          // mark workspace products which are not longer exist in product store
          for (const wP of workspaceData.products) wP.exists = this.psProductsOrg.get(wP.productName!) !== undefined
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

  /**************************************************
   * Prepare apps (modules, components) to be displayed
   */
  private prepareProductApps(eP: ExtendedProduct, slots: Slot[]): void {
    if (eP.microfrontends) {
      eP.apps = new Map()
      for (const mfe of eP.microfrontends) {
        if (mfe.appId && !eP.apps?.has(mfe.appId))
          eP.apps?.set(mfe.appId, { appId: mfe.appId, appName: mfe.appName ?? mfe.appId })
        this.prepareProductAppPart(mfe, eP)
        // mark product if there are important changes on microfrontends
        eP.changedComponents = mfe.undeployed || mfe.deprecated || eP.changedComponents
      }
    }
    if (eP.slots)
      for (const slot of eP.slots) {
        eP.changedComponents = slot.undeployed || slot.deprecated || eP.changedComponents
        // mark PS slots as exist in workspace
        slot.exists = slots.some((sl) => sl.name === slot.name) !== undefined
      }
  }
  private prepareProductAppPart(mfe: Microfrontend, eP: ExtendedProduct): void {
    const app = eP.apps?.get(mfe.appId!)
    if (app) {
      if (mfe.type === MicrofrontendType.Module) {
        app.modules = app.modules ?? []
        app.modules.push(mfe as ExtendedMicrofrontend)
      }
      app.modules?.sort(this.sortMicrofrontends)
      if (mfe.type === MicrofrontendType.Component) {
        app.components = app.components ?? []
        app.components.push(mfe as ExtendedMicrofrontend)
      }
      app.components?.sort(this.sortMicrofrontends)
    }
  }

  /**************************************************
   * Sorting
   */
  public sortProductsByDisplayName(a: Product, b: Product): number {
    return (a.displayName ?? '').toUpperCase().localeCompare((b.displayName ?? '').toUpperCase())
  }
  public sortMicrofrontends(a: ExtendedMicrofrontend, b: ExtendedMicrofrontend): number {
    return (
      (a.appId?.toUpperCase() ?? '').localeCompare(b.appId?.toUpperCase() ?? '') ||
      (a.exposedModule?.toUpperCase() ?? '').localeCompare(b.exposedModule?.toUpperCase() ?? '')
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
    return Utils.bffProductImageUrl(this.imageApi.configuration.basePath, product.productName)
  }

  /**************************************************
   * UI Events: Picklist
   */
  public getFilterValue(ev: any): string {
    return ev.target.value
  }
  public onHideItemDetails() {
    this.displayDetails = false
    this.displayedDetailItem = undefined
    this.formChanged = false
    this.formGroup.reset()
  }
  public onSourceViewModeChange(ev: { icon: string; mode: string }): void {
    if (ev) {
      this.sourceListViewMode = this.viewingModes.find((v) => v.mode === ev.mode)
      if (ev.mode === 'grid') this.renderer.addClass(this.sourceList, 'tile-view')
      if (ev.mode === 'list') this.renderer.removeClass(this.sourceList, 'tile-view')
    }
  }
  public onTargetViewModeChange(ev: { icon: string; mode: string }): void {
    if (ev) {
      this.targetListViewMode = this.viewingModes.find((v) => v.mode === ev.mode)
      if (ev.mode === 'grid') this.renderer.addClass(this.targetList, 'tile-view')
      if (ev.mode === 'list') this.renderer.removeClass(this.targetList, 'tile-view')
    }
  }

  /**************************************************
   * UI Events: Detail
   */
  return(event: any) {
    event.stopPropagation()
  }
  // on picklist item clicks: ev.items is collection
  public onSourceSelect(ev: any): void {
    if (ev.items.length === 0) this.onHideItemDetails()
    if (ev.items.length === 1) this.fillForm(this.psProductsOrg.get(ev.items[0].productName))
  }
  public onTargetSelect(ev: any): void {
    if (ev.items.length === 0) this.onHideItemDetails()
    if (ev.items.length === 1) this.getWProduct(ev.items[0])
  }

  /**************************************************
   * DETAIL
   */
  private getWProduct(wProduct: ExtendedProduct): void {
    this.wProductApi
      .getProductById({ id: this.workspace?.id, productId: wProduct.id } as GetProductByIdRequestParams)
      .subscribe({
        next: (data) => {
          const item = data as ExtendedProduct
          this.prepareWProduct(item)
          this.fillForm(item)
        },
        error: (err) => {
          this.onHideItemDetails()
          console.error('getProductById', err)
          this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.LOAD_ERROR' })
        },
        complete() {}
      })
  }

  // Enrich workspace product with data from product store
  // (a) no structure change => update up-to-date info
  // (b) new/removed Apps/Modules in PS
  private prepareWProduct(item: ExtendedProduct) {
    item.bucket = 'TARGET'
    item.displayName = item.displayName ?? item.productName
    if (this.psProductsOrg.has(item.productName!)) {
      const pspOrg = this.psProductsOrg.get(item.productName!)
      if (pspOrg) {
        item.undeployed = pspOrg.undeployed
        item.changedComponents = pspOrg.changedComponents
        item.slots = pspOrg.slots // copy, slot management in separate TAB
        item.apps = pspOrg.apps // copy, to be analyzed and prepared for displaying
        this.syncProductState(item, pspOrg)
      }
    }
  }
  // take over the deprecated/undeployed states on MFE Modules and Slots
  private syncProductState(wP: ExtendedProduct, psP: ExtendedProduct): void {
    wP.changedComponents = psP.changedComponents
    wP.undeployed = psP.undeployed
    if (wP.microfrontends) {
      let pspModules = 0
      const wModules = wP.microfrontends.filter((mfe) => mfe.type === MicrofrontendType.Module).length
      for (const wMfe of wP.microfrontends.filter((mfe) => mfe.type === MicrofrontendType.Module)) {
        pspModules = pspModules + this.syncModuleState(wMfe, psP.microfrontends)
      }
      wP.changedComponents = wP.changedComponents || wModules !== pspModules
    }
  }
  private syncModuleState(wMfe: Microfrontend, psMfes: Microfrontend[] | undefined): number {
    let n = 0
    if (psMfes)
      for (const psMfe of psMfes.filter((mfe) => mfe.type === MicrofrontendType.Module)) {
        // reg. MFEs without exposed module
        if (!wMfe.exposedModule) wMfe.exposedModule = psMfe.exposedModule
        if (psMfe.appId === wMfe.appId && psMfe.exposedModule === wMfe.exposedModule) {
          n++
          wMfe.deprecated = psMfe.deprecated
          wMfe.undeployed = psMfe.undeployed
        }
      }
    return n
  }

  /**************************************************
   * DETAIL FORM
   *
   * Build a dynamic form array for all microfrontend modules for a TARGET product
   */
  private fillForm(item: ExtendedProduct | undefined): void {
    if (!item) return
    this.displayDetails = true
    this.formChanged = false
    this.displayedDetailItem = item
    this.displayedDetailItem.slots?.sort(this.sortSlotsByName)
    if (item.bucket === 'SOURCE') this.formGroup.disable()
    if (item.bucket === 'TARGET') {
      if (
        this.displayedDetailItem.productName &&
        this.displayedDetailItem.productName === this.displayedDetailItem.displayName
      )
        this.displayedDetailItem.displayName = this.psProductsOrg.get(this.displayedDetailItem.productName)?.displayName
      this.formGroup.enable()
      const modules = this.formGroup.get('modules') as FormArray
      while (modules.length > 0) modules.removeAt(0) // clear form
      if (this.displayedDetailItem.microfrontends)
        if (this.displayedDetailItem.microfrontends.length === 0) this.displayedDetailItem.microfrontends = undefined
      this.fillFormForModules(this.displayedDetailItem, modules)
    }
    this.formGroup.controls['displayName'].setValue(this.displayedDetailItem.displayName)
    this.formGroup.controls['baseUrl'].setValue(this.displayedDetailItem.baseUrl)
  }
  private fillFormForModules(item: ExtendedProduct, modules: FormArray): void {
    let moduleIndex = 0
    if (item && item.apps)
      // 1. Prepare so much forms as app modules exist in PS
      for (const [appId, app] of item.apps) {
        if (app.modules)
          for (const m of app.modules) {
            // mfe is undefined for "new" modules
            const mfe = item.microfrontends?.find((mf) => mf.appId === appId && mf.exposedModule === m.exposedModule)
            modules.push(
              this.fb.group({
                index: new FormControl(null),
                id: new FormControl(null),
                appId: new FormControl(null),
                basePath: new FormControl(null, [
                  Validators.required,
                  Validators.maxLength(255),
                  Validators.minLength(1),
                  Validators.pattern('^/.*'),
                  ValidateModuleBasePath(modules)
                ]),
                exposedModule: new FormControl(null),
                deprecated: new FormControl(null),
                undeployed: new FormControl(null),
                new: new FormControl(null),
                change: new FormControl(null),
                endpoints: new FormControl(null)
              })
            )
            modules.at(-1).patchValue({
              index: moduleIndex,
              id: mfe?.id,
              appId: m?.appId,
              basePath: mfe?.basePath ?? '/' + moduleIndex,
              exposedModule: m?.exposedModule,
              deprecated: m.deprecated,
              undeployed: m.undeployed,
              new: mfe?.id === undefined,
              change: undefined, // user can set: 'create' for creation, 'delete' for deletion
              endpoints: mfe?.endpoints?.sort(this.sortEndpointsByName)
            })
            moduleIndex++
          }
      }
    // 2. Add form? for non-existing (in PS) modules
  }
  private sortEndpointsByName(a: UIEndpoint, b: UIEndpoint): number {
    return (a.name ? a.name.toUpperCase() : '').localeCompare(b.name ? b.name.toUpperCase() : '')
  }

  public getModuleControls(appId: string): any {
    const fa = this.formGroup.get('modules') as FormArray
    return fa.controls.filter((m) => m.value.appId === appId)
  }

  /****************************************************************************
   * UI Event: SAVE
   */
  public onProductSave(): void {
    this.editMode = false
    if (this.workspace?.id && this.formGroup.valid && this.displayedDetailItem?.id) {
      this.displayedDetailItem.displayName = this.formGroup.controls['displayName'].value
      this.displayedDetailItem.baseUrl = this.formGroup.controls['baseUrl'].value
      // MFE modules to be saved:
      this.displayedDetailItem.microfrontends = [] // clear
      const modules = this.formGroup.get('modules') as FormArray
      modules.controls.forEach((item) => {
        // ignore item if id is undefined and "new" = false and formChanged
        if ((item.value.id && item.value.change === undefined) || (!item.value.id && item.value.change === 'create'))
          this.displayedDetailItem?.microfrontends?.push(item.value)
      })
      this.wProductApi
        .updateProductById({
          id: this.workspace?.id,
          productId: this.displayedDetailItem.id,
          updateProductRequest: {
            modificationCount: this.displayedDetailItem.modificationCount,
            baseUrl: this.displayedDetailItem.baseUrl,
            displayName: this.displayedDetailItem.displayName,
            microfrontends: this.displayedDetailItem.microfrontends?.map((m) => ({
              appId: m.appId,
              basePath: m.basePath,
              exposedModule: m.exposedModule
            }))
          } as UpdateProductRequest
        })
        .subscribe({
          next: (data) => {
            const item = data.resource as ExtendedProduct
            this.prepareWProduct(item)
            this.fillForm(item)
            this.msgService.success({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_OK' })
          },
          error: (err) => {
            console.error('updateProductById', err)
            if (err.error?.errorCode) {
              if (err.error?.errorCode === 'MERGE_ENTITY_FAILED') modules.markAsDirty()
              this.msgService.error({
                summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_NOK',
                detailKey: 'VALIDATION.ERRORS.APP_MODULE.' + err.error?.errorCode
              })
            } else this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_NOK' })
          },
          complete() {}
        })
    }
  }

  /****************************************************************************
   * REGISTER
   *
   * This event fires after the items were moved from source to target => PrimeNG
   * Afterwards, Step through the list and on each error roll back the move.
   */
  private prepareMfePaths(mfes: Microfrontend[]): Microfrontend[] | undefined {
    return mfes.length === 0
      ? undefined
      : mfes.map((m: any, i: number) => ({
          appId: m.appId,
          basePath: '/' + (mfes.length > 1 ? i + 1 : ''), // create initial unique base paths
          exposedModule: m.exposedModule
        }))
  }

  public onMoveToTarget(ev: any): void {
    this.onHideItemDetails()
    const itemCount = ev.items.length
    let successCounter = 0
    let errorCounter = 0
    for (const p of ev.items as ExtendedProduct[]) {
      // register modules only (ignore undeployed modules)
      const mfes =
        p.microfrontends?.filter((m: Microfrontend) => m.type === MicrofrontendType.Module && !m.undeployed) ?? []
      if (this.workspace) {
        this.wProductApi
          .createProductInWorkspace({
            id: this.workspace.id!,
            createProductRequest: {
              productName: p.productName,
              baseUrl: p.baseUrl,
              displayName: p.displayName,
              microfrontends: this.prepareMfePaths(mfes)
            } as CreateProductRequest
          })
          .subscribe({
            next: (data) => {
              successCounter++
              // update id of the workspace item to be used on select
              const wP = this.wProducts.find((wp) => wp.productName === p.productName)
              if (wP) {
                wP.id = data.resource.id
                wP.modificationCount = 0
                this.prepareWProduct(wP)
              }
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

  /****************************************************************************
   * DEREGISTER
   *
   * This event fires after the items were moved (visible) from source to target => PrimeNG
   * BUT: This movement is not permanent
   * Afterwards, ask for confirmation:
   *   accepted: delete product from workspace, on each error roll back the moved item
   *   rejected: roll back the moved items
   */
  public onMoveToSource(event: any): void {
    this.deregisterItems = event.items
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
    this.onHideItemDetails()
    const itemCount = this.deregisterItems.length
    let successCounter = 0
    let errorCounter = 0
    for (const p of this.deregisterItems)
      if (this.workspace?.id && p.id) {
        this.wProductApi.deleteProductById({ id: this.workspace.id, productId: p.id }).subscribe({
          next: () => {
            successCounter++
            // remove a non-existing product of adjust bucket
            if (p.exists) {
              p.bucket = 'SOURCE'
              p.changedComponents = false
              // sometimes the component has already the product - then do not add
              if (!this.psProducts.some((psp) => psp.productName === p.productName)) this.psProducts.push(p)
            } else {
              this.psProducts = this.psProducts.filter((psp) => psp.productName !== p.productName)
            }
            this.wProducts = this.wProducts.filter((psp) => psp.productName !== p.productName)
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

  private displayRegisterMessages(type: string, success: number, error: number) {
    this.deregisterItems = []
    this.psProducts.sort(this.sortProductsByDisplayName)
    this.wProducts.sort(this.sortProductsByDisplayName)
    this.changed.emit() // inform slot TAB via detail component
    if (success > 0) {
      if (success === 1) this.msgService.success({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.' + type + '_OK' })
      else this.msgService.success({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.' + type + 'S_OK' })
    }
    if (error > 0)
      if (error === 1) this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.' + type + '_NOK' })
      else this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.' + type + 'S_NOK' })
  }

  /****************************************************************************
   * ENDPOINTS
   */
  public getProductEndpointUrl$(name?: string): Observable<string | undefined> {
    if (this.productEndpointExist && name)
      return this.workspaceService.getUrl('onecx-product-store', 'onecx-product-store-ui', 'product-detail', {
        'product-name': name
      })
    return of(undefined)
  }
  public getPermissionEndpointUrl$(name?: string): Observable<string | undefined> {
    if (this.permissionEndpointExist && name)
      return this.workspaceService.getUrl('onecx-permission', 'onecx-permission-ui', 'product', {
        'product-name': name
      })
    return of(undefined)
  }
}
