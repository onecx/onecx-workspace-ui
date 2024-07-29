import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { HttpHeaders } from '@angular/common/http'
import { TranslateService } from '@ngx-translate/core'

import { PortalMessageService } from '@onecx/angular-integration-interface'
import { MenuItemAPIService, MenuSnapshot } from 'src/app/shared/generated'
import { FileSelectEvent } from 'primeng/fileupload'

@Component({
  selector: 'app-menu-import',
  templateUrl: './menu-import.component.html',
  styleUrls: ['./menu-import.component.scss']
})
export class MenuImportComponent implements OnInit {
  @Input() workspaceName!: string
  @Input() displayDialog = false
  @Output() public hideDialog = new EventEmitter()
  @Output() public importEmitter = new EventEmitter()

  public menuImportError = false
  public httpHeaders!: HttpHeaders
  private menuItemStructure: MenuSnapshot | undefined

  constructor(
    private menuApi: MenuItemAPIService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {}

  public ngOnInit(): void {
    this.httpHeaders = new HttpHeaders()
    this.httpHeaders.set('Content-Type', 'application/json')
  }

  public onClose(imported: boolean = false): void {
    if (imported) this.importEmitter.emit()
    this.hideDialog.emit()
  }
  public onImportMenuClear(): void {
    this.menuItemStructure = undefined
    this.menuImportError = false
  }
  public onImportMenuSelect(event: FileSelectEvent): void {
    event.files[0].text().then((text) => {
      this.menuItemStructure = undefined
      this.menuImportError = false
      try {
        const menuItemStructure: MenuSnapshot = JSON.parse(text) as MenuSnapshot
        if (this.isMenuImportRequestDTO2(menuItemStructure)) {
          this.menuItemStructure = menuItemStructure
          console.info('imported menu structure', this.menuItemStructure)
        } else {
          console.error('imported menu parse error', menuItemStructure)
          this.menuItemStructure = undefined
          this.menuImportError = true
        }
      } catch (err) {
        console.error('imported menu parse error', err)
        this.menuImportError = true
      }
    })
  }
  private isMenuImportRequestDTO2(obj: unknown): obj is MenuSnapshot {
    const dto = obj as MenuSnapshot
    return !!(typeof dto === 'object' && dto?.menu?.menuItems?.length)
  }

  public onImportMenuConfirmation(): void {
    this.importEmitter.emit()
    if (this.workspaceName && this.menuItemStructure) {
      this.menuApi
        .importMenuByWorkspaceName({
          workspaceName: this.workspaceName,
          menuSnapshot: this.menuItemStructure
        })
        .subscribe({
          next: () => {
            this.msgService.success({ summaryKey: 'DIALOG.MENU.IMPORT.UPLOAD_OK' })
            this.onClose(true)
          },
          error: (err: any) => {
            this.msgService.error({ summaryKey: 'DIALOG.MENU.IMPORT.UPLOAD_NOK' })
            console.error(err)
          }
        })
    }
  }
}
