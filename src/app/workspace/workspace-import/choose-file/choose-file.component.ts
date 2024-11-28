import { Component, EventEmitter, OnInit, Output } from '@angular/core'
import { HttpHeaders } from '@angular/common/http'
import { TranslateService } from '@ngx-translate/core'
import { FileSelectEvent } from 'primeng/fileupload'

@Component({
  selector: 'app-import-choose-file',
  templateUrl: './choose-file.component.html'
})
export class ChooseFileComponent implements OnInit {
  @Output() public importFileSelected = new EventEmitter<any>()

  importWorkspace = null

  public httpHeaders!: HttpHeaders
  public reader = new FileReader()
  public importError = false
  public validationErrorCause: string | undefined = undefined

  constructor(private readonly translate: TranslateService) {}

  public ngOnInit(): void {
    this.httpHeaders = new HttpHeaders()
    this.httpHeaders.set('Content-Type', 'application/json')
  }

  public uploadHandler(): void {
    if (this.importWorkspace) this.importFileSelected.emit(this.importWorkspace)
  }

  public onFileSelect(event: FileSelectEvent): void {
    event.files[0].text().then((text) => {
      this.importWorkspace = null
      this.importError = false
      this.validationErrorCause = undefined

      this.translate
        .get([
          'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_MISSING',
          'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_NAME_MISSING',
          'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_DISPLAY_NAME_MISSING',
          'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_URL_MISSING',
          'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_THEME_MISSING',
          'WORKSPACE_IMPORT.VALIDATION_WORKSPACE_ROLES_MISSING',
          'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_KEY_MISSING',
          'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_NAME_MISSING',
          'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_POSITION',
          'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_DISABLED',
          'WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_WORKSPACEEXIT',
          'WORKSPACE_IMPORT.VALIDATION_MENU_NOT_EXIST',
          'WORKSPACE_IMPORT.VALIDATION_RESULT',
          'WORKSPACE_IMPORT.VALIDATION_JSON_ERROR'
        ])
        .subscribe((data) => {
          try {
            const importWorkspace = JSON.parse(text)
            if (this.isWorkspaceImportValid(importWorkspace, data)) {
              this.importWorkspace = importWorkspace
            }
          } catch (err) {
            console.error('Parse Error', err)
            this.importError = true
            this.validationErrorCause =
              data['WORKSPACE_IMPORT.VALIDATION_RESULT'] + data['WORKSPACE_IMPORT.VALIDATION_JSON_ERROR']
          }
        })
    })
  }

  public onClear(): void {
    this.importWorkspace = null
    this.importError = false
    this.validationErrorCause = undefined
  }

  public isFileValid(): boolean {
    return !this.importError && !!this.importWorkspace
  }

  public isWorkspaceImportValid(obj: unknown, data: any): boolean {
    const dto: any = obj
    if (dto.workspaces) {
      const key: string[] = Object.keys(dto.workspaces)
      if (!dto.workspaces[key[0]]) {
        this.validationErrorCause = data['WORKSPACE_IMPORT.VALIDATION_WORKSPACE_MISSING']
      } else if (!dto.workspaces[key[0]].name) {
        this.validationErrorCause = data['WORKSPACE_IMPORT.VALIDATION_WORKSPACE_NAME_MISSING']
      } else if (!dto.workspaces[key[0]].displayName) {
        this.validationErrorCause = data['WORKSPACE_IMPORT.VALIDATION_WORKSPACE_DISPLAY_NAME_MISSING']
      } else if (!dto.workspaces[key[0]].theme) {
        this.validationErrorCause = data['WORKSPACE_IMPORT.VALIDATION_WORKSPACE_THEME_MISSING']
      } else if (!dto.workspaces[key[0]].baseUrl) {
        this.validationErrorCause = data['WORKSPACE_IMPORT.VALIDATION_WORKSPACE_URL_MISSING']
      } else this.checkMenuItems(dto, data)
    } else {
      this.validationErrorCause = data['WORKSPACE_IMPORT.VALIDATION_WORKSPACE_MISSING']
    }
    if (this.validationErrorCause) {
      this.importError = true
      this.validationErrorCause = data['WORKSPACE_IMPORT.VALIDATION_RESULT'] + this.validationErrorCause
      return false
    }
    return true
  }

  private checkMenuItems(dto: any, data: any) {
    if (dto.workspaces) {
      const key: string[] = Object.keys(dto.workspaces)
      const menuSnapshot = dto.workspaces[key[0]].menu
      if (menuSnapshot?.menu?.menuItems) {
        for (const el of menuSnapshot.menu.menuItems) {
          if (!el.key) {
            this.validationErrorCause = data['WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_KEY_MISSING']
            break
          } else if (!el.name) {
            this.validationErrorCause = data['WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_NAME_MISSING']
            break
          } else if (typeof el.position !== 'number') {
            this.validationErrorCause = data['WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_POSITION']
            break
          } else if (typeof el.disabled !== 'boolean') {
            this.validationErrorCause = data['WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_DISABLED']
            break
          } else if (typeof el.external !== 'boolean') {
            this.validationErrorCause = data['WORKSPACE_IMPORT.VALIDATION_MENU_ITEM_WRONG_WORKSPACEEXIT']
            break
          }
        }
      }
    }
  }
}
