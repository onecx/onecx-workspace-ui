import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import {
  Subject,
  catchError,
  finalize,
  map,
  mergeMap,
  of,
  switchMap,
  takeUntil,
  Observable,
  firstValueFrom
} from 'rxjs'
import { SelectItem } from 'primeng/api'

import { DataViewControlTranslations } from '@onecx/portal-integration-angular'
import { PortalMessageService, UserService, WorkspaceService } from '@onecx/angular-integration-interface'

import {
  GetSlotsForWorkspaceRequestParams,
  ProductAPIService,
  ProductStoreItem,
  Workspace,
  Slot, // id, workspaceId, name, components[]
  SlotPS, // name, undeployed, deprecated
  SlotComponent, // productName, appId, name
  SlotAPIService,
  WorkspaceProductAPIService
} from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'

type ChangeStatus = { changes?: boolean; new?: boolean; exists?: boolean; deprecated?: boolean; undeployed?: boolean }
export type SlotType = 'WORKSPACE' | 'UNUSED' | 'CHANGES'
export type SlotFilterType = 'ALL' | SlotType
export type ExtendedSelectItem = SelectItem & { tooltipKey?: string }
export type ChangeMode = 'VIEW' | 'EDIT'
export type PSSlot = SlotPS & { pName: string; pDisplayName: string }

// workspace slot data extended with status from product store
export type ExtendedComponent = SlotComponent & ChangeStatus & { productUnregistered?: boolean }
export type ExtendedSlot = Slot &
  ChangeStatus & {
    productNames: string[]
    type: SlotType[]
    psSlots: PSSlot[] // corresponding product store slots
    psComponents: ExtendedComponent[] // corresponding product store components
  }

@Component({
  selector: 'app-workspace-slots',
  templateUrl: './workspace-slots.component.html',
  styleUrls: ['./workspace-slots.component.scss']
})
export class WorkspaceSlotsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() workspace!: Workspace | undefined

  // data
  private readonly destroy$ = new Subject()
  public wProducts$!: Observable<string[]>
  public wProductNames: string[] = [] // simple list of names of registered products in workspace
  public wSlots$!: Observable<string[]> // workspace slots
  public slots: ExtendedSlot[] = [] // collected slots from workspace and product store to be displayed
  public slotsFiltered: ExtendedSlot[] = [] // filtered slot collection
  public slotsInternal: ExtendedSlot[] = [] // internal workspace slot collection: decoupled from displaying
  public psSlots$!: Observable<string[]> // product store slots
  public psComponents: ExtendedComponent[] = []
  public item4Detail: ExtendedSlot | undefined
  public productEndpointExist = false

  // dialog
  public dataViewControlsTranslations$: Observable<DataViewControlTranslations> | undefined

  public filterValue: string | undefined
  public filterByDefault = 'name'
  public filterBy = this.filterByDefault
  public sortField = 'name,changes'
  public sortOrder = 1
  public quickFilterValue: SlotFilterType = 'ALL'
  public quickFilterOptions$: Observable<SelectItem[]> | undefined
  public quickFilterCount = ''
  public exceptionKey: string | undefined = undefined
  public psLoading = false
  public wpLoading = false
  public wsLoading = false
  public changeMode: ChangeMode = 'VIEW'
  public hasEditPermission = false
  public showSlotDetailDialog = false

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly user: UserService,
    private readonly slotApi: SlotAPIService,
    private readonly psProductApi: ProductAPIService,
    private readonly wProductApi: WorkspaceProductAPIService,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService
  ) {
    this.hasEditPermission = this.user.hasPermission('WORKSPACE_SLOT#EDIT')
  }

  public ngOnInit() {
    this.prepareQuickFilter()
    this.prepareTranslations()
  }
  public ngOnChanges(changes: SimpleChanges): void {
    if (this.workspace && changes['workspace']) {
      this.loadData()
      // check detail endpoint exists
      this.productEndpointExist = Utils.doesEndpointExist(
        this.workspaceService,
        'onecx-product-store',
        'onecx-product-store-ui',
        'slots'
      )
    }
  }
  public ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }

  public onReload() {
    this.loadData()
  }
  public loadData(): void {
    this.exceptionKey = undefined
    this.declareWorkspaceProducts()
    this.declareWorkspaceSlots()
    this.getPsSlotsAndComponents()
    firstValueFrom(
      this.wSlots$.pipe(
        mergeMap(() => this.wProducts$),
        switchMap(() => this.psSlots$)
      )
    )
  }

  // get registered products
  private declareWorkspaceProducts(): void {
    if (this.workspace) {
      this.wpLoading = true
      this.wProducts$ = this.wProductApi
        .getProductsByWorkspaceId({ id: this.workspace.id! })
        .pipe(
          map((products) => {
            this.wProductNames = []
            for (const p of products) if (p.productName) this.wProductNames.push(p.productName)
            return []
          }),
          catchError((err) => {
            this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
            console.error('getProductsByWorkspaceId', err)
            return of([])
          }),
          finalize(() => (this.wpLoading = false))
        )
        .pipe(takeUntil(this.destroy$))
    }
  }

  /**
   * SEARCH
   */
  // Workspace Slots which were added at time of registration products
  // a) the good case: slot and assigned components still exist in product store
  // b) the bad case:  slot or assigned components are no longer available in the product store
  private declareWorkspaceSlots(): void {
    if (this.workspace) {
      this.wsLoading = true
      this.wSlots$ = this.slotApi
        .getSlotsForWorkspace({ id: this.workspace?.id } as GetSlotsForWorkspaceRequestParams)
        .pipe(
          takeUntil(this.destroy$),
          map((res) => {
            this.slotsInternal = []
            if (res.slots)
              // cases: a + b
              for (const s of res.slots)
                this.slotsInternal.push({
                  ...s, // contains also the registered components
                  productNames: [], // to be filled by matching with PS slots
                  type: ['WORKSPACE'],
                  psSlots: [],
                  psComponents: [],
                  // initial state...to be enriched later by product store slot states
                  new: false,
                  exists: false, // true if exists in PS
                  changes: false,
                  undeployed: false,
                  deprecated: false
                } as ExtendedSlot)
            return []
          }),
          catchError((err) => {
            this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.SLOTS'
            console.error('getSlotsForWorkspace', err)
            return of([])
          }),
          finalize(() => (this.wsLoading = false))
        )
    }
  }

  // All declared Slots of product store products: containing deployment information
  private getPsSlotsAndComponents(): void {
    this.psLoading = true
    this.psSlots$ = this.psProductApi.searchAvailableProducts({ productStoreSearchCriteria: { pageSize: 1000 } }).pipe(
      map((res) => {
        if (res.stream) {
          // build internal database (use slotsInternal as long as the slot list is not final)
          const psSlots = this.extractPsSlots(res.stream)
          // collect components to be used also in slot detail
          this.psComponents = this.extractPsComponents(res.stream)
          this.syncComponentState(this.slotsInternal, this.psComponents)
          this.addUnregisteredSlots(psSlots) // added to slotsInternal
          this.addLostSlotComponents(this.slotsInternal)
          // finalize
          this.slotsInternal.sort(this.sortSlotsByName)
          this.slots = this.slotsInternal // to be displayed final slot list
          this.onQuickFilterChange({ value: this.quickFilterValue })
        }
        return []
      }),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
        console.error('searchAvailableProducts', err)
        return of([])
      }),
      finalize(() => (this.psLoading = false))
    )
  }

  public sortSlotsByName(a: Slot, b: Slot): number {
    return a.name!.toUpperCase().localeCompare(b.name!.toUpperCase())
  }

  // Collect PS Slots
  // essential for listing products which using a slot
  private extractPsSlots(products: ProductStoreItem[]): ExtendedSlot[] {
    const psSlots: ExtendedSlot[] = []
    for (const p of products) {
      if (p.slots) for (const psS of p.slots) this.addPsSlot(p, psS, psSlots)
    }
    return psSlots
  }

  // Add consolidated (unique) PS slots (condense slots by different products)
  private addPsSlot(product: ProductStoreItem, psSlot: SlotPS, psSlots: ExtendedSlot[]): void {
    let ps: ExtendedSlot | undefined = psSlots.find((s) => s.name === psSlot.name) // slot already existing by another product?
    if (ps) {
      ps.changes = ps.changes || psSlot.undeployed === true || psSlot.deprecated === true // any change?
      if (ps.changes) ps.type.push('CHANGES')
      if (!ps.productNames.includes(product.productName!)) ps.productNames.push(product.productName!)
    } else {
      ps = {
        ...psSlot,
        id: undefined, // no need to have this
        productNames: [product.productName],
        // change state
        changes: psSlot.undeployed === true || psSlot.deprecated === true,
        undeployed: psSlot.undeployed === true,
        deprecated: psSlot.deprecated === true,
        type: ['UNUSED'] // initial state
      } as ExtendedSlot
      if (ps.changes) ps.type.push('CHANGES')
      psSlots.push(ps)
    }
    //
    // select workspace slot with same name (there is no productname for slots in workspace)
    const wSlot = this.slotsInternal.find((s) => s.name === ps.name)
    if (wSlot && !wSlot.productNames.includes(product.productName!)) {
      // slot already assigned to product in workspace => enrich product list and state
      wSlot.productNames.push(product.productName!)
    }
    if (wSlot?.psSlots) {
      wSlot.psSlots.push({ ...ps, pName: product.productName!, pDisplayName: product.displayName! })
      // consolidate slot state (aware of the state of current ps together with previous ones)
      wSlot.exists = true
      wSlot.changes = wSlot.changes || ps.changes // inherit change status
      wSlot.deprecated = wSlot.deprecated || ps.deprecated
      wSlot.undeployed = wSlot.undeployed || ps.undeployed
      if (wSlot.changes && !wSlot.type.includes('CHANGES')) wSlot.type.push('CHANGES')
    }
  }

  // Collect PS components
  private extractPsComponents(psProducts: ProductStoreItem[]): ExtendedComponent[] {
    const psComponents: ExtendedComponent[] = []
    for (const psp of psProducts) {
      if (psp.microfrontends && psp.microfrontends.length > 0) {
        // only remote components
        for (const c of psp.microfrontends.filter((mfe) => mfe.type === 'COMPONENT'))
          psComponents.push({
            productName: psp.productName,
            appId: c.appId,
            name: c.exposedModule,
            exists: true,
            undeployed: c.undeployed ?? false,
            deprecated: c.deprecated ?? false
          } as ExtendedComponent)
      }
    }
    return psComponents
  }

  // Enrich workspace slot state with PS slot state
  private syncComponentState(wSlots: ExtendedSlot[], psComponents: ExtendedComponent[]): void {
    for (const ws of wSlots) {
      // components assigned to workspace slot
      if (ws.components) {
        for (const wc of ws.components) {
          // component product still registered?
          if (!this.wProductNames.includes(wc.productName)) {
            ws.changes = true
            if (!ws.type.includes('CHANGES')) ws.type.push('CHANGES')
          }
          this.assignPSComponent(
            ws,
            psComponents.find((pc) => pc.productName === wc.productName && pc.appId === wc.appId && pc.name === wc.name)
          )
        }
      }
    }
  }

  private assignPSComponent(ws: ExtendedSlot, psc: ExtendedComponent | undefined): void {
    if (psc) {
      psc.productUnregistered = !this.wProductNames.includes(psc.productName)
      ws.psComponents.push(psc)
      // extend consolidated slot state with component state
      ws.changes = ws.changes || psc.undeployed || psc.deprecated
      if (ws.changes && !ws.type.includes('CHANGES')) ws.type.push('CHANGES')
    }
  }

  // add new slots existing in PS which are not existing in Workspace but part of a registered product)
  private addUnregisteredSlots(psSlots: ExtendedSlot[]): void {
    for (const pn of this.wProductNames)
      for (const ps of psSlots.filter((s) => s.productNames.includes(pn)))
        if (!this.slotsInternal.some((ws) => ws.name === ps.name))
          this.slotsInternal.push({
            ...ps,
            new: true
          })
  }
  // add components assigned to workspace slot but not available in product store anymore
  private addLostSlotComponents(wSlots: ExtendedSlot[]): void {
    for (const ws of wSlots)
      if (ws.components)
        for (const wc of ws.components)
          if (!ws.psComponents?.find((psc) => psc.name === wc.name)) {
            ws.psComponents?.push({ ...wc, undeployed: true, deprecated: false, exists: false })
            ws.changes = true
            if (!ws.type.includes('CHANGES')) ws.type.push('CHANGES')
          }
  }

  /**
   * UI Events
   */
  public onQuickFilterChange(ev: any): void {
    this.slotsFiltered = this.slots.filter((s) => (ev.value === 'ALL' ? s : s.type.includes(ev.value)))
    this.quickFilterValue = ev.value
  }
  public onSortChange(field: string): void {
    this.sortField = field
  }
  public onSortDirChange(asc: boolean): void {
    this.sortOrder = asc ? -1 : 1
  }

  /**
   * UI Events => DETAIL actions
   */
  public onSlotDetail(ev: Event, slot: ExtendedSlot): void {
    ev.stopPropagation()
    this.item4Detail = { ...slot }
    this.changeMode = this.hasEditPermission ? 'EDIT' : 'VIEW'
    this.showSlotDetailDialog = true
  }

  // detail dialog closed - on changes: reload data
  public onSlotDetailClosed(changed: boolean) {
    if (changed && this.changeMode === 'EDIT') {
      this.loadData()
    }
    this.item4Detail = undefined
    this.changeMode = 'VIEW'
    this.showSlotDetailDialog = false
  }

  /**
   * Dialog preparation
   */
  private prepareTranslations(): void {
    this.dataViewControlsTranslations$ = this.translate
      .get(['SLOT.NAME', 'ROLE.TYPE', 'DIALOG.DATAVIEW.FILTER', 'DIALOG.DATAVIEW.FILTER_OF', 'DIALOG.DATAVIEW.SORT_BY'])
      .pipe(
        map((data) => {
          return {
            filterInputPlaceholder: data['DIALOG.DATAVIEW.FILTER'],
            filterInputTooltip: data['DIALOG.DATAVIEW.FILTER_OF'] + data['SLOT.NAME'],
            sortDropdownTooltip: data['DIALOG.DATAVIEW.SORT_BY'],
            sortDropdownPlaceholder: data['DIALOG.DATAVIEW.SORT_BY']
          } as DataViewControlTranslations
        })
      )
  }

  public prepareQuickFilter(): void {
    this.quickFilterOptions$ = this.translate
      .get([
        'DIALOG.SLOT.QUICK_FILTER.ALL',
        'DIALOG.SLOT.QUICK_FILTER.CHANGES',
        'DIALOG.SLOT.QUICK_FILTER.WORKSPACE',
        'DIALOG.SLOT.QUICK_FILTER.UNUSED'
      ])
      .pipe(
        map((data) => {
          return [
            { label: data['DIALOG.SLOT.QUICK_FILTER.ALL'], value: 'ALL' },
            { label: data['DIALOG.SLOT.QUICK_FILTER.UNUSED'], value: 'UNUSED' },
            { label: data['DIALOG.SLOT.QUICK_FILTER.WORKSPACE'], value: 'WORKSPACE' },
            { label: data['DIALOG.SLOT.QUICK_FILTER.CHANGES'], value: 'CHANGES' }
          ]
        })
      )
  }

  public getProductEndpointUrl$(): Observable<string | undefined> {
    if (this.productEndpointExist)
      return this.workspaceService.getUrl('onecx-product-store', 'onecx-product-store-ui', 'slots')
    return of(undefined)
  }
}
