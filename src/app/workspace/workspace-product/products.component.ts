import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { /*combineLatest, */ catchError, finalize, map, Observable, of, Subject, takeUntil } from 'rxjs'
//import { DataView } from 'primeng/dataview'
import { PickList } from 'primeng/picklist'

import { /*DataViewControlTranslations, */ PortalMessageService } from '@onecx/portal-integration-angular'
import {
  Product,
  ProductsAPIService,
  ProductStoreItem,
  Workspace,
  WorkspaceProductAPIService
} from 'src/app/shared/generated'
import { limitText } from 'src/app/shared/utils'

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductComponent implements OnInit, OnDestroy {
  @Input() workspace!: Workspace

  private readonly destroy$ = new Subject()
  private readonly debug = true // to be removed after finalization
  public exceptionKey: string | undefined
  public loading = true

  // dialog
  @ViewChild(PickList) picklist: PickList | undefined
  // @ViewChild(DataView) dv: DataView | undefined
  //public dataViewControlsTranslations: DataViewControlTranslations = {}

  public wProducts$!: Observable<Product[]>
  public psProducts$!: Observable<ProductStoreItem[]>
  public displayRegisterDialog = false
  public displayDeregisterDialog = false
  public viewMode = 'grid'
  public filterValue: string | undefined
  public filterBy = 'productName'
  public sourceFilterValue: string | undefined // product store
  public targetFilterValue: string | undefined // workspace
  public sortField = 'productName'
  public sortOrder = 1
  public limitText = limitText

  // data
  public products$!: Observable<Product[]>
  public selectedProduct: Product | undefined
  private urlPathPattern = '([^:]*)'

  constructor(
    private wProductApi: WorkspaceProductAPIService,
    private psProductApi: ProductsAPIService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {}

  ngOnInit() {
    console.log('onInit')
    //this.prepareTranslations()
    this.loadData()
  }
  public ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }

  private searchWProducts(): void {
    this.wProducts$ = this.wProductApi
      .getProductsForWorkspaceId({ id: this.workspace.id ?? '' })
      .pipe(
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
          console.error('getProductsForWorkspaceId():', err)
          return of([] as Product[])
        }),
        finalize(() => (this.loading = false))
      )
      .pipe(takeUntil(this.destroy$))
  }
  private searchPsProducts(): void {
    this.psProducts$ = this.psProductApi
      .searchAvailableProducts({ productStoreSearchCriteria: {} })
      .pipe(
        map((result) => {
          return result.stream ? result.stream : []
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
          console.error('getProductsForWorkspaceId():', err)
          return of([] as ProductStoreItem[])
        }),
        finalize(() => (this.loading = false))
      )
      .pipe(takeUntil(this.destroy$))
  }

  public loadData(): void {
    this.loading = true
    this.exceptionKey = undefined
    this.searchWProducts()
    this.searchPsProducts()
    /*
    combineLatest([this.searchWProducts(), this.searchPsProducts()]).pipe(
      map(([wp, psp]) => {
        wp.sort(this.sortProductsByDisplayName)
        psp.sort(this.sortProductsByDisplayName)
      })
    )*/
  }

  public sortProductsByDisplayName(a: Product, b: Product): number {
    return (a.displayName ? a.displayName.toUpperCase() : '').localeCompare(
      b.displayName ? b.displayName.toUpperCase() : ''
    )
  }

  /**
   * Dialog preparation
   */
  /*
  private prepareTranslations(): void {
    this.translate
      .get([
        'PRODUCT.NAME',
        'ACTIONS.SEARCH.SORT_BY',
        'ACTIONS.SEARCH.FILTER',
        'ACTIONS.SEARCH.FILTER_OF',
        'ACTIONS.SEARCH.SORT_DIRECTION_ASC',
        'ACTIONS.SEARCH.SORT_DIRECTION_DESC'
      ])
      .pipe(
        map((data) => {
          this.dataViewControlsTranslations = {
            sortDropdownPlaceholder: data['ACTIONS.SEARCH.SORT_BY'],
            filterInputPlaceholder: data['ACTIONS.SEARCH.FILTER'],
            filterInputTooltip: data['ACTIONS.SEARCH.FILTER.OF'] + data['PRODUCT.NAME'],
            sortOrderTooltips: {
              ascending: data['ACTIONS.SEARCH.SORT_DIRECTION_ASC'],
              descending: data['ACTIONS.SEARCH.SORT_DIRECTION_DESC']
            },
            sortDropdownTooltip: data['ACTIONS.SEARCH.SORT_BY']
          }
        })
      )
  }
*/

  /**
   * UI Events
   */
  public onDeregister(ev: any, product: Product) {
    ev.stopPropagation()
    console.log('onDeregister')
  }
  public onProductClick(ev: any, product: Product): void {
    ev.stopPropagation()
    console.log('onProductClick')
  }
  public onFilterChange(filter: string): void {
    console.log('onFilterChange')
    if (filter === '') {
      this.filterBy = 'productName'
    }
    // this.dv?.filter(filter, 'contains')
  }
  public getFilterValue(ev: any): string {
    return ev.target.value
  }
  public onSortChange(field: string): void {
    this.sortField = field
  }
  public onSortDirChange(asc: boolean): void {
    this.sortOrder = asc ? -1 : 1
  }
}
