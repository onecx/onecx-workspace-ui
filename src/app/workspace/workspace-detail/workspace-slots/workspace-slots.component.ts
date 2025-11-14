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
import { DataView } from 'primeng/dataview'

import { DataViewControlTranslations } from '@onecx/portal-integration-angular'
import { PortalMessageService, UserService, WorkspaceService } from '@onecx/angular-integration-interface'

import {
  CreateSlotRequest,
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
export type SlotType = 'WORKSPACE' | 'UNREGISTERED' | 'OUTDATED' | 'WORKSPACE,OUTDATED'
export type SlotFilterType = 'ALL' | SlotType
export type ExtendedSelectItem = SelectItem & { tooltipKey?: string }
export type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT' | 'COPY' | 'DELETE'
export type PSSlot = SlotPS & { pName: string; pDisplayName: string }

// workspace slot data combined with status from product store
export type ExtendedComponent = SlotComponent & ChangeStatus & { productUnregistered?: boolean }
export type CombinedSlot = Slot &
  ChangeStatus & {
    productName?: string
    type: SlotType
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
  public wProductNames: string[] = [] // simple list of product names registered in workspace
  public wSlots$!: Observable<string[]>
  public wSlots: CombinedSlot[] = [] // displayed slot collection: final state
  public wSlotsIntern: CombinedSlot[] = [] // internal workspace slot collection: decoupled from displaying
  public psSlots$!: Observable<string[]>
  public psComponents: ExtendedComponent[] = []
  public item4Detail: CombinedSlot | undefined
  public productEndpointExist = false

  // dialog
  public dataViewControlsTranslations$: Observable<DataViewControlTranslations> | undefined

  public filterValue: string | undefined
  public filterByDefault = 'name,type'
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
  public hasCreatePermission = false
  public hasDeletePermission = false
  public hasEditPermission = false
  public showSlotDetailDialog = false
  public showSlotDeleteDialog = false

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
    this.hasCreatePermission = this.user.hasPermission('WORKSPACE_SLOT#CREATE')
    this.hasDeletePermission = this.user.hasPermission('WORKSPACE_SLOT#DELETE')
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
            this.wSlotsIntern = []
            if (res.slots)
              // cases: a + b
              for (const s of res.slots)
                this.wSlotsIntern.push({
                  ...s, // contains also the registered components
                  type: 'WORKSPACE',
                  psSlots: [],
                  psComponents: [],
                  // initial state...to be enriched later by product store slot states
                  new: false,
                  exists: false, // true if exists in PS
                  changes: false,
                  undeployed: false,
                  deprecated: false
                } as CombinedSlot)
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
          // build internal database
          const psSlots = this.extractPsSlots(res.stream)
          this.psComponents = this.extractPsComponents(res.stream)
          this.syncComponentState(this.wSlotsIntern, this.psComponents)
          this.addUnregisteredSlots(psSlots)
          this.addLostSlotComponents(this.wSlotsIntern)
          // finalize
          this.wSlotsIntern.sort(this.sortSlotsByName)
          this.wSlots = this.wSlotsIntern // to be displayed
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
  private extractPsSlots(products: ProductStoreItem[]): CombinedSlot[] {
    const psSlots: CombinedSlot[] = []
    for (const p of products) {
      if (p.slots) for (const psS of p.slots) this.addPsSlot(p, psS, psSlots)
    }
    return psSlots
  }

  private addPsSlot(p: ProductStoreItem, psS: SlotPS, psSlots: CombinedSlot[]): void {
    const ps: CombinedSlot = {
      ...psS,
      productName: p.productName,
      // state
      changes: psS.undeployed === true || psS.deprecated === true, // any change?
      undeployed: psS.undeployed === true,
      deprecated: psS.deprecated === true
    } as CombinedSlot
    psSlots.push(ps)
    //
    // select workspace slot with same name (there is no productname for slots in workspace)
    const wsSlot = this.wSlotsIntern.find((s) => s.name === ps.name)
    if (wsSlot && wsSlot.psSlots) {
      wsSlot.psSlots.push({ ...ps, pName: p.productName!, pDisplayName: p.displayName! })
      // consolidate slot state (aware of the state of current ps together with previous ones)
      wsSlot.exists = true
      wsSlot.changes = wsSlot.changes || ps.changes // inherit change status
      wsSlot.deprecated = wsSlot.deprecated || ps.deprecated
      wsSlot.undeployed = wsSlot.undeployed || ps.undeployed
      if (wsSlot.changes) wsSlot.type = 'WORKSPACE,OUTDATED'
    }
  }

  // Collect PS components
  private extractPsComponents(products: ProductStoreItem[]): ExtendedComponent[] {
    const psComponents: ExtendedComponent[] = []
    for (const p of products) {
      if (p.microfrontends && p.microfrontends.length > 0) {
        // only remote components
        for (const c of p.microfrontends.filter((mfe) => mfe.type === 'COMPONENT'))
          psComponents.push({
            productName: p.productName,
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

  // Enrich workspace slot state with PS component state
  private syncComponentState(wSlots: CombinedSlot[], psComponents: ExtendedComponent[]): void {
    for (const ws of wSlots)
      if (ws.components)
        for (const c of ws.components) {
          // component product still registered?
          let productUnregistered = false
          if (!this.wProductNames.includes(c.productName)) {
            ws.changes = true
            productUnregistered = true
          }
          // assigned components
          // get ps components with the same product/app and component name to get their current state
          const psc = psComponents.find(
            (pc) => pc.productName === c.productName && pc.appId === c.appId && pc.name === c.name
          )
          if (psc) {
            psc.productUnregistered = productUnregistered
            ws.psComponents.push(psc)
            // extend consolidated slot state with component state
            ws.changes = ws.changes || psc.undeployed || psc.deprecated
          }
        }
  }

  // add new slots existing in PS which are not existing in Workspace but part of a registered product)
  private addUnregisteredSlots(psSlots: CombinedSlot[]): void {
    for (const pn of this.wProductNames)
      for (const ps of psSlots.filter((s) => s.productName === pn))
        if (!this.wSlotsIntern.some((ws) => ws.name === ps.name)) {
          this.wSlotsIntern.push({ ...ps, id: undefined, new: true, type: 'UNREGISTERED' })
        }
  }
  // add components assigned to workspace slot but not available in product store anymore
  private addLostSlotComponents(wSlots: CombinedSlot[]): void {
    for (const slot of wSlots)
      if (slot.components)
        for (const wc of slot.components)
          if (!slot.psComponents?.find((psc) => psc.name === wc.name)) {
            slot.psComponents?.push({ ...wc, undeployed: true, deprecated: false, exists: false })
            slot.changes = true
          }
  }

  /**
   * SLOT CHANGES - direct operation in UI
   */
  public onAddSlot(ev: Event, slot: CombinedSlot): void {
    ev.stopPropagation()
    this.slotApi
      .createSlot({
        createSlotRequest: { workspaceId: this.workspace?.id, name: slot.name } as CreateSlotRequest
      })
      .subscribe({
        next: (data) => {
          this.msgService.success({ summaryKey: 'ACTIONS.CREATE.SLOT.MESSAGE_OK' })
          this.ps2wTransferSlot(data)
        },
        error: (err) => {
          this.msgService.error({ summaryKey: 'ACTIONS.CREATE.SLOT.MESSAGE_NOK' })
          console.error('createSlot', err)
        }
      })
  }
  private ps2wTransferSlot(slot: Slot): void {
    const wSlot = this.wSlots.find((ws) => ws.name === slot?.name)
    if (wSlot) {
      wSlot.id = slot.id
      wSlot.new = false
      wSlot.type = 'WORKSPACE'
      wSlot.workspaceId = slot.workspaceId
      wSlot.components = []
      wSlot.modificationCount = 0
      wSlot.creationDate = slot.creationDate
      wSlot.creationUser = slot.creationUser
      wSlot.modificationDate = slot.modificationDate
      wSlot.modificationUser = slot.modificationUser
    }
  }

  public onDeleteSlot(ev: Event, slot: CombinedSlot): void {
    ev.stopPropagation()
    if (slot)
      this.slotApi.deleteSlotById({ id: slot.id! }).subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.SLOT.MESSAGE_OK' })
          this.w2psTransferSlot(slot)
        },
        error: (err) => {
          this.msgService.error({ summaryKey: 'ACTIONS.DELETE.SLOT.MESSAGE_NOK' })
          console.error('deleteSlotById', err)
        }
      })
  }
  private w2psTransferSlot(slot: CombinedSlot): void {
    const psSlot = this.wSlotsIntern.find((ws) => ws.name === slot?.name)
    if (psSlot) {
      psSlot.id = undefined
      psSlot.new = true
      psSlot.type = 'UNREGISTERED'
      psSlot.workspaceId = undefined
      psSlot.components = undefined
      psSlot.modificationCount = 0
      psSlot.creationDate = undefined
      psSlot.creationUser = undefined
      psSlot.modificationDate = undefined
      psSlot.modificationUser = undefined
    }
  }

  /**
   * UI Events
   */
  public onQuickFilterChange(ev: any, dv: DataView): void {
    if (ev.value === 'ALL') {
      this.filterBy = this.filterByDefault
      dv.filter('')
    } else {
      this.filterBy = 'type'
      dv.filter(ev.value)
    }
    this.quickFilterValue = ev.value
  }
  public onFilterChange(filter: string, dv: DataView): void {
    if (filter === '') {
      this.onQuickFilterChange({ value: 'ALL' }, dv)
    } else {
      this.filterBy = 'name'
      dv.filter(filter)
    }
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
  public onSlotDetail(ev: Event, slot: CombinedSlot): void {
    ev.stopPropagation()
    if (slot.new) return
    this.item4Detail = slot
    this.changeMode = this.hasEditPermission ? 'EDIT' : 'VIEW'
    this.showSlotDetailDialog = true
  }

  public onSlotDelete(ev: Event, slot: CombinedSlot): void {
    ev.stopPropagation()
    this.item4Detail = { ...slot }
    this.changeMode = 'DELETE'
    this.showSlotDeleteDialog = true
  }

  // detail/delete dialog closed - on changes: reload data
  public onSlotDetailClosed(changed: boolean) {
    if (changed && this.changeMode === 'DELETE' && this.item4Detail?.id) {
      this.w2psTransferSlot(this.item4Detail)
    }
    if (changed && this.changeMode === 'EDIT' && this.item4Detail?.id) {
      this.loadData()
    }
    this.item4Detail = undefined
    this.changeMode = 'VIEW'
    this.showSlotDetailDialog = false
    this.showSlotDeleteDialog = false
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
        'DIALOG.SLOT.QUICK_FILTER.WORKSPACE',
        'DIALOG.SLOT.QUICK_FILTER.UNREGISTERED'
      ])
      .pipe(
        map((data) => {
          return [
            { label: data['DIALOG.SLOT.QUICK_FILTER.ALL'], value: 'ALL' },
            { label: data['DIALOG.SLOT.QUICK_FILTER.UNREGISTERED'], value: 'UNREGISTERED' },
            { label: data['DIALOG.SLOT.QUICK_FILTER.WORKSPACE'], value: 'WORKSPACE' }
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
