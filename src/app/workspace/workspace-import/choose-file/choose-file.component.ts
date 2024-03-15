import { Component, EventEmitter, OnInit, Output } from '@angular/core'
import { HttpHeaders } from '@angular/common/http'
import { TranslateService } from '@ngx-translate/core'
import { WorkspaceSnapshot, EximWorkspaceMenuItem } from 'src/app/shared/generated'

@Component({
  selector: 'app-import-choose-file',
  templateUrl: './choose-file.component.html',
  styleUrls: ['./choose-file.component.scss']
})
export class ChooseFileComponent implements OnInit {
  @Output() public importFileSelected = new EventEmitter<WorkspaceSnapshot>()

  importWorkspace: WorkspaceSnapshot | null = null

  public httpHeaders!: HttpHeaders
  public reader = new FileReader()
  public importError = false
  public validationErrorCause: string

  constructor(private readonly translate: TranslateService) {
    this.validationErrorCause = ''
  }

  public ngOnInit(): void {
    this.validationErrorCause = ''
    this.httpHeaders = new HttpHeaders()
    this.httpHeaders.set('Content-Type', 'application/json')
  }

  public uploadHandler(): void {
    if (this.importWorkspace) this.importFileSelected.emit(this.importWorkspace)
  }

  public onSelect(event: { files: FileList }): void {
    event.files[0].text().then((text) => {
      this.importWorkspace = null
      this.importError = false
      this.validationErrorCause = ''

      this.translate
        .get([
          'PORTAL_IMPORT.VALIDATION_PORTAL_MISSING',
          'PORTAL_IMPORT.VALIDATION_PORTAL_NAME_MISSING',
          'PORTAL_IMPORT.VALIDATION_PORTAL_ROLES_MISSING',
          'PORTAL_IMPORT.VALIDATION_THEME_NAME_MISSING',
          'PORTAL_IMPORT.VALIDATION_MENU_ITEM_KEY_MISSING',
          'PORTAL_IMPORT.VALIDATION_MENU_ITEM_NAME_MISSING',
          'PORTAL_IMPORT.VALIDATION_MENU_ITEM_WRONG_POSITION',
          'PORTAL_IMPORT.VALIDATION_MENU_ITEM_WRONG_DISABLED',
          'PORTAL_IMPORT.VALIDATION_MENU_ITEM_WRONG_PORTALEXIT',
          'PORTAL_IMPORT.VALIDATION_MENU_NOT_EXIST',
          'PORTAL_IMPORT.VALIDATION_RESULT',
          'PORTAL_IMPORT.VALIDATION_JSON_ERROR'
        ])
        .subscribe((data) => {
          try {
            const importWorkspace = JSON.parse(text)
            if (this.isPortalImportWorkspace(importWorkspace, data)) {
              this.importWorkspace = importWorkspace
            }
          } catch (err) {
            console.error('Import Error' /* , err */)
            this.importError = true
            this.validationErrorCause =
              data['PORTAL_IMPORT.VALIDATION_RESULT'] + data['PORTAL_IMPORT.VALIDATION_JSON_ERROR']
          }
        })
    })
  }

  public onClear(): void {
    this.importWorkspace = null
    this.importError = false
    this.validationErrorCause = ''
  }

  public isFileValid(): boolean {
    return !this.importError && !!this.importWorkspace
  }

  private isPortalImportWorkspace(obj: unknown, data: any): obj is WorkspaceSnapshot {
    const dto = obj as WorkspaceSnapshot
    // CHANGE WHEN IMPORT OF MORE WORKSPACES IS POSSIBLE
    let key: string[] = []
    if (dto.workspaces) {
      key = Object.keys(dto.workspaces)
    }
    // console.log('NAME', dto.workspaces.keys[0])
    // const themeCondition = dto.workspaces.keys[0].themeImportData ? dto.workspaces.keys[0].themeImportData.name : true

    if (dto.workspaces) {
      if (!dto || !dto.workspaces[key[0]]) {
        this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_PORTAL_MISSING']
      } else if (!dto.workspaces[key[0]].name) {
        this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_PORTAL_NAME_MISSING']
        /* } else if (!dto.workspaces[key[0]].workspaceRoles) {
        this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_PORTAL_ROLES_MISSING'] */
      } /* else if (!themeCondition) {
        this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_THEME_NAME_MISSING']
      } */ else if (dto.workspaces[key[0]].menu?.menu?.menuItems) {
        for (const el of dto.workspaces[key[0]].menu?.menu?.menuItems!) {
          if (!el.key) {
            this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_MENU_ITEM_KEY_MISSING']
            break
          } else if (!el.name) {
            this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_MENU_ITEM_NAME_MISSING']
            break
          } else if (!(typeof el.position === 'number')) {
            this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_MENU_ITEM_WRONG_POSITION']
            break
          } else if (!(typeof el.disabled === 'boolean')) {
            this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_MENU_ITEM_WRONG_DISABLED']
            break
          } else if (!(typeof el.external === 'boolean')) {
            this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_MENU_ITEM_WRONG_PORTALEXIT']
            break
          }
        }
      } /* else {
        this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_MENU_NOT_EXIST']
      } */
    }
    if (this.validationErrorCause !== '') {
      this.importError = true
      this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_RESULT'] + this.validationErrorCause
    }

    return false
    // return !!typeof dto === 'object' && dto && dto.workspaces && dto.workspaces[key[0]].name
    // && dto.workspaces[key[0]].menu?.menu?.menuItems?.every?.(this.isMenuItem)
    // && themeCondition
  }

  private isMenuItem(obj: unknown): obj is EximWorkspaceMenuItem {
    const dto = obj as EximWorkspaceMenuItem
    return !!(
      dto.key &&
      dto.name &&
      typeof dto.position === 'number' &&
      typeof dto.disabled === 'boolean' &&
      typeof dto.external === 'boolean'
    )
  }
}
