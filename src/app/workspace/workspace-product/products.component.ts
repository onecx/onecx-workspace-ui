import {
  AfterViewInit,
  Component,
  ElementRef,
  Renderer2,
  Input,
  OnDestroy,
  OnChanges,
  SimpleChanges
} from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { catchError, finalize, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs'
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms'

import {
  Microfrontend,
  MicrofrontendType,
  GetProductByIdRequestParams,
  CreateProductRequest,
  UpdateProductRequest,
  Product,
  ProductAPIService,
  SlotPS,
  Workspace,
  WorkspaceProductAPIService
} from 'src/app/shared/generated'
import { MfeInfo } from '@onecx/portal-integration-angular'
import { AppStateService, PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { environment } from 'src/environments/environment'
import { limitText, prepareUrlPath } from 'src/app/shared/utils'

export type ExtendedMicrofrontend = Microfrontend & {
  exposedModule?: string // MicrofrontendPS
}
export type AppType = {
  appId: string
  modules?: ExtendedMicrofrontend[]
  components?: ExtendedMicrofrontend[]
}
// combine Workspace Product with properties from product store (ProductStoreItem)
// => bucket is used to recognize the origin within HTML
export type ExtendedProduct = Product & {
  bucket: 'SOURCE' | 'TARGET' // target: workspace product = registered
  changedMfe: boolean // true if there is a MFE with deprecated or undeployed
  apps: Map<string, AppType> // key: appId
  slots?: Array<SlotPS> // from ProductStoreItem
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

  private readonly destroy$ = new Subject()
  public exceptionKey: string | undefined
  public loading = true
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

  limitText = limitText
  environment = environment
  prepareUrlPath = prepareUrlPath

  // data
  public wProducts$!: Observable<ExtendedProduct[]>
  public wProducts!: ExtendedProduct[] // registered products
  public psProducts!: ExtendedProduct[] // not registered product store products
  public psProducts$!: Observable<ExtendedProduct[]>
  public psProductsOrg!: Map<string, ExtendedProduct> // all products in product store (not undeployed)
  public currentMfe!: MfeInfo

  constructor(
    private wProductApi: WorkspaceProductAPIService,
    private psProductApi: ProductAPIService,
    private user: UserService,
    private appState: AppStateService,
    private translate: TranslateService,
    private msgService: PortalMessageService,
    private fb: FormBuilder,
    private renderer: Renderer2,
    private elem: ElementRef
  ) {
    this.hasRegisterPermission = this.user.hasPermission('WORKSPACE_PRODUCTS#REGISTER')
    this.appState.currentMfe$.pipe(map((mfe) => (this.currentMfe = mfe))).subscribe()
    this.formGroup = this.fb.group({
      displayName: new FormControl({ value: null, disabled: true }),
      baseUrl: new FormControl({ value: null, disabled: true }),
      modules: this.fb.array([])
    })
    this.viewingModes = ALL_VIEW_MODES
    this.sourceListViewMode = this.viewingModes.find((v) => v.mode === 'list')
    this.targetListViewMode = this.viewingModes.find((v) => v.mode === 'list')
  }

  ngAfterViewInit() {
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
    this.loading = true
    this.exceptionKey = undefined
    this.searchWProducts()
    this.searchPsProducts()
    this.wProducts$
      .pipe(
        switchMap((wProducts) => {
          return this.psProducts$
        })
      )
      .subscribe()
  }

  public onLoadPsProducts(): void {
    this.displayDetails = true
    this.psProducts$.subscribe()
  }
  public onLoadWProducts(): void {
    this.displayDetails = true
    this.wProducts$.subscribe()
  }
  private searchWProducts(): void {
    this.wProducts$ = this.wProductApi
      .getProductsByWorkspaceId({ id: this.workspace?.id ?? '' })
      .pipe(
        map((products) => {
          this.wProducts = []
          for (let p of products) this.wProducts.push({ ...p, bucket: 'TARGET' } as ExtendedProduct)
          return this.wProducts.sort(this.sortProductsByDisplayName)
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
          console.error('getProductsByWorkspaceId():', err)
          return of([] as ExtendedProduct[])
        })
      )
      .pipe(takeUntil(this.destroy$))
  }

  /**
   * GET all (!) Product Store products (which are not yet registered)
   */
  private searchPsProducts(): void {
    this.psProducts$ = this.psProductApi
      .searchAvailableProducts({ productStoreSearchCriteria: {} })
      .pipe(
        map((result) => {
          // filter: return psProducts which are not yet registered
          this.psProducts = []
          this.psProductsOrg = new Map()
          if (result.stream)
            for (let p of result.stream) {
              let psp = { ...p, bucket: 'SOURCE', changedMfe: false } as ExtendedProduct
              this.prepareProductApps(psp)
              this.psProductsOrg.set(psp.productName ?? '', psp)
              // add product to SOURCE picklist only if not yet registered
              const wp = this.wProducts.filter((wp) => wp.productName === psp.productName)
              if (wp.length === 0 && !psp.undeployed) this.psProducts.push(psp)
              if (wp.length === 1) {
                wp[0].changedMfe = psp.changedMfe
                wp[0].undeployed = psp.undeployed
              }
            }
          return this.psProducts.sort(this.sortProductsByDisplayName)
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
          console.error('searchAvailableProducts():', err)
          return of([] as ExtendedProduct[])
        }),
        finalize(() => (this.loading = false))
      )
      .pipe(takeUntil(this.destroy$))
  }

  // build map of apps, which containing modules and components
  private prepareProductApps(psp: ExtendedProduct) {
    if (!psp.microfrontends) return
    psp.apps = new Map()
    psp.microfrontends.map((mfe) => {
      if (!psp.apps.has(mfe.appId!)) psp.apps.set(mfe.appId!, { appId: mfe.appId! })
    })
    // step through mfe array and pick modules and components
    for (const mfe of psp.microfrontends) {
      const app = psp.apps.get(mfe.appId!)
      if (app) {
        if (mfe.type === MicrofrontendType.Module) {
          if (!app.modules) app.modules = []
          app.modules!.push(mfe as ExtendedMicrofrontend)
        }
        if (mfe.type === MicrofrontendType.Component) {
          if (!app.components) app.components = []
          app.components.push(mfe as ExtendedMicrofrontend)
          app.components.sort(this.sortMfesByExposedModule)
        }
      }
      // mark product if there are changes on microfrontends
      psp.changedMfe = (mfe.undeployed ?? false) || (mfe.deprecated ?? false) || psp.changedMfe
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

  public getImageUrl(url?: string): string {
    if (url) return url
    return prepareUrlPath(this.currentMfe?.remoteBaseUrl, environment.DEFAULT_PRODUCT_PATH)
  }

  /**
   * UI Events
   */
  public getFilterValue(ev: any): string {
    return ev.target.value
  }
  public onHideItemDetails() {
    this.displayDetails = false
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
    if (ev.items[0] && this.psProductsOrg.has(ev.items[0].productName!)) {
      const pspOrg = this.psProductsOrg.get(ev.items[0].productName!)
      if (pspOrg) this.fillForm(pspOrg)
    } else this.displayDetails = false
  }
  public onTargetSelect(ev: any): void {
    if (ev.items[0]) this.getWProduct(ev.items[0])
    else this.displayDetails = false
  }

  private getWProduct(wProduct: ExtendedProduct) {
    this.wProductApi
      .getProductById({ id: this.workspace?.id, productId: wProduct.id } as GetProductByIdRequestParams)
      .subscribe({
        next: (data) => {
          let item = data as ExtendedProduct
          //item.description = item.description
          item.bucket = wProduct.bucket
          item.microfrontends?.sort(this.sortMfesByAppId)
          // get product for extend information on mfes
          const pspOrg = this.psProductsOrg.get(item.productName!)
          if (pspOrg) {
            item.undeployed = pspOrg.undeployed
            item.changedMfe = pspOrg.changedMfe
            item.slots = pspOrg.slots
            item.apps = pspOrg.apps
            // enrich microfrontends with product store information
            if (item.microfrontends && pspOrg.microfrontends) {
              for (const ddiMfe of item.microfrontends)
                for (const mfe of pspOrg.microfrontends) {
                  // the workspace knows only about a Module (one module)!
                  if (mfe.appId === ddiMfe.appId && mfe.type === MicrofrontendType.Module) {
                    ddiMfe.deprecated = mfe.deprecated
                    ddiMfe.undeployed = mfe.undeployed
                  }
                }
            }
          }
          this.fillForm(item)
        },
        error: (err) => {
          console.error(err)
          this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.LOAD_ERROR' })
        },
        complete() {}
      })
  }

  private fillForm(item: ExtendedProduct) {
    this.displayDetails = true
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
          exposedModule: new FormControl(null)
        })
      )
      modules.at(i).patchValue({
        id: mfe.id,
        appId: mfe.appId,
        basePath: mfe.basePath,
        deprecated: psMfeModule?.deprecated,
        undeployed: psMfeModule?.undeployed,
        exposedModule: psMfeModule?.exposedModule
      })
    })
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
    this.displayDetails = false
    this.displayedDetailItem = undefined
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
            console.error(err)
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
  public onMoveToTarget(ev: any): void {
    this.clearForm()
    let itemCount = ev.items.length
    let successCounter = 0
    let errorCounter = 0
    for (let p of ev.items) {
      // register modules only
      const mfes = p.microfrontends?.filter((m: Microfrontend) => m.type === MicrofrontendType.Module) ?? []
      this.wProductApi
        .createProductInWorkspace({
          id: this.workspace?.id ?? '',
          createProductRequest: {
            productName: p.productName,
            baseUrl: p.baseUrl,
            microfrontends: mfes.map((m: any, i: number) => ({
              appId: m.appId,
              basePath: p.baseUrl + (mfes.length > 1 ? '-' + (i + 1) : '') // create initial unique base paths
            }))
          } as CreateProductRequest
        })
        .subscribe({
          next: (data) => {
            successCounter++
            // update id of the workspace item to be used on select
            const wp = this.wProducts.filter((wp) => wp.productName === p.productName)[0]
            wp.id = data.resource.id
            wp.bucket = 'TARGET'
            if (itemCount === successCounter + errorCounter)
              this.displayRegisterMessages('REGISTRATION', successCounter, errorCounter)
          },
          error: (err) => {
            console.error(err)
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

  /**
   * DEREGISTER
   *
   * This event fires after the items were moved from source to target => PrimeNG
   * Afterwards, Step through the list and on each error roll back the move.
   */
  public onMoveToSource(ev: any): void {
    this.clearForm()
    let itemCount = ev.items.length
    let successCounter = 0
    let errorCounter = 0
    for (let p of ev.items) {
      this.wProductApi
        .deleteProductById({
          id: this.workspace?.id ?? '',
          productId: p.id
        })
        .subscribe({
          next: () => {
            successCounter++
            const psp = this.psProducts.filter((psp) => psp.productName === p.productName)[0]
            psp.bucket = 'SOURCE'
            if (itemCount === successCounter + errorCounter)
              this.displayRegisterMessages('DEREGISTRATION', successCounter, errorCounter)
          },
          error: (err) => {
            errorCounter++
            // Revert change: remove item in source + add item in target list
            this.psProducts = this.psProducts.filter((psp) => psp.productName !== p.productName)
            this.wProducts.push(p)
            console.error(err)
            if (itemCount === successCounter + errorCounter)
              this.displayRegisterMessages('DEREGISTRATION', successCounter, errorCounter)
          }
        })
    }
  }

  private displayRegisterMessages(type: string, success: number, error: number) {
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
}
