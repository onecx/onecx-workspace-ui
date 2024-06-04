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
  //  SlotComponent, // productName, appId, name
  SlotAPIService
} from 'src/app/shared/generated'
import { limitText } from 'src/app/shared/utils'

export type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT' | 'COPY' | 'DELETE'
export type CombinedSlot = Slot & { changes?: boolean; psSlot?: SlotPS }

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
  public psSlotMap!: Map<string, SlotPS>
  public psSlots!: CombinedSlot[]
  public slot: Slot | undefined

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
    console.log('reload')
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
          this.wSlots = wSlots
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
        tap((res) => console.log('wSlots', res)),
        map((res) => {
          this.wSlots = []
          res.slots?.forEach((slot) => {
            this.wSlots.push(slot)
          })
          return this.wSlots
        }),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.SLOTS'
          console.error('searchSlots():', err)
          return of([] as Slot[])
        }),
        finalize(() => (this.loading = false))
      )
  }
  public sortSlotsByName(a: Slot, b: Slot): number {
    return (a.name ? a.name.toUpperCase() : '').localeCompare(b.name ? b.name.toUpperCase() : '')
  }
  private declarePsSlots(): void {
    this.psSlots$ = this.psProductApi.searchAvailableProducts({ productStoreSearchCriteria: {} }).pipe(
      tap((res) => console.log('psSlots', res)),
      map((res) => {
        this.psSlots = []
        if (res.stream)
          for (let p of res.stream)
            p.slots?.forEach((s) => {
              this.psSlots.push(s)
            })
        console.log('this.psSlots', this.psSlots)
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
  public onEditSlot(ev: Event, slot: Slot): void {
    ev.stopPropagation()
    this.slot = slot
    this.changeMode = this.hasEditPermission ? 'EDIT' : 'VIEW'
    this.showSlotDetailDialog = true
  }

  // dialog response handling
  public onSlotChanged(changed: boolean) {
    this.slot = undefined
    this.changeMode = 'VIEW'
    this.showSlotDetailDialog = false
    this.showSlotDeleteDialog = false
    if (changed) this.loadData()
  }
}
