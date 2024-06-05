import { Component, EventEmitter, Input, OnChanges, Output, Renderer2, ViewChild } from '@angular/core'
import { Location } from '@angular/common'
import { TranslateService } from '@ngx-translate/core'
import { DefaultValueAccessor, FormControl, FormGroup, Validators } from '@angular/forms'
import { Observable, Subject, catchError, map, of, takeUntil } from 'rxjs'
import { TabView } from 'primeng/tabview'
import { SelectItem } from 'primeng/api'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { dropDownSortItemsByLabel, limitText } from 'src/app/shared/utils'
import {
  CreateMenuItem,
  MenuItem,
  WorkspaceMenuItem,
  MenuItemAPIService,
  UpdateMenuItemRequest,
  Microfrontend,
  WorkspaceProductAPIService
} from 'src/app/shared/generated'
import { ChangeMode } from '../menu.component'
import { IconService } from '../services/iconservice'

type I18N = { [key: string]: string }
type LanguageItem = SelectItem & { data: string }
export type MenuURL = Microfrontend & { mfePath?: string; product?: string }
interface AutoCompleteCompleteEvent {
  originalEvent: Event
  query: string
}
// trim the value (string!) of a form control before passes to the control
const original = DefaultValueAccessor.prototype.registerOnChange
DefaultValueAccessor.prototype.registerOnChange = function (fn) {
  return original.call(this, (value) => {
    const trimmed = value.trim()
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

  limitText = limitText
  @ViewChild('panelDetail') panelDetail: TabView | undefined
  private readonly destroy$ = new Subject()
  public formGroup: FormGroup
  public dateFormat = 'short'
  public tabIndex = 0
  public menuItem: MenuItem | undefined
  private menuItem$: Observable<MenuItem | null> = new Observable<MenuItem | null>()
  public iconItems: SelectItem[] = [{ label: '', value: null }] // default value is empty
  public scopeItems: SelectItem[]
  private posPattern = '[0-9]{1,9}'
  private panelHeight = 0
  public mfeMap: Map<string, MenuURL> = new Map()
  public mfeItems!: MenuURL[]
  public filteredMfes: MenuURL[] = []

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
    private wProductApi: WorkspaceProductAPIService,
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
      badge: new FormControl(undefined),
      scope: new FormControl(null),
      position: new FormControl(null, [
        Validators.required,
        Validators.maxLength(9),
        Validators.pattern(this.posPattern)
      ]),
      disabled: new FormControl<boolean>(false),
      external: new FormControl<boolean>(false),
      url: new FormControl(null, [Validators.maxLength(255)]),
      description: new FormControl(null, [Validators.maxLength(255)])
    })
  }

  public ngOnChanges(): void {
    this.loadMfeUrls()
    this.formGroup.reset()
    this.tabIndex = 0
    this.languagesDisplayed = []
    if (this.changeMode === 'CREATE') {
      this.formGroup.reset()
      this.menuItem = {
        parentItemId: this.menuItemId,
        position: 0,
        external: false,
        disabled: false
      } as MenuItem
      this.formGroup.patchValue(this.menuItem)
      this.prepareUrlList()
    } else if (this.menuItemId) this.getMenu() // edit
  }

  public onCloseDetailDialog(): void {
    this.dataChanged.emit(false)
  }
  public onCloseDeleteDialog(): void {
    this.dataChanged.emit(false)
  }

  private getMenu() {
    this.menuItem$ = this.menuApi.getMenuItemById({ menuItemId: this.menuItemId! }).pipe(
      catchError((err) => {
        this.msgService.error({ summaryKey: 'DIALOG.MENU.MENU_ITEM_NOT_FOUND' })
        console.error(err.error)
        return of(err)
      })
    )
    this.menuItem$.subscribe({
      next: (item) => {
        this.menuItem = item ?? undefined
        if (this.menuItem && this.displayDetailDialog) {
          this.fillForm()
          this.preparePanelHeight()
        }
      }
    })
  }
  private fillForm() {
    if (this.menuItem) {
      this.formGroup.reset()
      this.formGroup.setValue({
        parentItemId: this.menuItem.parentItemId,
        key: this.menuItem.key,
        name: this.menuItem.name,
        badge: this.menuItem.badge,
        scope: this.menuItem.scope,
        position: this.menuItem.position,
        disabled: this.menuItem.disabled,
        external: this.menuItem.external,
        url: this.prepareUrlList(this.menuItem.url),
        description: this.menuItem.description
      })
    }
  }

  /**
   * Prepare URL object to be displayed and extend the item list for specific entries:
   * 1. If URL exists then search for existing mfe with best match of base path
   *    In case the original URL was extended (with suffix) then create a new item for it
   * 2. If url is http address or unknown => add a specific item for it
   * 3. Add an empty item on top (to clean the field by selection = no url)
   */
  private prepareUrlList(url?: string): MenuURL | null {
    if (!this.mfeItems) return null
    let item: MenuURL | null = null
    let itemCreated = false
    if (url?.match(/^(http|https)/g)) {
      item = { appId: '$$$-http-address', mfePath: url, product: 'MENU_ITEM.URL.HTTP' } as MenuURL
      itemCreated = true
    } else if (url) {
      // search for mfe with best match of base path
      const match = this.searchMfeForBasePathMatch(url)
      item = match[0]
      itemCreated = match[1]
    }
    if (item && itemCreated) this.mfeItems.unshift(item) // add the new one on top
    this.mfeItems.unshift({ appId: '$$$-empty', mfePath: '', product: 'MENU_ITEM.URL.EMPTY' })
    return url ? item : this.mfeItems[0]
  }

  private searchMfeForBasePathMatch(url: string): [MenuURL, boolean] {
    let item: MenuURL | null = null
    let maxLength = 0
    let itemCreated = false
    for (const mfeItem of this.mfeItems) {
      const bp = mfeItem.mfePath!
      // perfect match
      if (url === bp) {
        item = mfeItem
        break
      }
      // if URL was extended then create such specific item with best match
      if (url?.toLowerCase().startsWith(bp.toLowerCase()) && maxLength < bp.length) {
        item = { ...mfeItem }
        item.mfePath = url
        maxLength = bp.length // remember length for finding the best match
        itemCreated = true
      }
    }
    if (!item) {
      item = { appId: '$$$-unknown-product', mfePath: url, product: 'MENU_ITEM.URL.UNKNOWN.PRODUCT' } as MenuURL
      itemCreated = true
    }
    return [item, itemCreated]
  }

  /***************************************************************************
   * SAVE => CREATE + UPDATE
   **************************************************************************/
  public onMenuSave(): void {
    if (!this.formGroup.valid) {
      console.error('invalid form', this.formGroup)
      return
    }
    if (this.menuItem) {
      if (this.formGroup.controls['url'].value instanceof Object)
        this.menuItem.url = this.formGroup.controls['url'].value.mfePath
      else this.menuItem.url = this.formGroup.controls['url'].value

      // get form values
      this.menuItem.parentItemId = this.formGroup.controls['parentItemId'].value
      this.menuItem.key = this.formGroup.controls['key'].value
      this.menuItem.name = this.formGroup.controls['name'].value
      this.menuItem.badge = this.formGroup.controls['badge'].value
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
    }
    if (this.changeMode === 'CREATE') {
      this.menuApi
        .createMenuItemForWorkspace({
          createMenuItem: { ...this.menuItem, id: undefined, workspaceId: this.workspaceId } as CreateMenuItem
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
    }
    if (this.changeMode === 'EDIT' && this.menuItemId) {
      this.menuApi
        .updateMenuItem({
          menuItemId: this.menuItemId,
          updateMenuItemRequest: this.menuItem as UpdateMenuItemRequest
        })
        .subscribe({
          next: (data) => {
            this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_OK' })
            this.dataChanged.emit(true)
          },
          error: (err: { error: any }) => {
            this.msgService.error({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_NOK' })
            console.error(err.error)
          }
        })
    }
  }

  /**
   * DELETE
   */
  public onMenuDelete(): void {
    this.displayDeleteDialog = false
    this.menuApi.deleteMenuItemById({ menuItemId: this.menuItem?.id! }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MENU_OK' })
        this.dataChanged.emit(true)
      },
      error: (err: { error: any }) => {
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MENU_NOK' })
        console.error(err.error)
      }
    })
  }

  public onTabPanelChange(e: any): void {
    this.tabIndex = e.index
    this.prepareLanguagePanel()
    this.preparePanelHeight()
  }
  // use the same height on all TABs
  private preparePanelHeight(): void {
    if (!this.panelDetail) return
    this.renderer.setStyle(this.panelDetail?.el.nativeElement, 'display', 'block')
    if (this.panelHeight === 0) this.panelHeight = this.panelDetail?.el.nativeElement.offsetHeight
    this.renderer.setStyle(this.panelDetail?.el.nativeElement, 'height', this.panelHeight - 50 + 'px')
  }

  /**
   * LANGUAGE
   */
  public prepareLanguagePanel(): void {
    if (this.languagesDisplayed.length > 0) return
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
        if (this.menuItem?.i18n[l.value]) l.data = this.menuItem?.i18n[l.value]
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

  /**
   * LOAD Microfrontends from registered products
   **/
  private loadMfeUrls(): void {
    this.mfeItems = []
    this.wProductApi
      .getProductsByWorkspaceId({ id: this.workspaceId! })
      .pipe(
        map((products) => {
          for (let p of products) {
            if (p.microfrontends) {
              for (let mfe of p.microfrontends) {
                this.mfeItems.push({
                  ...mfe,
                  mfePath: Location.joinWithSlash(mfe.basePath!, p.baseUrl!),
                  product: p.displayName!
                })
              }
            }
          }
          this.mfeItems.sort(this.sortMfesByPath)
        }),
        catchError((err) => {
          console.error('getProductsByWorkspaceId():', err)
          return of([] as SelectItem[])
        })
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }
  public sortMfesByPath(a: MenuURL, b: MenuURL): number {
    return (a.mfePath ? a.mfePath : '').localeCompare(b.mfePath ? b.mfePath : '')
  }

  /**
   * EVENTS on URL field
   **/
  public onFocusUrl(field: any): void {
    field.overlayVisible = true
  }
  // ignore url value and show all paths
  public onDropdownClick(field: any): void {
    field.overlayVisible = true
    this.filteredMfes = this.mfeItems
    console.log('this.mfeItems', this.mfeItems)
  }
  // inkremental filtering: search path with current value after key up
  public onKeyUpUrl(ev: Event): void {
    if (ev.target) {
      const elem = ev.target as HTMLInputElement
      this.onFilterPaths({ query: elem.value } as AutoCompleteCompleteEvent)
    }
  }
  public onClearUrl(): void {
    this.formGroup.controls['url'].setValue(this.mfeItems[0])
  }

  /**
   * FILTER URL (query = field value)
   *   try to filter with best match with this exception:
   *     a) empty query => list all
   */
  public onFilterPaths(ev: AutoCompleteCompleteEvent): void {
    let query = ev?.query ?? undefined
    if (!query) {
      if (this.formGroup.controls['url'].value instanceof Object) query = this.formGroup.controls['url'].value.mfePath
      else query = this.formGroup.controls['url'].value
    }
    this.filteredMfes = this.filterUrl(query) // this split fixed a sonar complexity issue
  }

  private filterUrl(query: string): MenuURL[] {
    let filtered: MenuURL[] = []
    if (!query || query === '') {
      filtered = this.mfeItems // exception a)
    } else {
      for (const mfeItem of this.mfeItems) {
        if (
          query.toLowerCase().startsWith(mfeItem.mfePath!.toLowerCase()) ||
          mfeItem.mfePath?.toLowerCase().startsWith(query.toLowerCase())
        ) {
          filtered.push(mfeItem)
        }
      }
    }
    return filtered
  }
}
