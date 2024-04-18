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
  GetProductByIdRequestParams,
  CreateProductRequest,
  UpdateProductRequest,
  Product,
  ProductsAPIService,
  Workspace,
  WorkspaceProductAPIService
} from 'src/app/shared/generated'
import { MfeInfo } from '@onecx/portal-integration-angular'
import { AppStateService, PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { environment } from 'src/environments/environment'
import { limitText, prepareUrlPath } from 'src/app/shared/utils'

// combine Workspace Product with properties from product store (ProductStoreItem)
// => bucket is used to recognize the origin within HTML
type ExtendedProduct = Product & {
  bucket: 'SOURCE' | 'TARGET'
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
  public psProducts$!: Observable<ExtendedProduct[]>
  public psProducts!: ExtendedProduct[] // product store products which are not registered
  public psProductsOrg!: ExtendedProduct[] // all products in product store
  public currentMfe!: MfeInfo

  constructor(
    private wProductApi: WorkspaceProductAPIService,
    private psProductApi: ProductsAPIService,
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
      productName: new FormControl(null),
      displayName: new FormControl({ value: null, disabled: true }),
      description: new FormControl(null),
      baseUrl: new FormControl({ value: null, disabled: true }),
      mfes: this.fb.array([])
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
    this.psProducts$.subscribe()
  }
  public onLoadWProducts(): void {
    this.wProducts$.subscribe()
  }
  private searchWProducts(): void {
    this.wProducts$ = this.wProductApi
      .getProductsForWorkspaceId({ id: this.workspace?.id ?? '' })
      .pipe(
        map((products) => {
          this.wProducts = []
          for (let p of products) this.wProducts.push({ ...p, bucket: 'TARGET' } as ExtendedProduct)

          return this.wProducts.sort(this.sortProductsByDisplayName)
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
          console.error('getProductsForWorkspaceId():', err)
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
          this.psProductsOrg = []
          if (result.stream) {
            for (let p of result.stream) {
              this.psProductsOrg.push({ ...p, bucket: 'SOURCE' } as ExtendedProduct) // all
              const wp = this.wProducts.filter((wp) => wp.productName === p.productName)
              if (wp.length === 0) this.psProducts.push({ ...p, bucket: 'SOURCE' } as ExtendedProduct)
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

  public sortProductsByDisplayName(a: Product, b: Product): number {
    return (a.displayName ? a.displayName.toUpperCase() : '').localeCompare(
      b.displayName ? b.displayName.toUpperCase() : ''
    )
  }
  public sortMfesByAppId(a: Microfrontend, b: Microfrontend): number {
    return (a.appId ? a.appId.toUpperCase() : '').localeCompare(b.appId ? b.appId.toUpperCase() : '')
  }
  public getImageUrl(url?: string): string {
    if (url) return url
    return prepareUrlPath(this.currentMfe?.remoteBaseUrl, environment.DEFAULT_PRODUCT_IMAGE)
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
  public onSourceSelect(ev: any): void {
    if (ev.items[0]) this.fillForm(ev.items[0])
    else this.displayDetails = false
  }
  public onTargetSelect(ev: any): void {
    if (ev.items[0]) this.getWProduct(ev.items[0])
    else this.displayDetails = false
  }

  private getWProduct(item: ExtendedProduct) {
    this.wProductApi
      .getProductById({ id: this.workspace?.id, productId: item.id } as GetProductByIdRequestParams)
      .subscribe({
        next: (data) => {
          this.displayedDetailItem = data as ExtendedProduct
          this.displayedDetailItem.description = item.description
          this.displayedDetailItem.bucket = item.bucket
          this.fillForm(this.displayedDetailItem)
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
    this.formGroup.controls['productName'].setValue(this.displayedDetailItem.productName)
    this.formGroup.controls['displayName'].setValue(this.displayedDetailItem.displayName)
    this.formGroup.controls['description'].setValue(this.displayedDetailItem.description) // from item
    this.formGroup.controls['baseUrl'].setValue(this.displayedDetailItem.baseUrl)
    // dynamic form array for microfrontends
    const mfes = this.formGroup.get('mfes') as FormArray
    while (mfes.length > 0) mfes.removeAt(0) // clear
    if (this.displayedDetailItem.microfrontends) {
      // add a form group for each mfe
      this.displayedDetailItem.microfrontends.sort(this.sortMfesByAppId)
      this.displayedDetailItem.microfrontends.forEach((mfe, i) => {
        mfes.push(
          this.fb.group({
            id: new FormControl(null),
            appId: new FormControl(null),
            basePath: new FormControl(null, [Validators.required, Validators.maxLength(255)])
          })
        )
        mfes.at(i).patchValue({ appId: mfe.appId, basePath: mfe.basePath })
        if (this.displayedDetailItem?.bucket === 'SOURCE')
          (mfes.controls[i] as FormGroup).controls['basePath'].disable()
      })
    }
  }
  private clearForm() {
    this.displayDetails = false
    this.displayedDetailItem = undefined
    this.formGroup.reset()
  }
  get mfeControls(): any {
    return this.formGroup.get('mfes') as FormArray
  }

  /**
   * UI Events: SAVE
   */
  public onProductSave(ev: any): void {
    //ev.stopPropagation()
    this.editMode = false
    if (this.formGroup.valid && this.displayedDetailItem) {
      this.displayedDetailItem.baseUrl = this.formGroup.controls['baseUrl'].value
      this.displayedDetailItem.microfrontends = [] // clear
      const mfes = this.formGroup.get('mfes') as FormArray
      mfes.controls.forEach((item) => {
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
      console.log('onMoveToTarget', p.microfrontends)
      const mfes = p.microfrontends ?? []
      this.wProductApi
        .createProductInWorkspace({
          id: this.workspace?.id ?? '',
          createProductRequest: {
            productName: p.productName,
            baseUrl: p.baseUrl,
            microfrontends: mfes.map((m: any, i: number) => ({
              appId: m.appId,
              basePath: p.baseUrl + (p.microfrontends.length > 1 ? '-' + (i + 1) : '') // create initial unique base paths
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
