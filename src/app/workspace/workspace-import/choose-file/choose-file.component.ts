import { Component, EventEmitter, OnInit, Output } from '@angular/core'
import { HttpHeaders } from '@angular/common/http'
import { TranslateService } from '@ngx-translate/core'
import { ImportRequestDTOv1, MenuItemStructureDTO } from '../../../generated'

@Component({
  selector: 'wm-import-choose-file',
  templateUrl: './choose-file.component.html',
  styleUrls: ['./choose-file.component.scss']
})
export class ChooseFileComponent implements OnInit {
  @Output() public importFileSelected = new EventEmitter<ImportRequestDTOv1>()

  importRequestDTO: ImportRequestDTOv1 | null = null

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
    if (this.importRequestDTO) this.importFileSelected.emit(this.importRequestDTO)
  }

  public onSelect(event: { files: FileList }): void {
    event.files[0].text().then((text) => {
      this.importRequestDTO = null
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
            const importRequestDTO = JSON.parse(text)
            if (this.isPortalImportRequestDTO(importRequestDTO, data)) {
              this.importRequestDTO = importRequestDTO
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
    this.importRequestDTO = null
    this.importError = false
    this.validationErrorCause = ''
  }

  public isFileValid(): boolean {
    return !this.importError && !!this.importRequestDTO
  }

  private isPortalImportRequestDTO(obj: unknown, data: any): obj is ImportRequestDTOv1 {
    const dto = obj as ImportRequestDTOv1
    const themeCondition = dto.themeImportData ? dto.themeImportData.name : true

    if (!dto.portal) {
      this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_PORTAL_MISSING']
    } else if (!dto.portal.portalName) {
      this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_PORTAL_NAME_MISSING']
    } else if (!dto.portal.portalRoles) {
      this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_PORTAL_ROLES_MISSING']
    } else if (!themeCondition) {
      this.validationErrorCause = data['PORTAL_IMPORT.VALIDATION_THEME_NAME_MISSING']
    } else if (dto.menuItems) {
      for (const el of dto.menuItems) {
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
        } else if (!(typeof el.portalExit === 'boolean')) {
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
      dto.portal &&
      dto.portal.portalName &&
      dto.portal.portalRoles &&
      dto.menuItems?.every?.(this.isMenuItem) &&
      themeCondition
    )
  }

  private isMenuItem(obj: unknown): obj is MenuItemStructureDTO {
    const dto = obj as MenuItemStructureDTO
    return !!(
      dto.key &&
      dto.name &&
      typeof dto.position === 'number' &&
      typeof dto.disabled === 'boolean' &&
      typeof dto.portalExit === 'boolean'
    )
  }
}
