import { Component, Input, OnDestroy, OnInit, OnChanges, SimpleChanges, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { catchError, finalize, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { PickList } from 'primeng/picklist'

import { PortalMessageService } from '@onecx/portal-integration-angular'
import {
  CreateProductRequest,
  UpdateProductRequest,
  Product,
  ProductsAPIService,
  ProductStoreItem,
  Workspace,
  WorkspaceProductAPIService
} from 'src/app/shared/generated'
import {} from 'src/app/shared/utils'
import { AppStateService, MfeInfo, UserService } from '@onecx/portal-integration-angular'
import { environment } from 'src/environments/environment'
import { limitText, prepareUrlPath } from 'src/app/shared/utils'

// base: Product Store product, Extended with workspace details
type ExtendedProduct = ProductStoreItem & { id?: string; baseUrl?: string; modificationCount?: number }
export interface ProductDetailForm {
  productName: FormControl<string | null>
  displayName: FormControl<string | null>
  description: FormControl<string | null>
  baseUrl: FormControl<string | null>
}

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductComponent implements OnInit, OnChanges, OnDestroy {
  @Input() workspace!: Workspace | undefined

  private readonly destroy$ = new Subject()
  private readonly debug = true // to be removed after finalization
  public exceptionKey: string | undefined
  public loading = true
  public editMode = false
  public displayDetails = false
  public displayedDetailItem: ExtendedProduct | undefined = undefined
  public displayedDetailsOrigin = 'WORKSPACE' || 'PRODUCTSTORE'
  public viewMode = 'grid'
  public filterValue: string | undefined
  public sourceFilterValue: string | undefined // product store
  public targetFilterValue: string | undefined // workspace
  public formGroup: FormGroup<ProductDetailForm>
  public hasRegisterPermission = false

  @ViewChild(PickList) picklist: PickList | undefined

  limitText = limitText
  environment = environment
  prepareUrlPath = prepareUrlPath

  // data
  public wProducts$!: Observable<ExtendedProduct[]>
  public wProducts!: ExtendedProduct[]
  public psProducts$!: Observable<ExtendedProduct[]>
  public psProducts!: ProductStoreItem[]
  public currentMfe!: MfeInfo

  constructor(
    private wProductApi: WorkspaceProductAPIService,
    private psProductApi: ProductsAPIService,
    private user: UserService,
    private appState: AppStateService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {
    this.hasRegisterPermission = this.user.hasPermission('WORKSPACE_PRODUCTS#REGISTER')
    this.appState.currentMfe$.pipe(map((mfe) => (this.currentMfe = mfe))).subscribe()
    this.formGroup = new FormGroup<ProductDetailForm>({
      productName: new FormControl(null),
      displayName: new FormControl({ value: null, disabled: true }),
      description: new FormControl(null),
      baseUrl: new FormControl(null, [Validators.required, Validators.maxLength(255)])
    })
  }

  ngOnInit() {
    console.log('onInit')
    //this.prepareTranslations()
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
  }

  private searchWProducts(): void {
    this.wProducts$ = this.wProductApi
      .getProductsForWorkspaceId({ id: this.workspace?.id ?? '' })
      .pipe(
        map((products) => {
          this.wProducts = []
          for (let p of products) {
            this.wProducts.push({
              id: p.id,
              modificationCount: p.modificationCount,
              displayName: p.displayName,
              productName: p.productName,
              baseUrl: p.baseUrl,
              microfrontends: p.microfrontends
            } as ExtendedProduct)
          }
          return this.wProducts.sort(this.sortProductsByDisplayName)
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
          console.error('getProductsForWorkspaceId():', err)
          return of([] as Product[])
        })
      )
      .pipe(takeUntil(this.destroy$))
  }

  /**
   * GET all (!) Product Store products which are not yet registered
   */
  private searchPsProducts(): void {
    this.psProducts$ = this.wProducts$.pipe(
      switchMap((wProducts) => {
        return this.psProductApi
          .searchAvailableProducts({ productStoreSearchCriteria: {} })
          .pipe(
            map((result) => {
              // filter: return psProducts which are not yet registered
              this.psProducts = []
              if (result.stream) {
                for (let p of result.stream) {
                  if (this.wProducts.filter((wp) => wp.productName === p.productName).length === 0)
                    this.psProducts.push(p)
                }
              }
              return this.psProducts.sort(this.sortProductsByDisplayName)
            }),
            catchError((err) => {
              this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
              console.error('searchAvailableProducts():', err)
              return of([] as Product[])
            }),
            finalize(() => (this.loading = false))
          )
          .pipe(takeUntil(this.destroy$))
      })
    )
  }

  public sortProductsByDisplayName(a: Product, b: Product): number {
    return (a.displayName ? a.displayName.toUpperCase() : '').localeCompare(
      b.displayName ? b.displayName.toUpperCase() : ''
    )
  }

  public getImageUrl(url?: string): string {
    return url ? url : prepareUrlPath(this.currentMfe?.remoteBaseUrl, environment.DEFAULT_PRODUCT_IMAGE)
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
  public onBaseUrlChange() {
    if (this.displayedDetailItem)
      this.displayedDetailItem.baseUrl = this.formGroup.controls['baseUrl'].value ?? undefined
  }
  public onSourceSelect(ev: any): void {
    console.log('onSourceSelect', ev.items)
    this.displayedDetailsOrigin = 'PRODUCTSTORE'
    this.fillForm(ev.items[0])
  }
  public onTargetSelect(ev: any): void {
    console.log('onTargetSelect', ev.items)
    this.displayedDetailsOrigin = 'WORKSPACE'
    this.fillForm(ev.items[0])
  }

  private fillForm(item: any) {
    this.displayDetails = true
    if (this.displayedDetailsOrigin === 'PRODUCTSTORE') {
      this.formGroup.controls['baseUrl'].disable()
    }
    if (this.displayedDetailsOrigin === 'WORKSPACE') {
      this.displayedDetailItem = item
      this.formGroup.controls['baseUrl'].enable()
    }
    this.formGroup.controls['productName'].setValue(item.productName)
    this.formGroup.controls['displayName'].setValue(item.displayName)
    this.formGroup.controls['description'].setValue(item.description)
    this.formGroup.controls['baseUrl'].setValue(item.baseUrl)
  }
  private clearForm() {
    this.displayDetails = false
    this.displayedDetailItem = undefined
    this.formGroup.reset()
  }

  public onProductSave(ev: any): void {
    ev.stopPropagation()
    this.editMode = false
    console.log(this.formGroup.valid)
    if (this.formGroup.valid) {
      this.wProductApi
        .updateProductById({
          id: this.workspace?.id ?? '',
          productId: this.displayedDetailItem?.id ?? '',
          updateProductRequest: {
            modificationCount: this.displayedDetailItem?.modificationCount,
            baseUrl: this.displayedDetailItem?.baseUrl,
            microfrontends: this.displayedDetailItem?.microfrontends
          } as UpdateProductRequest
        })
        .subscribe({
          next: (data) => {
            this.displayedDetailItem = data.resource
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
   */
  public onMoveToTarget(ev: any): void {
    console.log('onMoveToTarget', ev.items)
    this.clearForm()
    let itemCount = ev.items.length
    let successCounter = 0
    let errorCounter = 0
    for (let p of ev.items) {
      for (let mfe of p.microfrontends) mfe.basePath = p.baseUrl
      this.wProductApi
        .createProductInWorkspace({
          id: this.workspace?.id ?? '',
          createProductRequest: {
            productName: p.productName,
            baseUrl: p.baseUrl,
            microfrontends: p.microfrontends
          } as CreateProductRequest
        })
        .subscribe({
          next: (data) => {
            successCounter++
            // update id
            this.wProducts.filter((wp) => wp.productName === p.productName)[0].id = data.resource.id
            if (itemCount === successCounter + errorCounter)
              this.displayRegisterMessages('REGISTRATION', successCounter, errorCounter)
          },
          error: (err) => {
            console.error(err)
            errorCounter++
            // Revert change: move item back to original list
            this.wProducts = this.wProducts.filter((wp) => wp.productName !== p.productName)
            this.psProducts.push(p)
            if (itemCount === successCounter + errorCounter)
              this.displayRegisterMessages('REGISTRATION', successCounter, errorCounter)
          },
          complete() {}
        })
    }
  }

  /**
   * DEREGISTER
   */
  public onMoveToSource(ev: any): void {
    console.log('onMoveToSource', ev.items)
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
            if (itemCount === successCounter + errorCounter)
              this.displayRegisterMessages('DEREGISTRATION', successCounter, errorCounter)
          },
          error: (err) => {
            errorCounter++
            // Revert change: move item back to original list
            this.psProducts = this.psProducts.filter((psp) => psp.productName !== p.productName)
            this.wProducts.push(p)
            console.error(err)
            if (itemCount === successCounter + errorCounter)
              this.displayRegisterMessages('DEREGISTRATION', successCounter, errorCounter)
          },
          complete() {}
        })
    }
  }

  private displayRegisterMessages(type: string, success: number, error: number) {
    console.log('displayRegisterMessages s:' + success + ' e:' + error)
    if (success > 0)
      if (success === 1) this.msgService.success({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.' + type + '_OK' })
      else this.msgService.success({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.' + type + 'S_OK' })
    if (error > 0)
      if (error === 1) this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.' + type + '_NOK' })
      else this.msgService.error({ summaryKey: 'DIALOG.PRODUCTS.MESSAGES.' + type + 'S_NOK' })
  }
}
