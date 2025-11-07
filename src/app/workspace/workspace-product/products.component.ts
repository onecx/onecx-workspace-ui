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
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms'
import { catchError, finalize, firstValueFrom, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs'
import { TranslateService } from '@ngx-translate/core'

import { MfeInfo } from '@onecx/integration-interface'
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
import { Utils } from 'src/app/shared/utils'

type ChangeStatus = { index: number; new?: boolean; change?: boolean; deprecated?: boolean; undeployed?: boolean }
export type ExtendedMicrofrontend = Microfrontend & ChangeStatus
export type ExtendedSlot = SlotPS & ChangeStatus
export type ExtendedApp = {
  appId: string
  modules?: ExtendedMicrofrontend[]
  components?: ExtendedMicrofrontend[]
}

// combine Workspace Product with properties from product store (ProductStoreItem)
// => bucket is used to recognize the origin within HTML
export type ExtendedProduct = Product & {
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
    this.searchPsProducts()
    this.searchWProducts()
    firstValueFrom(
      this.wProducts$.pipe(
        switchMap(() => {
          return this.psProducts$
        })
      )
    )
  }

  public onLoadPsProducts(): void {
    this.onHideItemDetails()
    firstValueFrom(this.psProducts$)
  }
  public onLoadWProducts(): void {
    this.onHideItemDetails()
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
              this.wProducts.push({ ...p, bucket: 'TARGET', changedComponents: false } as ExtendedProduct)
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
      .searchAvailableProducts({ productStoreSearchCriteria: { pageSize: 1000 } })
      .pipe(
        map((result) => {
          // filter: return psProducts which are not yet registered
          this.psProducts = []
          this.psProductsOrg = new Map()
          if (result.stream)
            for (const p of result.stream) {
              const psP = { ...p, bucket: 'SOURCE', changedComponents: false } as ExtendedProduct
              this.prepareProductApps(psP)
              this.psProductsOrg.set(psP.productName!, psP)
              const wP = this.wProducts.find((wp) => wp.productName === psP.productName)
              if (wP) this.syncProductState(wP, psP)
              // add product to SOURCE picklist only if not yet registered
              else if (!psP.undeployed) this.psProducts.push(psP)

              if (psP.productName === 'onecx-announcement') console.log('psp+wP', psP, wP)
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

  /**************************************************
   * Prepare apps (modules, components) to be displayed
   */
  private prepareProductApps(eP: ExtendedProduct): void {
    if (eP.microfrontends) {
      eP.apps = new Map()
      eP.microfrontends.forEach((mfe) => {
        if (mfe.appId && !eP.apps?.has(mfe.appId)) eP.apps?.set(mfe.appId, { appId: mfe.appId })
      })
    }
    this.prepareProductAppParts(eP) // load apps with data
  }
  private prepareProductAppParts(eP: ExtendedProduct) {
    // step through mfe array and pick modules and components
    if (eP.microfrontends)
      for (const mfe of eP.microfrontends) {
        this.prepareProductAppPart(mfe, eP)
        // mark product if there are important changes on microfrontends
        eP.changedComponents = mfe.undeployed || mfe.deprecated || eP.changedComponents
      }
    if (eP.slots)
      for (const slot of eP.slots) {
        eP.changedComponents = slot.undeployed || slot.deprecated || eP.changedComponents
      }
  }
  private prepareProductAppPart(mfe: Microfrontend, eP: ExtendedProduct): void {
    const app = eP.apps?.get(mfe.appId!)
    if (app) {
      if (mfe.type === MicrofrontendType.Module) {
        app.modules = app.modules ?? []
        app.modules.push(mfe as ExtendedMicrofrontend)
      }
      app.modules?.sort(this.sortMfesByAppId)
      if (mfe.type === MicrofrontendType.Component) {
        app.components = app.components ?? []
        app.components.push(mfe as ExtendedMicrofrontend)
      }
      app.components?.sort(this.sortMfesByAppId)
    }
  }

  /**************************************************
   * Sorting
   */
  public sortProductsByDisplayName(a: Product, b: Product): number {
    return (a.displayName ? a.displayName.toUpperCase() : '').localeCompare(
      b.displayName ? b.displayName.toUpperCase() : ''
    )
  }
  public sortMfesByAppId(a: ExtendedMicrofrontend, b: ExtendedMicrofrontend): number {
    return (
      (a.appId?.toUpperCase() ?? '').localeCompare(b.appId?.toUpperCase() ?? '') ||
      (a.exposedModule?.toUpperCase() ?? '').localeCompare(b.exposedModule?.toUpperCase() ?? '')
    )
  }
  public sortMfesByExposedModule(a: Microfrontend, b: Microfrontend): number {
    return (a.exposedModule?.toUpperCase() ?? '').localeCompare(b.exposedModule?.toUpperCase() ?? '')
  }
  public sortSlotsByName(a: SlotPS, b: SlotPS): number {
    return (a.name ? a.name.toUpperCase() : '').localeCompare(b.name ? b.name.toUpperCase() : '')
  }

  public getImageUrl(product?: ExtendedProduct): string | undefined {
    if (!product) return undefined
    if (product.imageUrl && product.imageUrl != '') {
      return product.imageUrl
    }
    //return Utils.bffProductImageUrl(this.imageApi.configuration.basePath, product.productName)
    return undefined
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
          this.displayedDetailItem = undefined
          this.displayDetails = false
          console.error('getProductById', err)
          this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.LOAD_ERROR' })
        },
        complete() {}
      })
  }

  // enrich workspace product with data from product store
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
        item.slots = pspOrg.slots
        item.apps = pspOrg.apps // copy apps, to be analyzed and prepared for displaying
        this.syncProductState(item, pspOrg)
      }
      console.log('prepareWProduct', item, true)
    }
  }
  // take over the deprecated/undeployed states on MFE Modules and Slots => TODO
  private syncProductState(wP: ExtendedProduct, psP: ExtendedProduct, detail?: boolean): void {
    let pspModules = 0
    wP.changedComponents = psP.changedComponents
    wP.undeployed = psP.undeployed
    if (wP.microfrontends) {
      for (const wMfe of wP.microfrontends)
        if (psP.microfrontends)
          for (const psMfe of psP.microfrontends.filter((mfe) => mfe.type === MicrofrontendType.Module)) {
            pspModules++
            // reg. MFEs without exposed module
            if (!wMfe.exposedModule) wMfe.exposedModule = psMfe.exposedModule
            if (psMfe.appId === wMfe.appId && psMfe.exposedModule === wMfe.exposedModule) {
              wMfe.deprecated = psMfe.deprecated
              wMfe.undeployed = psMfe.undeployed
            }
          }
      wP.changedComponents = wP.changedComponents || wP.microfrontends.length !== pspModules
    }
    // compare slots => TODO
    console.log(wP.displayName, wP.slots?.length, psP.slots?.length)
    // TODO: w slots always 0 ??
    //if (!wP.changedComponents) wP.changedComponents = wP.slots?.length !== psP.slots?.length
  }

  private fillForm(item: ExtendedProduct) {
    this.formChanged = false
    this.displayedDetailItem = item
    this.displayedDetailItem.slots?.sort(this.sortSlotsByName)
    this.formGroup.controls['displayName'].setValue(this.displayedDetailItem.displayName)
    this.formGroup.controls['baseUrl'].setValue(this.displayedDetailItem.baseUrl)
    // build a dynamic form array for all microfrontend modules for a TARGET product
    if (item.bucket === 'TARGET') {
      this.formGroup.enable()
      const modules = this.formGroup.get('modules') as FormArray
      while (modules.length > 0) modules.removeAt(0) // clear form
      if (this.displayedDetailItem.microfrontends)
        if (this.displayedDetailItem.microfrontends.length === 0) this.displayedDetailItem.microfrontends = undefined
      this.fillFormForModules(this.displayedDetailItem, modules)
    }
    if (item.bucket === 'SOURCE') this.formGroup.disable()
    this.displayDetails = true
  }
  private fillFormForModules(item: ExtendedProduct, modules: FormArray): void {
    if (!item || !item.apps) return
    console.log('fillFormForModules', item, modules)
    // 1. Prepare so much forms as app modules exist in PS
    let moduleIndex = 0
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
              basePath: new FormControl(null, [Validators.required, Validators.maxLength(255)]),
              exposedModule: new FormControl(null),
              deprecated: new FormControl(null),
              undeployed: new FormControl(null),
              new: new FormControl(null),
              change: new FormControl(null),
              endpoints: new FormControl(null)
            })
          )
          modules.at(modules.length - 1).patchValue({
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

  private clearForm() {
    this.onHideItemDetails()
    this.formChanged = false
    this.formGroup.reset()
  }
  public getModuleControls(appId: string): any {
    if (!appId) return
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
        console.log('item', item) // ignore item if id is undefined and "new" = false and formChanged
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
            this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.UPDATE_NOK' })
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
    this.clearForm()
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
              wp.modificationCount = 0
              wp.apps = p.apps
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
    ev.stopPropagation()
    if (this.workspace?.id)
      this.slotApi
        .createSlot({ createSlotRequest: { workspaceId: this.workspace.id, name: item.name } as CreateSlotRequest })
        .subscribe({
          next: () => {
            this.msgService.success({ summaryKey: 'DIALOG.SLOT.MESSAGES.CREATE_OK' })
          },
          error: () => {
            this.msgService.error({ summaryKey: 'DIALOG.SLOT.MESSAGES.CREATE_NOK' })
          }
        })
  }

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
