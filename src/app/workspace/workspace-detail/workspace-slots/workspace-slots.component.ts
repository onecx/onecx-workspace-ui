import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core'
import { Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { Subject, catchError, finalize, map, mergeMap, of, switchMap, takeUntil, Observable } from 'rxjs'
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

export type SlotType = 'WORKSPACE' | 'UNREGISTERED' | 'OUTDATED' | 'WORKSPACE,OUTDATED'
export type SlotFilterType = 'ALL' | SlotType
export type ExtendedSelectItem = SelectItem & { tooltipKey?: string }
export type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT' | 'COPY' | 'DELETE'
export type PSSlot = SlotPS & { pName?: string; pDisplayName?: string }
// workspace slot data combined with status from product store
export type CombinedSlot = Slot & {
  productName?: string
  new: boolean // true if slot exists only in product store
  type: SlotType
  psSlots: PSSlot[] // corresponding product store slots
  psComponents: ExtendedComponent[] // corresponding product store components
  // slot state in product store
  changes: boolean // overall state including assigned components
  undeployed: boolean // slot state only
  deprecated: boolean // slot state only
}
export type ExtendedComponent = SlotComponent & {
  undeployed: boolean
  deprecated: boolean
}

@Component({
  selector: 'app-workspace-slots',
  templateUrl: './workspace-slots.component.html',
  styleUrls: ['./workspace-slots.component.scss']
})
export class WorkspaceSlotsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() workspace!: Workspace | undefined

  public limitText = Utils.limitText

  // data
  private readonly destroy$ = new Subject()
  public wProducts$!: Observable<string[]>
  public wProductNames: string[] = [] // simple list of product names registered in workspace
  public wSlots$!: Observable<string[]>
  public wSlots: CombinedSlot[] = [] // displayed slot collection: final state
  public wSlotsIntern: CombinedSlot[] = [] // internal slot collection: decoupled from displaying
  public psSlots$!: Observable<string[]>
  public psComponents: ExtendedComponent[] = []

  public slot: CombinedSlot | undefined
  //  public itemForDelete: CombinedSlot | undefined

  // dialog
  @ViewChild(DataView) dv: DataView | undefined
  public dataViewControlsTranslations$: Observable<DataViewControlTranslations> | undefined

  public filterValue: string | undefined
  public filterByDefault = 'name,type'
  public filterBy = this.filterByDefault
  public sortField = 'name'
  public sortOrder = -1
  public quickFilterValue: SlotFilterType = 'ALL'
  public quickFilterOptions$: Observable<SelectItem[]> | undefined
  public quickFilterCount = ''
  public exceptionKey: string | undefined = undefined
  public sLoading = false
  public wpLoading = false
  public changeMode: ChangeMode = 'VIEW'
  public hasCreatePermission = false
  public hasDeletePermission = false
  public hasEditPermission = false
  public showSlotDetailDialog = false
  public showSlotDeleteDialog = false

  constructor(
    private readonly router: Router,
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
    this.prepareQuickFilter()
  }

  public ngOnInit() {
    this.prepareTranslations()
  }
  public ngOnChanges(changes: SimpleChanges): void {
    if (this.workspace && changes['workspace']) this.loadData()
  }
  public ngOnDestroy(): void {
    this.destroy$.next(undefined)
    this.destroy$.complete()
  }
  public onReload() {
    this.onQuickFilterChange({ value: 'ALL' })
    this.loadData()
  }
  public loadData(): void {
    this.exceptionKey = undefined
    this.declareWorkspaceProducts()
    this.declareWorkspaceSlots()
    this.declarePsProducts()
    this.wSlots$
      .pipe(
        mergeMap(() => this.wProducts$),
        switchMap(() => this.psSlots$)
      )
      .subscribe()
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
                ...s, // contains also the current registered components
                new: false,
                type: 'WORKSPACE',
                psSlots: [],
                psComponents: [],
                // initial state...to be enriched later by product store slot states
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
        })
      )
  }

  // All declared Slots of Product store Products: containing deployment information
  private declarePsProducts(): void {
    this.sLoading = true
    this.psSlots$ = this.psProductApi.searchAvailableProducts({ productStoreSearchCriteria: { pageSize: 1000 } }).pipe(
      map((res) => {
        if (res.stream) {
          // build internal database
          const psSlots = this.extractPsSlots(res.stream)
          this.psComponents = this.extractPsComponents(res.stream)
          this.updateComponentState(this.wSlotsIntern, this.psComponents)
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
      finalize(() => (this.sLoading = false))
    )
  }

  public sortSlotsByName(a: Slot, b: Slot): number {
    return a.name!.toUpperCase().localeCompare(b.name!.toUpperCase())
  }

  private extractPsSlots(products: ProductStoreItem[]): CombinedSlot[] {
    const psSlots: CombinedSlot[] = []
    for (const p of products) {
      // 1.1 collect product slots
      // 1.2 enrich wSlotsIntern with deployment information from product store
      p.slots?.forEach((sps: SlotPS) => {
        const ps: CombinedSlot = {
          ...sps,
          productName: p.productName,
          // state
          changes: sps.undeployed === true || sps.deprecated === true,
          undeployed: sps.undeployed === true,
          deprecated: sps.deprecated === true
        } as CombinedSlot
        psSlots.push(ps)
        //
        // select workspace slot with same name (there is no productname for slots in workspace)
        const wsSlot = this.wSlotsIntern.find((s) => s.name === ps.name)
        if (wsSlot) {
          wsSlot.psSlots.push({ ...ps, pName: p.productName, pDisplayName: p.displayName! })
          // consolidate slot state (aware of the state of current ps together with previous ones)
          wsSlot.changes = wsSlot.changes || ps.changes
          wsSlot.deprecated = wsSlot.deprecated || ps.deprecated
          wsSlot.undeployed = wsSlot.undeployed || ps.undeployed
          if (wsSlot.changes) wsSlot.type = 'WORKSPACE,OUTDATED'
        }
      })
    }
    return psSlots
  }

  // global used PS component collection
  private extractPsComponents(products: ProductStoreItem[]): ExtendedComponent[] {
    const psComponents: ExtendedComponent[] = []
    for (const p of products) {
      if (p.microfrontends && p.microfrontends.length > 0) {
        p.microfrontends
          .filter((mfe) => mfe.type === 'COMPONENT') // only remote components
          .forEach((c) => {
            psComponents.push({
              productName: p.productName,
              appId: c.appId,
              name: c.exposedModule,
              undeployed: c.undeployed ?? false,
              deprecated: c.deprecated ?? false
            } as ExtendedComponent)
          })
      }
    }
    return psComponents
  }

  private updateComponentState(wSlots: CombinedSlot[], psComponents: ExtendedComponent[]): void {
    wSlots.forEach((ws) => {
      ws.components?.forEach((c) => {
        // assigned components
        // get ps components with the same product/app and component name to get their current state
        const psc = psComponents.find(
          (pc) => pc.productName === c.productName && pc.appId === c.appId && pc.name === c.name
        )
        if (psc) {
          ws.psComponents.push(psc)
          // extend consolidated slot state with component state
          ws.changes = psc.undeployed || psc.deprecated || ws.changes
        }
      })
    })
  }

  private addUnregisteredSlots(psSlots: CombinedSlot[]): void {
    // 4. add new slots existing in PS which are not existing in Workspace but part of a registered product)
    //    exlude undeployed slots
    this.wProductNames.forEach((pn) => {
      psSlots
        // valid slots
        .filter((psp) => psp.productName === pn && psp?.undeployed !== true)
        .forEach((ps) => {
          // add an artificial slot if slot is not registered in workspace
          if (!this.wSlotsIntern.find((ws) => ws.name === ps.name)) {
            this.wSlotsIntern.push({ ...ps, id: undefined, new: true, type: 'UNREGISTERED' })
          }
        })
    })
  }
  // add components assigned to workspace slot but not available in product store anymore
  private addLostSlotComponents(wSlots: CombinedSlot[]): void {
    wSlots.forEach((slot) => {
      slot.components?.forEach((wc) => {
        if (slot.psComponents?.filter((psc) => psc.name === wc.name).length === 0) {
          slot.psComponents?.push({ ...wc, undeployed: true, deprecated: false })
          slot.changes = true
        }
      })
    })
  }

  /**
   * CHANGES
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
  public onQuickFilterChange(ev: any): void {
    this.quickFilterValue = ev.value
    if (ev.value === 'ALL') {
      this.filterBy = this.filterByDefault
      this.dv?.filter('', 'contains')
    } else {
      this.filterBy = 'type'
      this.dv?.filter(ev.value, 'contains')
    }
  }
  public onFilterChange(filter: string): void {
    if (filter === '') {
      this.filterBy = 'name'
    }
    this.dv?.filter(filter, 'contains')
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
    this.slot = slot
    this.changeMode = this.hasEditPermission ? 'EDIT' : 'VIEW'
    this.showSlotDetailDialog = true
  }

  public onSlotDelete(ev: Event, slot: CombinedSlot): void {
    ev.stopPropagation()
    this.slot = { ...slot }
    this.changeMode = 'DELETE'
    this.showSlotDeleteDialog = true
  }

  // detail/delete dialog closed - on changes: reload data
  public onSlotDetailClosed(changed: boolean) {
    if (changed && this.changeMode === 'DELETE' && this.slot?.id) {
      this.w2psTransferSlot(this.slot)
    }
    if (changed && this.changeMode === 'EDIT' && this.slot?.id) {
      this.loadData()
    }
    this.slot = undefined
    this.changeMode = 'VIEW'
    this.showSlotDetailDialog = false
    this.showSlotDeleteDialog = false
  }

  public onGoToProductSlots(): void {
    Utils.goToEndpoint(
      this.workspaceService,
      this.msgService,
      this.router,
      'onecx-product-store',
      'onecx-product-store-ui',
      'slots'
    )
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
}
