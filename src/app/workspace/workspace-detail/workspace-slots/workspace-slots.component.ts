import { Component, Input, SimpleChanges, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Subject, catchError, finalize, map, mergeMap, of, tap, takeUntil, Observable } from 'rxjs'
import { DataView } from 'primeng/dataview'

import { DataViewControlTranslations } from '@onecx/portal-integration-angular'
import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import {
  CreateSlotRequest,
  GetSlotsForWorkspaceRequestParams,
  ProductAPIService,
  Workspace,
  Slot, // id, workspaceId, name, components[]
  SlotPS, // name, undeployed, deprecated
  SlotComponent, // productName, appId, name
  SlotAPIService,
  WorkspaceProductAPIService
} from 'src/app/shared/generated'
import { limitText } from 'src/app/shared/utils'

export type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT' | 'COPY' | 'DELETE'
export type PSSlot = SlotPS & { pName?: string; pDisplayName?: string }
export type CombinedSlot = Slot & {
  productName?: string
  bucket: 'SOURCE' | 'TARGET'
  new: boolean
  changes: boolean
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
  public wProductNames!: string[]
  public wSlots$!: Observable<string[]>
  public wSlots!: CombinedSlot[]
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
  public exceptionKey: string | undefined
  public loading = false
  public changeMode: ChangeMode = 'VIEW'
  public hasCreatePermission = false
  public hasDeletePermission = false
  public hasEditPermission = false
  public showSlotDetailDialog = false
  public showSlotDeleteDialog = false

  constructor(
    private user: UserService,
    private slotApi: SlotAPIService,
    private psProductApi: ProductAPIService,
    private wProductApi: WorkspaceProductAPIService,
    private translate: TranslateService,
    private msgService: PortalMessageService
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
    this.loading = true
    this.exceptionKey = undefined
    this.declareWorkspaceProducts()
    this.declareWorkspaceSlots()
    this.declarePsSlots()
    this.wSlots$
      .pipe(
        mergeMap((slots) => this.wProducts$),
        mergeMap((slots) => this.psSlots$)
      )
      .subscribe()
  }

  private declareWorkspaceProducts(): void {
    this.wProducts$ = this.wProductApi
      .getProductsByWorkspaceId({ id: this.workspace?.id! })
      .pipe(
        map((products) => {
          this.wProductNames = []
          for (let p of products) this.wProductNames.push(p.productName!)
          //return this.wProductNames
          return []
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
          console.error('getProductsByWorkspaceId():', err)
          return of([] as string[])
        })
      )
      .pipe(takeUntil(this.destroy$))
  }

  /**
   * SEARCH
   */
  // Slots which were registered together with Products/Applications
  private declareWorkspaceSlots(): void {
    this.wSlots$ = this.slotApi
      .getSlotsForWorkspace({ id: this.workspace?.id } as GetSlotsForWorkspaceRequestParams)
      .pipe(
        takeUntil(this.destroy$),
        tap((res) => console.log('tap => wSlots', res)),
        map((res) => {
          this.wSlots = []
          if (res.slots)
            for (const s of res.slots)
              this.wSlots.push({
                ...s,
                new: false,
                bucket: 'TARGET',
                changes: false,
                psSlots: [],
                psComponents: []
              } as CombinedSlot)
          //return this.wSlots.sort(this.sortSlotsByName)
          return [] as string[]
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.SLOTS'
          console.error('searchSlots():', err)
          return of([] as string[])
        }),
        finalize(() => (this.loading = false))
      )
  }

  // All declared Slots of Product store Products: containing deployment information
  private declarePsSlots(): void {
    this.psSlots$ = this.psProductApi.searchAvailableProducts({ productStoreSearchCriteria: {} }).pipe(
      tap((res) => console.log('tap => psSlots', res)),
      map((res) => {
        this.psSlots = []
        this.psComponents = []
        if (res.stream) {
          for (let p of res.stream) {
            // 1. enrich wSlots with deployment information (contained in product store)
            p.slots?.forEach((ps) => {
              this.psSlots.push({ ...ps, productName: p.productName } as CombinedSlot)
              const ws = this.wSlots.filter((s) => s.name === ps.name)
              if (ws.length === 1) {
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
                    undeployed: c.undeployed || false,
                    deprecated: c.deprecated || false
                  } as ExtendedComponent)
                })
            }
          }
          // 3. collect the components per wSlots
          this.wSlots.forEach((ws) => {
            ws.components?.forEach((c) => {
              const psc = this.psComponents?.filter((pc) => pc.name === c.name)
              if (psc.length === 1) {
                ws.psComponents?.push(psc[0])
                ws.changes = psc[0].undeployed || psc[0].deprecated || ws.changes
              }
            })
          })
        }
        // 4. add new Slots (not yet in Workspace but part of registered product)
        this.wProductNames.forEach((pn) => {
          this.psSlots
            .filter((psp) => psp.productName === pn)
            .forEach((s) => {
              if (this.wSlots.filter((ws) => ws.name === s.name).length === 0) {
                // the slot does not exist, then add this candidate
                this.wSlots.push({ ...s, new: true })
              }
            })
        })
        //if (this.detailSlotId) this.slot = this.wSlots.filter((s) => (s.id = this.detailSlotId))[0]
        return [] as string[]
        // return this.psSlots
      }),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.SLOTS'
        console.error('searchAvailableProducts():', err)
        return of([])
      }),
      finalize(() => (this.loading = false))
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
      .get(['SLOT.NAME', 'ACTIONS.SEARCH.SORT_BY', 'ACTIONS.SEARCH.FILTER', 'ACTIONS.SEARCH.FILTER_OF'])
      .pipe(
        map((data) => {
          this.dataViewControlsTranslations = {
            sortDropdownTooltip: data['ACTIONS.SEARCH.SORT_BY'],
            sortDropdownPlaceholder: data['ACTIONS.SEARCH.SORT_BY'],
            filterInputPlaceholder: data['ACTIONS.SEARCH.FILTER'],
            filterInputTooltip: data['ACTIONS.SEARCH.FILTER_OF'] + data['SLOT.NAME']
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
    this.slot = slot
    this.detailSlotId = this.slot.id
    this.changeMode = this.hasEditPermission ? 'EDIT' : 'VIEW'
    this.showSlotDetailDialog = true
  }

  // detail dialog closed - reload data on changes
  public onSlotDetailClosed(changed: boolean) {
    this.slot = undefined
    this.detailSlotId = undefined
    this.changeMode = 'VIEW'
    this.showSlotDetailDialog = false
    this.showSlotDeleteDialog = false
    if (changed) this.loadData()
  }

  public onAddSlot(ev: Event, slot: CombinedSlot): void {
    ev.stopPropagation()
    this.slotApi
      .createSlot({
        createSlotRequest: { workspaceId: this.workspace?.id, name: slot.name } as CreateSlotRequest
      })
      .subscribe({
        next: (slot) => this.loadData(),
        error: () => {
          this.msgService.error({ summaryKey: 'ACTIONS.EXPORT.MESSAGE.NOK' })
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
}
