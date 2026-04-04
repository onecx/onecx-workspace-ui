import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { FormArray, FormBuilder } from '@angular/forms'

import { Workspace, WorkspaceAPIService } from 'src/app/shared/generated'
import { PortalMessageService } from '@onecx/angular-integration-interface'

export type LanguageOption = {
  label: string
  value: string
}

@Component({
  selector: 'app-workspace-i18n',
  templateUrl: './workspace-i18n.component.html',
  styleUrls: ['./workspace-i18n.component.scss']
})
export class WorkspaceI18nComponent implements OnChanges {
  @Input() workspace!: Workspace
  @Input() workspaceI18nVisible = false
  @Input() propertyName: string | undefined = undefined
  @Input() propertyKey: string | undefined = undefined
  @Output() workspaceI18nVisibleChange = new EventEmitter<boolean>()

  private initialSnapshot = ''

  public translationsForm: FormArray
  public showAddRow = false
  public newLanguage: string | undefined = undefined
  public newValue = ''

  public readonly allLanguages: LanguageOption[] = [
    { value: 'ar', label: 'Arabic (ar)' },
    { value: 'cs', label: 'Czech (cs)' },
    { value: 'da', label: 'Danish (da)' },
    { value: 'de', label: 'German (de)' },
    { value: 'el', label: 'Greek (el)' },
    { value: 'en', label: 'English (en)' },
    { value: 'es', label: 'Spanish (es)' },
    { value: 'fi', label: 'Finnish (fi)' },
    { value: 'fr', label: 'French (fr)' },
    { value: 'hr', label: 'Croatian (hr)' },
    { value: 'hu', label: 'Hungarian (hu)' },
    { value: 'it', label: 'Italian (it)' },
    { value: 'ja', label: 'Japanese (ja)' },
    { value: 'ko', label: 'Korean (ko)' },
    { value: 'nl', label: 'Dutch (nl)' },
    { value: 'no', label: 'Norwegian (no)' },
    { value: 'pl', label: 'Polish (pl)' },
    { value: 'pt', label: 'Portuguese (pt)' },
    { value: 'ro', label: 'Romanian (ro)' },
    { value: 'ru', label: 'Russian (ru)' },
    { value: 'sk', label: 'Slovak (sk)' },
    { value: 'sl', label: 'Slovenian (sl)' },
    { value: 'sv', label: 'Swedish (sv)' },
    { value: 'tr', label: 'Turkish (tr)' },
    { value: 'uk', label: 'Ukrainian (uk)' },
    { value: 'zh', label: 'Chinese (zh)' }
  ]

  constructor(
    private readonly fb: FormBuilder,
    private readonly workspaceApi: WorkspaceAPIService,
    private readonly msgService: PortalMessageService
  ) {
    this.translationsForm = this.fb.array([])
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['workspaceI18nVisible']?.currentValue === true || changes['propertyName']?.currentValue) &&
      this.workspaceI18nVisible &&
      this.propertyName
    ) {
      this.initForm()
    }
  }

  get hasChanges(): boolean {
    return this.buildSnapshot() !== this.initialSnapshot
  }

  get availableLanguages(): LanguageOption[] {
    const used = new Set(this.translationsForm.controls.map((c) => c.get('language')?.value))
    return this.allLanguages.filter((l) => !used.has(l.value))
  }

  public getLangLabel(code: string): string {
    return this.allLanguages.find((l) => l.value === code)?.label ?? code
  }
  public getPropertyValue(object: unknown, prop: string | undefined): string {
    if (!prop) return ''
    return (object as any)?.[prop] ?? ''
  }

  public onShowAddRow(): void {
    this.showAddRow = true
    this.newLanguage = undefined
    this.newValue = ''
  }

  public onAddLanguage(): void {
    if (!this.newLanguage) return
    this.translationsForm.push(this.fb.group({ language: [this.newLanguage], value: [this.newValue] }))
    this.showAddRow = false
    this.newLanguage = undefined
    this.newValue = ''
  }

  public onCancelAdd(): void {
    this.showAddRow = false
    this.newLanguage = undefined
    this.newValue = ''
  }

  public onRemoveTranslation(index: number): void {
    this.translationsForm.removeAt(index)
  }

  public onClose(): void {
    this.workspaceI18nVisibleChange.emit(false)
  }

  public onSave(): void {
    if (!this.propertyName) return
    const translations: { [key: string]: string } = {}
    this.translationsForm.controls.forEach((ctrl) => {
      const lang: string = ctrl.get('language')?.value
      const val: string = ctrl.get('value')?.value ?? ''
      if (lang) translations[lang] = val
    })
    this.workspace.i18n = this.workspace.i18n ?? {}
    this.workspace.i18n[this.propertyName] = translations
    this.workspaceApi
      .updateWorkspace({ id: this.workspace.id!, updateWorkspaceRequest: { resource: this.workspace } })
      .subscribe({
        next: () => {
          this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.WORKSPACE.I18N.OK' })
          this.workspaceI18nVisibleChange.emit(false)
        },
        error: () => {
          this.msgService.error({ summaryKey: 'ACTIONS.EDIT.MESSAGE.WORKSPACE.I18N.NOK' })
        }
      })
  }

  private buildSnapshot(): string {
    const entries = this.translationsForm.controls
      .map((c) => ({ language: c.get('language')?.value ?? '', value: c.get('value')?.value ?? '' }))
      .sort((a, b) => a.language.localeCompare(b.language))
    return JSON.stringify(entries)
  }

  private initForm(): void {
    const existing = this.workspace.i18n?.[this.propertyName!] ?? {}
    this.translationsForm.clear()
    Object.entries(existing).forEach(([lang, val]) => {
      this.translationsForm.push(this.fb.group({ language: [lang], value: [val] }))
    })
    this.showAddRow = false
    this.newLanguage = undefined
    this.newValue = ''
    this.initialSnapshot = this.buildSnapshot()
  }
}
