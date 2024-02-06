import { Component, EventEmitter, OnInit, Output } from '@angular/core'
import { HttpHeaders } from '@angular/common/http'
import { TranslateService } from '@ngx-translate/core'
import { EximWorkspace, EximWorkspaceMenuItem } from '../../../shared/generated'

@Component({
  selector: 'app-import-choose-file',
  templateUrl: './choose-file.component.html',
  styleUrls: ['./choose-file.component.scss']
})
export class ChooseFileComponent implements OnInit {
  @Output() public importFileSelected = new EventEmitter<EximWorkspace>()

  importWorkspace: EximWorkspace | null = null

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

  private isPortalImportWorkspace(obj: unknown, data: any): obj is EximWorkspace {
    const dto = obj as EximWorkspace
    const themeCondition = dto.themeImportData ? dto.themeImportData.name : true

    if (!dto) {
      this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_PORTAL_MISSING']
    } else if (!dto.name) {
      this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_PORTAL_NAME_MISSING']
    } else if (!dto.workspaceRoles) {
      this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_PORTAL_ROLES_MISSING']
    } else if (!themeCondition) {
      this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_THEME_NAME_MISSING']
    } else if (dto.menu?.menu?.menuItems) {
      for (const el of dto.menu.menu.menuItems) {
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
        } else if (!(typeof el.workspaceExit === 'boolean')) {
          this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_MENU_ITEM_WRONG_PORTALEXIT']
          break
        }
      }
    } else {
      this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_MENU_NOT_EXIST']
    }
    if (this.validationErrorCause !== '') {
      this.importError = true
      this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_RESULT'] + this.validationErrorCause
    }

    return !!(
      typeof dto === 'object' &&
      dto &&
      dto.name &&
      dto.workspaceRoles &&
      dto.menu?.menu?.menuItems?.every?.(this.isMenuItem) &&
      themeCondition
    )
  }

  private isMenuItem(obj: unknown): obj is EximWorkspaceMenuItem {
    const dto = obj as EximWorkspaceMenuItem
    return !!(
      dto.key &&
      dto.name &&
      typeof dto.position === 'number' &&
      typeof dto.disabled === 'boolean' &&
      typeof dto.workspaceExit === 'boolean'
    )
  }
}
