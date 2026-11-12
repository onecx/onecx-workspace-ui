import { Component, EventEmitter, Input, Output, OnChanges, inject, OnInit } from '@angular/core'
import { TranslateModule, TranslateService } from '@ngx-translate/core'

import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'
import { FloatLabelModule } from 'primeng/floatlabel'
import { InputGroupAddonModule } from 'primeng/inputgroupaddon'
import { InputGroupModule } from 'primeng/inputgroup'
import { InputTextModule } from 'primeng/inputtext'
import { MessageModule } from 'primeng/message'
import { PickListModule, PickListMoveToSourceEvent, PickListMoveToTargetEvent } from 'primeng/picklist'
import { TabsModule } from 'primeng/tabs'
import { TooltipModule } from 'primeng/tooltip'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import { SlotAPIService, UpdateSlotRequest } from 'src/app/shared/generated'
import { ChangeMode, ExtendedSlot, ExtendedComponent, PSSlot } from '../workspace-slots/workspace-slots.component'
import { WorkspaceSlotDeregistrationComponent } from '../workspace-slot-deregistration/workspace-slot-deregistration.component'

@Component({
  selector: 'app-workspace-slot-detail',
  standalone: true,
  imports: [
    ButtonModule,
    DialogModule,
    FloatLabelModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    MessageModule,
    PickListModule,
    TabsModule,
    TooltipModule,
    TranslateModule,
    // components
    WorkspaceSlotDeregistrationComponent
  ],
  templateUrl: './workspace-slot-detail.component.html',
  styleUrls: ['./workspace-slot-detail.component.scss']
})
export class WorkspaceSlotDetailComponent implements OnInit, OnChanges {
  private readonly slotApi = inject(SlotAPIService)
  private readonly user = inject(UserService)
  private readonly translate = inject(TranslateService)
  private readonly msgService = inject(PortalMessageService)

  @Input() slot: ExtendedSlot | undefined // displayed slot
  @Input() workspace_id!: string // only id is needed for API calls
  @Input() psComponentsOrg: ExtendedComponent[] = [] // all PS components
  @Input() wProductNames: string[] = [] // names of all products registered in workspace
  @Input() changeMode: ChangeMode = 'VIEW'
  @Input() displayDialog = false
  @Output() detailClosed: EventEmitter<boolean> = new EventEmitter()

  public dateFormat: string
  public slotOrg: ExtendedSlot | undefined // used for restore
  public psComponents: ExtendedComponent[] = [] // org ps components reduced by used in slot
  public wComponentsOrg: ExtendedComponent[] = [] // used for restore
  public filteredPsComponents: ExtendedComponent[] = [] // displaying filtered, unregistered components,
  public filteredWComponents: ExtendedComponent[] = [] // displaying filtered, registered components
  public hasEditPermission = false
  public displayDeregisterConfirmation = false
  public selectedTabIndex = '0'
  public selectedComponent: ExtendedComponent | undefined
  private deregisterItems: ExtendedComponent[] = [] // moved items
  public sourceFilterValue: string | undefined = undefined
  public targetFilterValue: string | undefined = undefined

  constructor() {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm:ss' : 'M/d/yy, hh:mm:ss a'
  }

  public async ngOnInit() {
    try {
      this.hasEditPermission = await this.user.hasPermission('WORKSPACE_SLOT#EDIT')
    } catch (err) {
      console.error(err)
    }
  }
  public ngOnChanges(): void {
    if (this.displayDialog && this.slot) {
      this.slotOrg = { ...this.slot } // to be able to restore and compare
      this.wComponentsOrg = []
      this.psComponents = []
      if (this.slot.psComponents) this.wComponentsOrg = [...this.slot.psComponents]
      this.collectPsComponents()
      if (this.slot.psSlots) this.slot.psSlots.sort(this.sortProducts)
      if (this.slot.productNames) this.slot.productNames.sort((a, b) => a.toUpperCase().localeCompare(b.toUpperCase()))
      this.selectedTabIndex = this.slot.productNames?.length === 0 ? '1' : '0'
      // init filter values and filtered component lists
      this.sourceFilterValue = undefined
      this.targetFilterValue = undefined
      this.filteredPsComponents = [...this.psComponents] // unregistered items
      this.filteredWComponents = [...this.wComponentsOrg] // registered items
      this.selectedComponent = undefined
    }
  }

  // Collect available but not yet registered components from product store
  private collectPsComponents() {
    for (const psComp of this.psComponentsOrg)
      if (
        !this.wComponentsOrg.some(
          (wc) => wc.productName === psComp.productName && wc.appId === psComp.appId && wc.name === psComp.name
        )
      )
        if (this.wProductNames.includes(psComp.productName))
          // registered products only
          this.psComponents.push(psComp)
    if (this.psComponents) this.psComponents.sort(this.sortComponents)
  }

  public sortComponents(a: ExtendedComponent, b: ExtendedComponent): number {
    return (
      a.name.toUpperCase().localeCompare(b.name.toUpperCase()) ||
      a.appId.toUpperCase().localeCompare(b.appId.toUpperCase()) ||
      a.productName.toUpperCase().localeCompare(b.productName.toUpperCase())
    )
  }
  public sortProducts(a: PSSlot, b: PSSlot): number {
    return a.pDisplayName.toUpperCase().localeCompare(b.pDisplayName.toUpperCase())
  }

  public onClose(): void {
    if (this.slot) {
      this.detailClosed.emit(this.slotOrg?.modificationCount !== this.slot?.modificationCount)
    }
  }

  /**
   * UI Events: DETAIL
   */
  public filterComponents(bucket: 'SOURCE' | 'TARGET', val?: string) {
    if (val?.trim() !== '') this.selectedComponent = undefined // deselect component if filter value is not empty
    if (!val || val.trim() === '') {
      if (bucket === 'SOURCE') {
        this.filteredPsComponents = [...this.psComponents]
        this.sourceFilterValue = undefined
      }
      if (bucket === 'TARGET') {
        this.filteredWComponents = [...this.wComponentsOrg]
        this.targetFilterValue = undefined
      }
      return
    }
    const lowerSearch = val?.trim().toLowerCase()
    if (bucket === 'SOURCE') {
      this.sourceFilterValue = val
      this.filteredPsComponents = this.psComponents.filter((item) => item.name.toLowerCase().includes(lowerSearch))
    }
    if (bucket === 'TARGET') {
      this.targetFilterValue = val
      this.filteredWComponents = this.wComponentsOrg.filter((item) => item.name.toLowerCase().includes(lowerSearch))
    }
  }

  /**
   * Select a component: workaround for displaying the selected component in the UI
   */
  public onComponentSelect(comp: ExtendedComponent) {
    this.selectedComponent = { ...comp } // create a copy to make it independent from the original object
  }

  /**
   * The picklist made the move only in UI (identity based, at the current position) and not for data,
   * so we handle the data move manually.
   * v18: the picklist made this move automatically
   * v19: the picklist does not move items automatically, so we handle it manually
   */
  public onAddComponentsToSlot(ev: PickListMoveToTargetEvent) {
    if (ev.items.length > 0) {
      // move in v19
      for (const item of ev.items) {
        this.wComponentsOrg = this.wComponentsOrg.filter(
          (wc) => !(wc.productName === item.productName && wc.appId === item.appId && wc.name === item.name)
        )
        this.wComponentsOrg.push({ ...item })
        this.psComponents = this.psComponents.filter(
          (psc) => !(psc.productName === item.productName && psc.appId === item.appId && psc.name === item.name)
        )
      }
      // refresh the target list (move to the end); an active target filter would hide the moved items
      this.targetFilterValue = undefined
      this.filterComponents('TARGET')
      // an active source filter still applies to the remaining items
      this.filterComponents('SOURCE', this.sourceFilterValue)
      this.selectedComponent = undefined
      this.onSaveSlot(false)
    }
  }

  /**
   * The picklist made the move only in UI and not for data.
   * Depends on the confirmation from the user to actually remove the components from the slot.
   */
  public onRemoveComponentsFromSlot(event: PickListMoveToSourceEvent): void {
    this.deregisterItems = event.items
    this.displayDeregisterConfirmation = true
  }

  // restore the previous state: on user abortion or closing the dialog
  public onDeregisterCancellation() {
    if (this.deregisterItems.length === 0) return
    this.displayDeregisterConfirmation = false
    if (this.deregisterItems.length > 0) {
      // restore
      for (const item of this.deregisterItems) {
        this.psComponents = this.psComponents.filter(
          (psc) => !(psc.productName === item.productName && psc.appId === item.appId && psc.name === item.name)
        )
      }
      this.filterComponents('SOURCE', this.sourceFilterValue) // renew filtered components
      this.filterComponents('TARGET', this.targetFilterValue)
      this.deregisterItems = []
      this.selectedComponent = undefined
    }
  }

  public onDeregisterConfirmation(): void {
    this.displayDeregisterConfirmation = false
    if (this.deregisterItems.length > 0) {
      // move
      for (const item of this.deregisterItems) {
        this.psComponents.push({ ...item })
      }
      this.selectedComponent = undefined
      this.onSaveSlot(false)
    }
  }

  /**
   * Save the current slot configuration
   * @param reorder - indicates if the components have been reordered
   */
  public onSaveSlot(reorder: boolean) {
    if (this.slot) {
      if (reorder && this.filteredWComponents.length < 2) return
      this.slotApi
        .addOrUpdateSlot({
          id: this.workspace_id,
          updateSlotRequest: {
            modificationCount: this.slot.modificationCount,
            name: this.slot.name,
            components: this.filteredWComponents.map((ec) => {
              return { productName: ec.productName, appId: ec.appId, name: ec.name }
            })
          } as UpdateSlotRequest
        })
        .subscribe({
          next: (data) => {
            if (this.slot)
              if (data) {
                this.slot.modificationCount = data.modificationCount
                this.slot.modificationDate = data.modificationDate
                this.slot.components = data.components
              } else {
                this.slot = {
                  ...this.slot,
                  id: undefined,
                  modificationCount: undefined,
                  modificationDate: undefined
                }
              }
            if (this.deregisterItems.length > 0) this.psComponents.sort(this.sortComponents)
            this.wComponentsOrg = [...this.filteredWComponents]
            this.deregisterItems = []
            this.selectedComponent = undefined
            this.msgService.success({ summaryKey: 'ACTIONS.EDIT.SLOT_OK' })
          },
          error: (err) => {
            this.msgService.error({ summaryKey: 'ACTIONS.EDIT.SLOT_NOK' })
            console.error('addOrUpdateSlot', err)
          }
        })
    }
  }
}
