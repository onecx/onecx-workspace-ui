import { Component, Input, SimpleChanges, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Subject, catchError, finalize, map, of, switchMap, tap, takeUntil, Observable } from 'rxjs'
//import { SelectItem } from 'primeng/api'
import { DataView } from 'primeng/dataview'

import { DataViewControlTranslations } from '@onecx/portal-integration-angular'
import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import {
  GetSlotsForWorkspaceRequestParams,
  ProductAPIService,
  Workspace,
  //WorkspaceSlots,
  Slot, // id, workspaceId, name, components[]
  SlotPS, // name, undeployed, deprecated
  SlotComponent, // productName, appId, name
  SlotAPIService
} from 'src/app/shared/generated'
import { limitText } from 'src/app/shared/utils'

export type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT' | 'COPY' | 'DELETE'
export type PSSlot = SlotPS & { pName?: string; pDisplayName?: string }
export type CombinedSlot = Slot & {
  bucket: 'SOURCE' | 'TARGET'
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
  private triggerSubject = new Subject<CombinedSlot[]>()
  public wSlots$!: Observable<CombinedSlot[]>
  public wSlots!: CombinedSlot[]
  public psSlots$!: Observable<CombinedSlot[]>
  public psSlots!: CombinedSlot[]
  public psComponents!: ExtendedComponent[]

  public slot: CombinedSlot | undefined

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
    // this.triggerSubject.next([])
  }
  public loadData(): void {
    this.loading = true
    this.exceptionKey = undefined
    this.declareWorkspaceSlots()
    this.declarePsSlots()
    this.wSlots$ //= this.triggerSubject.asObservable()
      .pipe(
        switchMap((wSlots) => {
          return this.psSlots$
        })
      )
      .subscribe()
  }

  /**
   * SEARCH
   */
  private declareWorkspaceSlots(): void {
    this.wSlots$ = this.slotApi
      .getSlotsForWorkspace({ id: this.workspace?.id } as GetSlotsForWorkspaceRequestParams)
      .pipe(
        takeUntil(this.destroy$),
        tap((res) => console.log('tap => wSlots', res)),
        map((res) => {
          this.wSlots = []
          if (res.slots)
            for (let s of res.slots)
              this.wSlots.push({
                ...s,
                bucket: 'TARGET',
                changes: false,
                psSlots: [],
                psComponents: []
              } as CombinedSlot)
          return this.wSlots.sort(this.sortSlotsByName)
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.SLOTS'
          console.error('searchSlots():', err)
          return of([] as CombinedSlot[])
        }),
        finalize(() => (this.loading = false))
      )
  }
  public sortSlotsByName(a: Slot, b: Slot): number {
    return (a.name ? a.name.toUpperCase() : '').localeCompare(b.name ? b.name.toUpperCase() : '')
  }
  private declarePsSlots(): void {
    this.psSlots$ = this.psProductApi.searchAvailableProducts({ productStoreSearchCriteria: {} }).pipe(
      tap((res) => console.log('tap => psSlots', res)),
      map((res) => {
        this.psSlots = []
        this.psComponents = []
        if (res.stream) {
          for (let p of res.stream) {
            // 1. enrich wSlots with product store flags
            p.slots?.forEach((ps) => {
              this.psSlots.push(ps as CombinedSlot)
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
          // 3. enrich component data
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
        console.log('psComponents', this.psComponents)
        console.log('wSlots', this.wSlots)
        return this.psSlots
      }),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
        console.error('searchAvailableProducts():', err)
        return of([])
      }),
      finalize(() => (this.loading = false))
    )
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
    this.changeMode = this.hasEditPermission ? 'EDIT' : 'VIEW'
    this.showSlotDetailDialog = true
  }

  // detail dialog closed - reload data on changes
  public onSlotDetailClosed(changed: boolean) {
    this.slot = undefined
    this.changeMode = 'VIEW'
    this.showSlotDetailDialog = false
    this.showSlotDeleteDialog = false
    if (changed) this.loadData()
  }
}
