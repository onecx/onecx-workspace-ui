import {
  Component,
  DestroyRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  signal,
  SimpleChanges
} from '@angular/core'
import { SharedModule } from 'src/app/shared/shared.module'
import { OcxChipComponent } from 'src/app/shared/components/ocx-chip/ocx-chip.component'
import { WorkspaceSlotDetailComponent } from '../workspace-slot-detail/workspace-slot-detail.component'
import { TranslateService } from '@ngx-translate/core'
import { Subject, catchError, map, of, Observable, firstValueFrom, BehaviorSubject, forkJoin } from 'rxjs'
import { SelectItem } from 'primeng/api'
import { CardModule } from 'primeng/card'

import { UserService, WorkspaceService } from '@onecx/angular-integration-interface'

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
import { ColumnType, DataSortDirection, DataTableColumn, RowListGridData } from '@onecx/angular-accelerator'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'

export type SlotType = 'WORKSPACE' | 'UNUSED' | 'CHANGES'
export type SlotFilterType = 'ALL' | SlotType
export type ExtendedSelectItem = SelectItem & { tooltipKey?: string }
export type ChangeMode = 'VIEW' | 'EDIT'
export type PSSlot = SlotPS & { pName: string; pDisplayName: string }
type ChangeStatus = { changes?: boolean; exists?: boolean; deprecated?: boolean; undeployed?: boolean }

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
  standalone: true,
  imports: [SharedModule, CardModule, OcxChipComponent, WorkspaceSlotDetailComponent],
  templateUrl: './workspace-slots.component.html',
  styleUrls: ['./workspace-slots.component.scss']
})
export class WorkspaceSlotsComponent implements OnInit, OnChanges, OnDestroy {
  private readonly destroyRef = inject(DestroyRef)
  private readonly workspaceService = inject(WorkspaceService)
  private readonly user = inject(UserService)
  private readonly slotApi = inject(SlotAPIService)
  private readonly psProductApi = inject(ProductAPIService)
  private readonly wProductApi = inject(WorkspaceProductAPIService)
  private readonly translate = inject(TranslateService)

  @Input() workspace!: Workspace | undefined

  // data
  private readonly dataSubject$ = new BehaviorSubject<RowListGridData[]>([])
  public data$: Observable<RowListGridData[]> = this.dataSubject$.asObservable()
  public readonly data = toSignal(this.data$, { initialValue: [] as RowListGridData[] })
  public readonly filteredData = signal<RowListGridData[] | undefined>(undefined)
  public globalFilterValue = ''
  public quickFilterValue: SlotFilterType = 'ALL'
  public quickFilterOptions$: Observable<SelectItem[]> | undefined
  public quickFilterCount = ''
  public wProductNames: string[] = [] // simple list of names of registered products in workspace

  private readonly destroy$ = new Subject()
  public wProducts$!: Observable<string[]>
  public wSlots$!: Observable<ExtendedSlot[]> // workspace slots
  public slotsFiltered: ExtendedSlot[] = [] // filtered slot collection
  public psProducts$!: Observable<ProductStoreItem[]> // product store slots
  public psComponents: ExtendedComponent[] = []
  public item4Detail: ExtendedSlot | undefined
  public productEndpointExist = false

  // dialog
  public readonly exceptionKey = signal<string | undefined>(undefined)
  public loading = signal(false)
  public changeMode: ChangeMode = 'VIEW'
  public hasEditPermission = false
  public showSlotDetailDialog = false

  public sortColumns = this.prepareSortColumns()
  public sortDirection: DataSortDirection = DataSortDirection.ASCENDING
  public sortField = 'name,changes'

  public ngOnInit() {
    Promise.all([this.user.hasPermission('WORKSPACE_SLOT#EDIT')])
      .then(([permRegister]) => {
        this.hasEditPermission = permRegister
      })
      .catch((err) => console.error(err))

    this.prepareQuickFilter()
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
    this.exceptionKey.set(undefined)
    this.declareWorkspaceProducts()
    this.declareWorkspaceSlots()
    this.declarePSSlots()
    this.loadSlots().catch((err) => console.error(err))
  }

  /**
   * The following sequence waits for wSlots$ to emit a value, then switches to wProducts$,
   * and once it emits data, it switches to psProducts$.
   * The first emitted value from psProducts$ is then returned as a Promise.
   */
  private async loadSlots(): Promise<void> {
    try {
      const slots = await firstValueFrom(
        forkJoin({
          wSlots: this.wSlots$,
          psProducts: this.psProducts$,
          wProducts: this.wProducts$
        }).pipe(
          map(({ wSlots, psProducts, wProducts }) => {
            // Extract PS components from the PS products
            this.psComponents = this.extractPsComponents(psProducts) // this is public used
            // Extract PS slots which are not yet used in the workspace
            const psSlots = this.extractUnusedPsSlots(psProducts, wSlots)
            // Combine workspace slots and unused PS slots into a single array
            const slots: ExtendedSlot[] = [...wSlots, ...psSlots]
            // Enrich workspace slots with PS components and products
            this.syncComponentState(slots, this.psComponents, wProducts)
            this.addLostSlotComponents(slots)
            // finalize
            slots.sort(this.sortSlotsByName)
            this.onQuickFilterChange(this.quickFilterValue) // reestablish filter after data change
            return slots
          }),
          takeUntilDestroyed(this.destroyRef)
        )
      )
      this.dataSubject$.next(slots as unknown as RowListGridData[])
    } catch (err) {
      this.exceptionKey.set('EXCEPTIONS.HTTP_STATUS_' + Utils.mapping_error_status(0) + '.SLOTS')
      console.error('loadSlots', err)
    } finally {
      this.loading.set(false)
    }
  }
  public sortSlotsByName(a: Slot, b: Slot): number {
    return a.name!.toUpperCase().localeCompare(b.name!.toUpperCase())
  }

  // get all products registered in the workspace
  private declareWorkspaceProducts(): void {
    if (this.workspace) {
      this.wProducts$ = this.wProductApi.getProductsByWorkspaceId({ id: this.workspace.id! }).pipe(
        map((products) => {
          const names = []
          for (const p of products) if (p.productName) names.push(p.productName)
          return names
        }),
        catchError((err) => {
          this.exceptionKey.set('EXCEPTIONS.HTTP_STATUS_' + Utils.mapping_error_status(err.status) + '.PRODUCTS')
          console.error('getProductsByWorkspaceId', err)
          return of([])
        })
      )
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
      this.wSlots$ = this.slotApi
        .getSlotsForWorkspace({ id: this.workspace?.id } as GetSlotsForWorkspaceRequestParams)
        .pipe(
          map((res) => {
            const wSlots: ExtendedSlot[] = []
            if (res.slots)
              // cases: a + b
              for (const s of res.slots)
                wSlots.push({
                  ...s, // contains also the registered components
                  productNames: [], // to be filled by matching with PS slots
                  type: ['WORKSPACE'],
                  psSlots: [],
                  psComponents: [],
                  // initial state...to be enriched later by product store slot states
                  exists: false, // later set to true if exists in PS
                  changes: false,
                  undeployed: false,
                  deprecated: false
                } as ExtendedSlot)
            return wSlots
          }),
          catchError((err) => {
            this.exceptionKey.set('EXCEPTIONS.HTTP_STATUS_' + Utils.mapping_error_status(err.status) + '.SLOTS')
            console.error('getSlotsForWorkspace', err)
            return of([])
          })
        )
    }
  }

  // All declared Slots of product store products: containing deployment information
  private declarePSSlots(): void {
    this.psProducts$ = this.psProductApi
      .searchAvailableProducts({ productStoreSearchCriteria: { pageSize: 1000 } })
      .pipe(map((res) => res.stream ?? []))
  }

  // Extract unused PS slots from PS products
  // => essential for listing products using a slot
  private extractUnusedPsSlots(psProducts: ProductStoreItem[], wSlots: ExtendedSlot[]): ExtendedSlot[] {
    const psSlots: ExtendedSlot[] = []
    for (const p of psProducts) {
      if (p.slots) for (const psS of p.slots) this.addPsSlot(p, psS, psSlots, wSlots)
    }
    return psSlots
  }

  // Add a PS slot to the consolidated list of PS slots and update workspace slot if applicable
  // => A product can defines a slot but the slot itself is independently used, not tied to a specific product
  // => psSlots is the consolidated (unique) list of PS slots
  private addPsSlot(
    psProduct: ProductStoreItem,
    psSlot: SlotPS,
    psSlots: ExtendedSlot[],
    wSlots: ExtendedSlot[]
  ): void {
    // 1. Check if the slot is already used in the workspace
    const wps = wSlots.find((s) => s.name === psSlot.name)
    let ps = wps
    // 2. otherwise check if the slot was already declared by another product in the consolidated list
    if (!ps) ps = psSlots.find((s) => s.name === psSlot.name)
    if (ps) {
      ps.changes = ps.changes || psSlot.undeployed === true || psSlot.deprecated === true // any change on slot?
      if (ps.changes && !ps.type.includes('CHANGES')) ps.type.push('CHANGES')
      // add product name to the list of products using this slot
      if (!ps.productNames.includes(psProduct.productName!)) ps.productNames.push(psProduct.productName!)
    } else {
      // new slot, not yet in the list
      ps = {
        ...psSlot,
        id: undefined, // no need to have this
        productNames: [psProduct.productName],
        // change state
        changes: psSlot.undeployed === true || psSlot.deprecated === true,
        undeployed: psSlot.undeployed === true,
        deprecated: psSlot.deprecated === true,
        type: ['UNUSED']
      } as ExtendedSlot
      if (ps.changes) ps.type.push('CHANGES')
      psSlots.push(ps)
    }
    this.updateWorkspaceSlotState(psProduct, psSlot, wps)
  }

  // Update workspace slot with PS slot information
  // => find workspace slot with same name (there is no productname stored for slots in workspace)
  private updateWorkspaceSlotState(psProduct: ProductStoreItem, psSlot: SlotPS, wps?: ExtendedSlot): void {
    if (wps?.psSlots) {
      if (!wps.psSlots.find((s) => s.name === psSlot.name))
        wps.psSlots.push({ ...psSlot, pName: psProduct.productName!, pDisplayName: psProduct.displayName! })
      // consolidate slot state (aware of the state of current psSlot declaration together with previous ones)
      wps.exists = true
      wps.deprecated = wps.deprecated || psSlot.deprecated === true
      wps.undeployed = wps.undeployed || psSlot.undeployed === true
    }
  }

  // Extract all PS components
  private extractPsComponents(psProducts: ProductStoreItem[]): ExtendedComponent[] {
    const components: ExtendedComponent[] = []
    for (const psp of psProducts) {
      if (psp.microfrontends && psp.microfrontends.length > 0) {
        // only remote components
        for (const c of psp.microfrontends.filter((mfe) => mfe.type === 'COMPONENT'))
          components.push({
            productName: psp.productName,
            appId: c.appId,
            name: c.exposedModule,
            exists: true,
            undeployed: c.undeployed ?? false,
            deprecated: c.deprecated ?? false
          } as ExtendedComponent)
      }
    }
    return components
  }

  // Enrich workspace slot state with PS slot state
  private syncComponentState(wSlots: ExtendedSlot[], psComponents: ExtendedComponent[], productNames: string[]): void {
    for (const ws of wSlots) {
      // components assigned to workspace slot
      if (ws.components) {
        for (const wc of ws.components) {
          // component product still registered?
          if (!productNames.includes(wc.productName)) {
            ws.changes = true
            if (!ws.type.includes('CHANGES')) ws.type.push('CHANGES')
          }
          this.assignPSComponent(
            ws,
            psComponents.find(
              (pc) => pc.productName === wc.productName && pc.appId === wc.appId && pc.name === wc.name
            ),
            productNames
          )
        }
      }
    }
  }

  private assignPSComponent(ws: ExtendedSlot, psc: ExtendedComponent | undefined, productNames: string[]): void {
    if (psc) {
      psc.productUnregistered = !productNames.includes(psc.productName)
      ws.psComponents.push(psc)
      // extend consolidated slot state with component state
      ws.changes = ws.changes || psc.undeployed || psc.deprecated
      if (ws.changes && !ws.type.includes('CHANGES')) ws.type.push('CHANGES')
    }
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
   * FILTERING
   */
  public onQuickFilterChange(val: SlotFilterType): void {
    if (val === 'ALL') {
      this.filteredData.set(undefined)
    } else {
      this.filteredData.set(this.data().filter((s) => this.convertToRoleType(s['type'])?.includes(val)))
    }
    this.quickFilterValue = val
  }

  private convertToRoleType(origin: unknown): SlotType[] {
    if (!origin) return []
    if (Array.isArray(origin)) return origin as SlotType[]
    return []
  }

  public onGlobalFilter(val?: string): void {
    this.globalFilterValue = val ?? ''
    if (this.globalFilterValue === '') this.filteredData.set(undefined)
    else {
      this.filteredData.set(
        this.data().filter((row) =>
          row['name']?.toString().toLowerCase().includes(this.globalFilterValue.toLowerCase())
        )
      )
    }
  }

  public onClearGlobalFilter(): void {
    this.globalFilterValue = ''
    this.filteredData.set(undefined)
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
  public prepareQuickFilter(): void {
    this.quickFilterOptions$ = this.translate
      .get([
        'DIALOG.SLOT.QUICK_FILTER.ALL',
        'DIALOG.SLOT.QUICK_FILTER.CHANGES',
        'DIALOG.SLOT.QUICK_FILTER.WORKSPACE',
        'DIALOG.SLOT.QUICK_FILTER.UNUSED'
      ])
      .pipe(
        map((qfd) => {
          return [
            { label: qfd['DIALOG.SLOT.QUICK_FILTER.ALL'], value: 'ALL' },
            { label: qfd['DIALOG.SLOT.QUICK_FILTER.UNUSED'], value: 'UNUSED' },
            { label: qfd['DIALOG.SLOT.QUICK_FILTER.WORKSPACE'], value: 'WORKSPACE' },
            { label: qfd['DIALOG.SLOT.QUICK_FILTER.CHANGES'], value: 'CHANGES' }
          ]
        })
      )
  }

  public getProductEndpointUrl$(): Observable<string | undefined> {
    if (this.productEndpointExist)
      return this.workspaceService.getUrl('onecx-product-store', 'onecx-product-store-ui', 'slots')
    return of(undefined)
  }

  private prepareSortColumns(): DataTableColumn[] {
    return [
      {
        columnType: ColumnType.STRING,
        nameKey: 'SLOT.NAME',
        id: 'name',
        sortable: true
      }
    ]
  }
}
