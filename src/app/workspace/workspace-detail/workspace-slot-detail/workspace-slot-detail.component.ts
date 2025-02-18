import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import { SlotAPIService, SlotComponent, UpdateSlotRequest } from 'src/app/shared/generated'
import { ChangeMode, CombinedSlot, ExtendedComponent } from '../workspace-slots/workspace-slots.component'

@Component({
  selector: 'app-workspace-slot-detail',
  templateUrl: './workspace-slot-detail.component.html',
  styleUrls: ['./workspace-slot-detail.component.scss']
})
export class WorkspaceSlotDetailComponent implements OnChanges {
  @Input() slotOrg: CombinedSlot | undefined
  @Input() psComponentsOrg: ExtendedComponent[] = []
  @Input() wProductNames: string[] = []
  @Input() changeMode: ChangeMode = 'VIEW'
  @Input() displayDetailDialog = false
  @Input() displayDeleteDialog = false
  @Output() detailClosed: EventEmitter<boolean> = new EventEmitter()

  public dateFormat = 'medium'
  public slot: CombinedSlot | undefined
  public wComponents: ExtendedComponent[] = []
  public psComponents: ExtendedComponent[] = [] // org ps components reduced by used in slot
  public hasEditPermission = false
  public displayDeregisterConfirmation = false
  private deregisterItems: ExtendedComponent[] = [] // moved items
  private wComponentsOrg: ExtendedComponent[] = [] // used for restore
  public showTargetControls = false // manage visibility of target controls due to picklist bug

  constructor(
    private readonly slotApi: SlotAPIService,
    private readonly user: UserService,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService
  ) {
    this.hasEditPermission = this.user.hasPermission('WORKSPACE_SLOT#EDIT')
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm:ss' : 'medium'
  }

  public sortComponentsByName(a: ExtendedComponent, b: ExtendedComponent): number {
    return (a.name ? a.name.toUpperCase() : '').localeCompare(b.name ? b.name.toUpperCase() : '')
  }

  public ngOnChanges(): void {
    if (this.slotOrg && this.slot === undefined) {
      this.slot = { ...this.slotOrg }
      // extract ps components
      this.wComponents = [...this.slot.psComponents]
      this.wComponentsOrg = [...this.wComponents] // to be able to restore
      this.psComponents = []
      // collect available but not yet registered components from product store/workspace
      this.psComponentsOrg.forEach((c) => {
        if (this.wComponents.filter((wc) => wc.name === c.name).length === 0)
          if (this.wProductNames.includes(c.productName)) this.psComponents.push(c)
      })
      this.psComponents.sort(this.sortComponentsByName)
    }
  }

  public onClose(): void {
    if (this.slotOrg && this.slot) {
      this.detailClosed.emit(this.slotOrg?.modificationCount !== this.slot?.modificationCount)
      this.slot = undefined
      this.slotOrg = undefined
    }
  }

  /**
   * UI Events: DETAIL
   */
  return(event: any) {
    event.stopPropagation()
  }

  // fix picklist bug: hide controls if not one item is selected
  public onTargetSelect(event: any) {
    this.showTargetControls = event.items.length === 1
  }

  // The picklist has done the deregistration immediatly - roll back with more effort
  public onDeregister(event: any): void {
    this.deregisterItems = event.items
    this.displayDeregisterConfirmation = true
  }
  // restore the previous state: on user abortion or closing the dialog
  public onDeregisterCancellation() {
    if (this.deregisterItems.length === 0) return
    this.displayDeregisterConfirmation = false
    // restore
    for (const comp of this.deregisterItems) {
      this.psComponents = this.psComponents.filter((psc) => psc.name !== comp.name)
    }
    this.wComponents = this.wComponentsOrg
    this.wComponentsOrg = [...this.wComponents]
    this.deregisterItems = []
  }

  public onDeregisterConfirmation(): void {
    this.displayDeregisterConfirmation = false
    this.onSaveSlot(false)
  }

  public onSaveSlot(reorder: boolean) {
    if (this.slot) {
      // picklist bug: ignore change if only one component in list
      if (reorder && this.slot.components && this.slot.components.length < 2) return
      this.slotApi
        .updateSlot({
          id: this.slot.id!,
          updateSlotRequest: {
            modificationCount: this.slot.modificationCount!,
            name: this.slot.name!,
            components: this.wComponents.map((ec) => {
              return { productName: ec.productName, appId: ec.appId, name: ec.name } as SlotComponent
            })
          } as UpdateSlotRequest
        })
        .subscribe({
          next: (data) => {
            if (this.slot) {
              this.slot.modificationCount = data.modificationCount
              this.slot.modificationDate = data.modificationDate
              this.slot.components = data.components
            }
            // clean up
            this.deregisterItems = []
            this.wComponentsOrg = [...this.wComponents]
            this.msgService.success({ summaryKey: 'ACTIONS.EDIT.SLOT_OK' })
          },
          error: (err) => {
            this.msgService.error({ summaryKey: 'ACTIONS.EDIT.SLOT_NOK' })
            console.error('updateSlot', err)
          }
        })
    }
  }

  public onDeleteSlot() {
    if (this.slot) {
      this.slotApi.deleteSlotById({ id: this.slot.id! }).subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.SLOT.MESSAGE_OK' })
          this.detailClosed.emit(true)
        },
        error: (err) => {
          this.msgService.error({ summaryKey: 'ACTIONS.DELETE.SLOT.MESSAGE_NOK' })
          console.error('deleteSlotById', err)
        }
      })
    }
  }
}
