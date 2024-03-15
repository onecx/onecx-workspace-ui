import { Component, EventEmitter, Input, OnChanges, Output, Renderer2, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { DefaultValueAccessor, FormControl, FormGroup, Validators } from '@angular/forms'
import { Observable, Subject, catchError, of } from 'rxjs'
import { TabView } from 'primeng/tabview'
import { SelectItem } from 'primeng/api'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import { dropDownSortItemsByLabel } from 'src/app/shared/utils'
import {
  CreateMenuItem,
  MenuItem,
  WorkspaceMenuItem,
  MenuItemAPIService,
  UpdateMenuItemRequest
} from 'src/app/shared/generated'
import { ChangeMode, I18N } from '../menu.component'
import { IconService } from '../iconservice'

type LanguageItem = SelectItem & { data: string }

// trim the value (string!) of a form control before passes to the control
const original = DefaultValueAccessor.prototype.registerOnChange
DefaultValueAccessor.prototype.registerOnChange = function (fn) {
  return original.call(this, (value) => {
    const trimmed = typeof value === 'string' || value instanceof String ? value.trim() : value
    return fn(trimmed)
  })
}

@Component({
  selector: 'app-menu-detail',
  templateUrl: './menu-detail.component.html',
  styleUrls: ['./menu-detail.component.scss']
})
export class MenuDetailComponent implements OnChanges {
  @Input() public workspaceId!: string | undefined
  @Input() public menuItems: WorkspaceMenuItem[] | undefined
  @Input() public menuItemId: string | undefined
  @Input() public parentItems!: SelectItem[]
  @Input() changeMode: ChangeMode = 'VIEW'
  @Input() displayDetailDialog = false
  @Input() displayDeleteDialog = false
  @Output() dataChanged: EventEmitter<boolean> = new EventEmitter()

  @ViewChild('panelDetail') panelDetail: TabView | undefined
  private readonly destroy$ = new Subject()
  public formGroup: FormGroup
  public dateFormat = 'short'
  public tabIndex = 0
  public menuItem: MenuItem | undefined
  private menuItem$: Observable<MenuItem | null> = new Observable<MenuItem | null>()
  public iconItems: SelectItem[] = [{ label: '', value: null }] // default value is empty
  public scopeItems: SelectItem[]
  // public booleanItems: SelectItem[]
  private urlPattern =
    '(https://www.|http://www.|https://|http://)?[a-zA-Z]{2,}(.[a-zA-Z]{2,})(.[a-zA-Z]{2,})?/[a-zA-Z0-9]{2,}|((https://www.|http://www.|https://|http://)?[a-zA-Z]{2,}(.[a-zA-Z]{2,})(.[a-zA-Z]{2,})?)|(https://www.|http://www.|https://|http://)?[a-zA-Z0-9]{2,}.[a-zA-Z0-9]{2,}.[a-zA-Z0-9]{2,}(.[a-zA-Z0-9]{2,})?'
  private posPattern = '[0-9]{1,9}'
  private panelHeight = 0
  public mfeRUrlOptions: SelectItem[] = []

  // language settings and preview
  public languagesAvailable: LanguageItem[] = []
  public languagesDisplayed: LanguageItem[] = []
  public languagesUsed = new Array<string>()
  public languageNames: I18N = {
    de: 'Deutsch',
    en: 'English',
    es: 'Español',
    fr: 'Français',
    it: 'Italiano',
    pl: 'Polski',
    sk: 'Slovak'
  }

  constructor(
    private user: UserService,
    private icon: IconService,
    private menuApi: MenuItemAPIService,
    private renderer: Renderer2,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm' : 'short'
    this.iconItems.push(...this.icon.icons.map((i) => ({ label: i, value: i })))
    this.iconItems.sort(dropDownSortItemsByLabel)
    this.scopeItems = [
      { label: '', value: null },
      { label: 'APP', value: 'APP' },
      { label: 'PAGE', value: 'PAGE' },
      { label: 'WORKSPACE', value: 'WORKSPACE' }
    ]
    this.formGroup = new FormGroup({
      parentItemId: new FormControl(null),
      key: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
      name: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
      position: new FormControl(null, [
        Validators.required,
        Validators.maxLength(9),
        Validators.pattern(this.posPattern)
      ]),
      disabled: new FormControl<boolean>(false),
      external: new FormControl<boolean>(false),
      url: new FormControl(null, [
        Validators.minLength(2),
        Validators.maxLength(255)
        /*, Validators.pattern(this.urlPattern)*/ // Trian wish to deactivate this
      ]),
      badge: new FormControl(undefined),
      scope: new FormControl(null),
      description: new FormControl(null, [Validators.maxLength(255)])
    })
  }

  public ngOnChanges(): void {
    this.formGroup.reset()
    if (this.menuItemId) {
      if (this.changeMode === 'CREATE') {
        this.formGroup.reset()
        this.formGroup.patchValue({
          parentItemId: this.menuItemId,
          position: 0,
          external: false,
          disabled: false
        })
        // this.menuItem = {} as unknown as MenuItem
      } else if (this.changeMode !== 'DELETE') this.getMenu()
    }
  }

  public onCloseDetailDialog(): void {
    console.log('onCloseDetailDialog')
    this.dataChanged.emit(false)
  }
  public onCloseDeleteDialog(): void {
    this.dataChanged.emit(false)
  }

  private getMenu() {
    this.menuItem$ = this.menuApi
      .getMenuItemById({ menuItemId: this.menuItemId! })
      .pipe(catchError((error) => of(error)))
    this.menuItem$.subscribe({
      next: (m) => {
        this.menuItem = m ?? undefined
        if (this.menuItem) this.fillForm(this.menuItem)
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'DETAIL.ERROR_FIND_MENU' })
        console.error(err.error)
      }
    })
  }
  private fillForm(m: MenuItem) {
    console.log('fillForm', m)
    this.formGroup.reset()
    this.formGroup.setValue({
      parentItemId: m.parentItemId,
      url: m.url,
      key: m.key,
      name: m.name,
      position: m.position,
      description: m.description,
      scope: m.scope,
      badge: m.badge,
      disabled: m.disabled,
      external: m.external
    })
  }

  /**
   * SAVE
   */
  public onMenuSave(): void {
    if (this.formGroup.valid) {
      if (this.menuItem) {
        this.menuItem.parentItemId = this.formGroup.controls['parentItemId'].value
        this.menuItem.key = this.formGroup.controls['key'].value
        this.menuItem.url = this.formGroup.controls['url'].value
        this.menuItem.name = this.formGroup.controls['name'].value
        this.menuItem.badge =
          this.formGroup.controls['badge'].value === null ? '' : this.formGroup.controls['badge'].value
        this.menuItem.scope = this.formGroup.controls['scope'].value
        this.menuItem.position = this.formGroup.controls['position'].value
        this.menuItem.disabled = this.formGroup.controls['disabled'].value
        this.menuItem.external = this.formGroup.controls['external'].value
        this.menuItem.description = this.formGroup.controls['description'].value
        const i18n: I18N = {}
        for (const l of this.languagesDisplayed) {
          if (l.data !== '') i18n[l.value] = l.data
        }
        this.menuItem.i18n = i18n
        if (this.changeMode === 'CREATE') {
          this.menuItem.id = ''
        }
        console.log('onMenuSave', this.menuItem)
      }
      if (this.changeMode === 'CREATE') {
        this.menuApi
          .createMenuItemForWorkspace({
            createMenuItem: { ...this.menuItem, workspaceId: this.workspaceId } as CreateMenuItem
          })
          .subscribe({
            next: () => {
              this.msgService.success({ summaryKey: 'ACTIONS.CREATE.MESSAGE.MENU_CREATE_OK' })
              this.dataChanged.emit(true)
            },
            error: (err: { error: any }) => {
              this.msgService.error({ summaryKey: 'ACTIONS.CREATE.MESSAGE.MENU_CREATE_NOK' })
              console.error(err.error)
            }
          })
      } else if (this.changeMode === 'EDIT' && this.menuItem && this.menuItem.id) {
        this.menuApi
          .updateMenuItem({
            menuItemId: this.menuItem.id,
            updateMenuItemRequest: this.menuItem as UpdateMenuItemRequest
          })
          .subscribe({
            next: (data) => {
              this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_OK' })
              // update tree node with received data without reload all
              this.dataChanged.emit(true)
              /*
              if (this.displayMenuDetail) {
                this.onCloseDetailDialog()

                if (data && data[0].key) {
                  const node = this.getNodeByKey(data[0].key, this.menuNodes)
                  if (node) {
                    node.data = data
                    node.label = data[0].name
                  }
                  if (this.menuItems) {
                    const item = this.getItemByKey(data[0].key, this.menuItems)
                    if (item) {
                      item.i18n = data[0].i18n
                      item.name = data[0].name
                    }
                  }
                }
              }*/
            },
            error: (err: { error: any }) => {
              this.msgService.error({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_NOK' })
              console.error(err.error)
            }
          })
      }
    } else console.error('non valid form', this.formGroup)
  }

  public onTabPanelChange(e: any): void {
    this.tabIndex = e.index
  }
  public onFocusFieldUrl(field: any): void {
    field.overlayVisible = true
  }

  public onShowDetailDialog(): void {
    this.tabIndex = 0
    this.languagesDisplayed = []
    // same height on all TABs
    if (this.panelHeight === 0) this.panelHeight = this.panelDetail?.el.nativeElement.offsetHeight
    this.renderer.setStyle(this.panelDetail?.el.nativeElement, 'display', 'block')
    this.renderer.setStyle(this.panelDetail?.el.nativeElement, 'height', this.panelHeight + 'px')
    //
    // prepare i18n panel: load defaults
    this.languagesDisplayed = [
      { label: this.languageNames['de'], value: 'de', data: '' },
      { label: this.languageNames['en'], value: 'en', data: '' }
    ]
    this.languagesAvailable = [
      { label: this.languageNames['es'], value: 'es', data: '' },
      { label: this.languageNames['fr'], value: 'fr', data: '' },
      { label: this.languageNames['it'], value: 'it', data: '' },
      { label: this.languageNames['pl'], value: 'pl', data: '' },
      { label: this.languageNames['sk'], value: 'sk', data: '' }
    ]
    if (this.menuItem?.i18n) {
      for (const k in this.menuItem?.i18n) {
        if (this.languagesDisplayed.filter((l) => l.value === k).length === 0) this.onAddLanguage(k)
      }
      for (const l of this.languagesDisplayed) {
        if (this.menuItem?.i18n && this.menuItem?.i18n[l.value]) l.data = this.menuItem?.i18n[l.value]
      }
      this.languagesDisplayed.sort(dropDownSortItemsByLabel)
    }
  }
  public onRemoveLanguage(val: string) {
    this.languagesAvailable.push(this.languagesDisplayed.filter((l) => l.value === val)[0])
    this.languagesAvailable.filter((l) => l.value === val)[0].data = ''
    this.languagesAvailable = this.languagesAvailable.filter((l) => l).sort(dropDownSortItemsByLabel)
    this.languagesDisplayed = this.languagesDisplayed.filter((l) => l.value !== val)
  }
  public onAddLanguage2(ev: any): void {
    this.languagesDisplayed.push(this.languagesAvailable.filter((l) => l.value === ev.option.value)[0])
    this.languagesAvailable = this.languagesAvailable.filter((l) => l.value !== ev.option.value)
  }
  public onAddLanguage(val: string): void {
    this.languagesDisplayed.push(this.languagesAvailable.filter((l) => l.value === val)[0])
    this.languagesAvailable = this.languagesAvailable.filter((l) => l.value !== val)
  }
  public getLanguageLabel(val: any): string | undefined {
    if (this.languagesDisplayed.length > 0) {
      const l = this.languagesDisplayed.filter((l) => l.value === val)
      return l.length === 1 ? l[0].label : undefined
    }
    return undefined
  }
  public displayLanguageField(lang: string) {
    return !this.languagesDisplayed.some((l) => l.value === lang)
  }

  public onMenuDelete(): void {
    this.displayDeleteDialog = false
    this.menuApi.deleteMenuItemById({ menuItemId: this.menuItem?.id! }).subscribe({
      next: () => {
        this.dataChanged.emit(true)
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MENU_DELETE_OK' })
      },
      error: (err: { error: any }) => {
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MENU_DELETE_NOK' })
        console.error(err.error)
      }
    })
  }
  /*
  private getNodeByKey(key: string, nodes: TreeNode[]): TreeNode | undefined {
    for (const node of nodes) {
      if (node.key === key) {
        return node
      }
      if (node.children) {
        const match = this.getNodeByKey(key, node.children)
        if (match) {
          return match
        }
      }
    }
    return undefined
  }
  private getItemByKey(key: string, items: MenuItem[]): MenuItem | undefined {
    for (const item of items) {
      if (item.key === key) {
        return item
      }
      if (item.children) {
        const match = this.getItemByKey(key, item.children)
        if (match) {
          return match
        }
      }
    }
    return undefined
  }
  */
}
