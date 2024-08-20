import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import { SlotAPIService, SlotComponent, UpdateSlotRequest, Workspace } from 'src/app/shared/generated'
import { ChangeMode, CombinedSlot, ExtendedComponent } from '../workspace-slots/workspace-slots.component'

@Component({
  selector: 'app-workspace-slot-detail',
  templateUrl: './workspace-slot-detail.component.html',
  styleUrls: ['./workspace-slot-detail.component.scss']
})
export class WorkspaceSlotDetailComponent implements OnChanges {
  @Input() workspace!: Workspace | undefined
  @Input() slotOrg: CombinedSlot | undefined
  @Input() psComponentsOrg!: ExtendedComponent[]
  @Input() wProductNames: string[] = []

  @Input() changeMode: ChangeMode = 'VIEW'
  @Input() displayDetailDialog = false
  @Input() displayDeleteDialog = false
  @Output() detailClosed: EventEmitter<boolean> = new EventEmitter()
  @Output() changed: EventEmitter<boolean> = new EventEmitter()

  public dateFormat = 'medium'
  public slot: CombinedSlot | undefined
  public slotName!: string
  public wComponents!: ExtendedComponent[]
  public psComponents!: ExtendedComponent[] // org ps components reduced by used in slot
  public hasEditPermission = false
  public displayDeregisterConfirmation = false
  private deregisterItems: ExtendedComponent[] = []
  private wComponentsOrg: ExtendedComponent[] = []

  constructor(
    private slotApi: SlotAPIService,
    private user: UserService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {
    this.hasEditPermission = this.user.hasPermission('WORKSPACE_SLOT#EDIT')
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm' : 'medium'
  }

  public sortComponentsByName(a: ExtendedComponent, b: ExtendedComponent): number {
    return (a.name ? a.name.toUpperCase() : '').localeCompare(b.name ? b.name.toUpperCase() : '')
  }

  public ngOnChanges(): void {
    if (this.slotOrg) {
      this.slot = { ...this.slotOrg }
      this.slotName = this.slot.name ?? ''
      // extract ps components
      this.wComponents = this.slot.psComponents ?? []
      this.wComponentsOrg = [...this.wComponents]
      this.psComponents = []
      // select available components from product store and registered workspaces
      this.psComponentsOrg.forEach((c) => {
        if (this.wComponents.filter((wc) => wc.name === c.name).length === 0)
          if (this.wProductNames.includes(c.productName)) this.psComponents.push(c)
      })
      this.psComponents.sort(this.sortComponentsByName)
    }
  }

  public onClose(): void {
    this.detailClosed.emit(false)
  }

  /**
   * UI Events: DETAIL
   */
  return(event: any) {
    event.stopPropagation()
  }
  public onMoveToSource(event: any): void {
    this.deregisterItems = event.items
    this.displayDeregisterConfirmation = true
  }
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
    this.onSaveSlot()
  }

  public onSaveSlot() {
    if (this.slot) {
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
            this.msgService.success({ summaryKey: 'ACTIONS.EDIT.SLOT_OK' })
            this.changed.emit(true)
          },
          error: (err) => {
            this.msgService.error({ summaryKey: 'ACTIONS.EDIT.SLOT_NOK' })
            console.error(err.error)
          }
        })
    }
  }

  public onDeleteSlot() {
    if (this.slot) {
      this.slotApi.deleteSlotById({ id: this.slot.id! }).subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.SLOT_OK' })
          this.detailClosed.emit(true)
        },
        error: (err) => {
          this.msgService.error({ summaryKey: 'ACTIONS.DELETE.SLOT_NOK' })
          console.error(err.error)
        }
      })
    }
  }
}
