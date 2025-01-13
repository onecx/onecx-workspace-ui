import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core'
import { Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { Subject, catchError, finalize, map, mergeMap, of, switchMap, takeUntil, Observable } from 'rxjs'
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
import { goToEndpoint, limitText } from 'src/app/shared/utils'

export type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT' | 'COPY' | 'DELETE'
export type PSSlot = SlotPS & { pName?: string; pDisplayName?: string }
// workspace slot data combined with status from product store
export type CombinedSlot = Slot & {
  productName?: string
  bucket: 'SOURCE' | 'TARGET'
  new: boolean
  changes: boolean
  undeployed?: boolean
  deprecated?: boolean
  psSlots: PSSlot[]
  psComponents?: ExtendedComponent[]
}
export type ExtendedComponent = SlotComponent & { undeployed?: boolean; deprecated?: boolean }

@Component({
  selector: 'app-workspace-slots',
  templateUrl: './workspace-slots.component.html',
  styleUrls: ['./workspace-slots.component.scss']
})
export class WorkspaceSlotsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() workspace!: Workspace | undefined

  public limitText = limitText

  // data
  private readonly destroy$ = new Subject()
  public wProducts$!: Observable<string[]>
  public wProductNames: string[] = []
  public wSlots$!: Observable<string[]>
  public wSlots!: CombinedSlot[] // registered workspace slots
  public wSlotsIntern!: CombinedSlot[] // temporary used ws slot array, final assigned to wSlots
  public psSlots$!: Observable<string[]>
  public psSlots!: CombinedSlot[]
  public psComponents!: ExtendedComponent[]

  public slot: CombinedSlot | undefined
  public detailSlotId: string | undefined

  // dialog
  @ViewChild(DataView) dv: DataView | undefined
  public dataViewControlsTranslations: DataViewControlTranslations = {}
  public filterValue: string | undefined
  public filterValueDefault = 'name'
  public filterBy = this.filterValueDefault
  public sortField = 'name'
  public sortOrder = -1
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
    this.loadData()
  }
  public loadData(): void {
    this.exceptionKey = undefined
    this.declareWorkspaceProducts()
    this.declareWorkspaceSlots()
    this.declarePsSlots()
    this.wSlots = []
    this.wSlots$
      .pipe(
        mergeMap(() => this.wProducts$),
        switchMap(() => this.psSlots$)
      )
      .subscribe()
  }

  private declareWorkspaceProducts(): void {
    if (this.workspace) {
      this.wpLoading = true
      this.wProducts$ = this.wProductApi
        .getProductsByWorkspaceId({ id: this.workspace.id! })
        .pipe(
          map((products) => {
            this.wProductNames = []
            for (const p of products) this.wProductNames.push(p.productName ?? '')
            return []
          }),
          catchError((err) => {
            this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
            console.error('getProductsByWorkspaceId', err)
            return of([] as string[])
          }),
          finalize(() => (this.wpLoading = false))
        )
        .pipe(takeUntil(this.destroy$))
    }
  }

  /**
   * SEARCH
   */
  // Slots which were registered together with Products/Applications
  // a) the good case: slot and assigned components still exist in product store
  // b) the bad case:  Slot or assigned components are no longer available in the product store
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
                ...s, // contains the original registered components
                new: false,
                bucket: 'TARGET',
                changes: false,
                psSlots: [],
                psComponents: []
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

  private extractPsData(products: ProductStoreItem[]): void {
    for (const p of products) {
      // 1. enrich wSlotsIntern with deployment information from product store
      p.slots?.forEach((sps: SlotPS) => {
        // create slot
        const ps: CombinedSlot = { ...sps, productName: p.productName } as CombinedSlot
        ps.changes = ps.undeployed || ps.deprecated || ps.changes
        // add slot to ps slot array
        this.psSlots.push(ps)
        // select workspace slot with same name
        const ws = this.wSlotsIntern.filter((s) => s.name === ps.name)
        if (ws.length === 1) {
          // extend workspace slot with product store info
          ws[0].psSlots.push({ ...ps, pName: p.productName, pDisplayName: p.displayName! })
          ws[0].changes = ps.undeployed || ps.deprecated || ws[0].changes
        }
      })
      // 2. collect all product store components
      if (p.microfrontends && p.microfrontends.length > 0) {
        p.microfrontends
          .filter((mfe) => mfe.type === 'COMPONENT')
          .forEach((c) => {
            this.psComponents.push({
              bucket: 'SOURCE',
              productName: p.productName,
              appId: c.appId,
              name: c.exposedModule,
              undeployed: c.undeployed ?? false,
              deprecated: c.deprecated ?? false
            } as ExtendedComponent)
          })
      }
    }
    // 3. collect the components per workspace slot
    this.wSlotsIntern.forEach((ws) => {
      ws.components?.forEach((c) => {
        const psc = this.psComponents?.filter((pc) => pc.name === c.name)
        if (psc.length === 1) {
          ws.psComponents?.push(psc[0])
          ws.changes = psc[0].undeployed || psc[0].deprecated || ws.changes
        }
      })
    })
  }

  private addNewSlots(): void {
    // 4. add new (not undeployed) Slots (not yet in Workspace but part of a registered product)
    this.wProductNames.forEach((pn) => {
      this.psSlots
        .filter((psp) => psp.productName === pn)
        .forEach((ps) => {
          if (this.wSlotsIntern.filter((ws) => ws.name === ps.name).length === 0) {
            if (!ps.undeployed) this.wSlotsIntern.push({ ...ps, new: true })
          }
        })
    })
  }
  private addLostSlotComponents(): void {
    // 5. add old components (not available in product store)
    this.wSlotsIntern.forEach((slot) => {
      slot.components?.forEach((wc) => {
        if (slot.psComponents?.filter((psc) => psc.name === wc.name).length === 0) {
          slot.psComponents?.push({ ...wc, undeployed: true })
          slot.changes = true
        }
      })
    })
  }

  // All declared Slots of Product store Products: containing deployment information
  private declarePsSlots(): void {
    this.sLoading = true
    this.psSlots$ = this.psProductApi.searchAvailableProducts({ productStoreSearchCriteria: {} }).pipe(
      map((res) => {
        this.psSlots = []
        this.psComponents = []
        if (res.stream) {
          this.extractPsData(res.stream) // steps: 1, 2, 3
          this.addNewSlots() // steps: 4
          this.addLostSlotComponents() // steps: 5
          this.wSlotsIntern.sort(this.sortSlotsByName)
          this.wSlots = [...this.wSlotsIntern]
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

  private sortSlotsByName(a: Slot, b: Slot): number {
    return (a.name ? a.name.toUpperCase() : '').localeCompare(b.name ? b.name.toUpperCase() : '')
  }

  /**
   * Dialog preparation
   */
  private prepareTranslations(): void {
    this.translate
      .get(['SLOT.NAME', 'DIALOG.DATAVIEW.SORT_BY', 'DIALOG.DATAVIEW.FILTER', 'DIALOG.DATAVIEW.FILTER_BY'])
      .pipe(
        map((data) => {
          this.dataViewControlsTranslations = {
            sortDropdownTooltip: data['DIALOG.DATAVIEW.SORT_BY'],
            filterInputPlaceholder: data['DIALOG.DATAVIEW.FILTER'],
            filterInputTooltip: data['DIALOG.DATAVIEW.FILTER_BY'] + data['SLOT.NAME']
          }
        })
      )
      .subscribe()
  }

  /**
   * UI Events
   */
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
    this.detailSlotId = this.slot.id
    this.changeMode = this.hasEditPermission ? 'EDIT' : 'VIEW'
    this.showSlotDetailDialog = true
  }

  // detail/delete dialog closed - on any changes a reload of data is required
  public onSlotDetailClosed(changed: boolean) {
    this.slot = undefined
    this.detailSlotId = undefined
    this.changeMode = 'VIEW'
    this.showSlotDetailDialog = false
    this.showSlotDeleteDialog = false
    if (changed) this.loadData()
  }
  // on any changes within DETAIL dialog a reload of data is required
  public onSlotDetailChanged(changed: boolean) {
    if (changed) this.loadData()
  }

  public onAddSlot(ev: Event, slot: CombinedSlot): void {
    ev.stopPropagation()
    this.slotApi
      .createSlot({
        createSlotRequest: { workspaceId: this.workspace?.id, name: slot.name } as CreateSlotRequest
      })
      .subscribe({
        next: () => {
          this.loadData()
        },
        error: (err) => {
          this.msgService.error({ summaryKey: 'ACTIONS.CREATE.SLOT.MESSAGE_NOK' })
          console.error('createSlot', err)
        }
      })
  }

  public onDeleteSlot(ev: Event, slot: CombinedSlot): void {
    ev.stopPropagation()
    this.slot = slot
    this.detailSlotId = this.slot.id
    this.changeMode = this.hasEditPermission ? 'EDIT' : 'VIEW'
    this.showSlotDeleteDialog = true
  }

  public onGoToProductSlots(): void {
    goToEndpoint(
      this.workspaceService,
      this.msgService,
      this.router,
      'onecx-product-store',
      'onecx-product-store-ui',
      'slots'
    )
  }
}
