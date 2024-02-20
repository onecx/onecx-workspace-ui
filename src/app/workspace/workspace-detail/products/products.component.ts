/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core'
//import { HttpErrorResponse } from '@angular/common/http'
//import { FormControl, Validators } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import { Observable, Subject, catchError, finalize, map, of, takeUntil } from 'rxjs'
//import { SelectItem } from 'primeng/api'
import { DataView } from 'primeng/dataview'

import { DataViewControlTranslations, PortalMessageService } from '@onecx/portal-integration-angular'
import { Product, Workspace, ProductAPIService } from 'src/app/shared/generated'
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
  // dialog
  public dataViewControlsTranslations: DataViewControlTranslations = {}
  @ViewChild(DataView) dv: DataView | undefined
  public displayRegisterDialog = false
  public displayDeregisterDialog = false
  public viewMode = 'grid'
  public filterValue: string | undefined
  public filterBy = 'name'
  public sortField = 'name'
  public sortOrder = 1
  public limitText = limitText

  // data
  public products$!: Observable<Product[]>
  public loading = true
  public dataAccessIssue = false
  public exceptionKey = ''
  public selectedProduct: Product | undefined
  private urlPathPattern = '([^:]*)'

  constructor(
    private productApi: ProductAPIService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {}

  ngOnInit() {
    this.prepareTranslations()
    this.log('onInit')
    this.loadData()
  }
  public ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }
  private log(text: string, obj?: object): void {
    if (this.debug) {
      if (obj) console.log('products: ' + text, obj)
      else console.log('products: ' + text)
    }
  }

  public loadData() {
    console.log('loadData')
    this.loading = true
    this.dataAccessIssue = false
    this.exceptionKey = ''
    // prepare requests and catching errors
    this.products$ = this.productApi
      .getProductsForWorkspaceId({ id: this.workspace.id ?? '' })
      .pipe(finalize(() => (this.loading = false)))
      .pipe(catchError((error) => of(error)))
      .pipe(takeUntil(this.destroy$))
  }

  /**
   * Dialog preparation
   */
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
    this.log('onFilterChange')
    if (filter === '') {
      this.filterBy = 'productName'
    }
    this.dv?.filter(filter, 'contains')
  }
  public onSortChange(field: string): void {
    this.sortField = field
  }
  public onSortDirChange(asc: boolean): void {
    this.sortOrder = asc ? -1 : 1
  }
}
