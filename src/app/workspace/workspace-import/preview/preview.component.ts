import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { TreeNode } from 'primeng/api'
import { BehaviorSubject, Observable } from 'rxjs'

import { SlotService } from '@onecx/angular-remote-components'

import { EximWorkspaceMenuItem, Product } from 'src/app/shared/generated'
import { forceFormValidation, sortByLocale } from 'src/app/shared/utils'

// All properties could be empty in case the import file does not contain a theme
export type Theme = {
  name?: string
  displayName?: string
  logoUrl?: string
  faviconUrl?: string
}

@Component({
  selector: 'app-import-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent implements OnInit {
  @Input() public importRequestDTO: any
  @Input() public hasPermission = false
  @Output() public isFormValide = new EventEmitter<boolean>()

  public formGroup!: FormGroup
  public workspaceName = ''
  public displayName = ''
  public theme!: Theme
  public baseUrl = ''
  public themeProperties: any = null
  public menuItems!: TreeNode[]
  public workspaceRoles: string[] = []
  public workspaceProducts!: string[]
  public sortByLocale = sortByLocale
  // slot configuration: get theme data
  public slotName = 'onecx-theme-data'
  public isThemeComponentDefined$: Observable<boolean> // check if a component was assigned
  public themes$ = new BehaviorSubject<Theme[] | undefined>(undefined) // theme infos
  public themesEmitter = new EventEmitter<Theme[]>()

  constructor(private readonly slotService: SlotService) {
    this.formGroup = new FormGroup({
      name: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      displayName: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      theme: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(100)])
    })
    this.isThemeComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.slotName)
    this.themesEmitter.subscribe(this.themes$)
  }

  public ngOnInit(): void {
    if (this.importRequestDTO?.workspaces) {
      let keys: string[] = []
      keys = Object.keys(this.importRequestDTO.workspaces)
      if (keys.length > 0) {
        const ws = this.importRequestDTO.workspaces[keys[0]]
        this.workspaceName = ws.name
        this.displayName = ws.displayName
        this.theme = { name: ws.theme, displayName: ws.theme } as Theme
        this.baseUrl = ws.baseUrl
        this.menuItems = this.mapToTreeNodes(ws.menuItems)
        this.workspaceRoles = this.extractRoleNames(ws.roles)
        this.workspaceProducts = this.extractProductNames(ws.products)
        this.fillForm(ws)
        this.onModelChange()
      }
    }
  }

  public fillForm(ws: any): void {
    if (ws) {
      this.formGroup.controls['name'].setValue(ws.name)
      this.formGroup.controls['displayName'].setValue(ws.displayName)
      this.formGroup.controls['theme'].setValue(ws.theme)
      this.formGroup.controls['baseUrl'].setValue(ws.baseUrl)
      // trigger validation to be up-to-date
      forceFormValidation(this.formGroup)
    }
  }

  // fired on each keyup/paste event
  public onModelChange(): void {
    if (this.importRequestDTO.workspaces) {
      const key: string[] = Object.keys(this.importRequestDTO.workspaces)
      // if workspace name was changed then change the also the key:
      if (key[0] !== this.formGroup.controls['name'].value) {
        // save the workspace properties to be reassigned on new key
        const workspace = Object.getOwnPropertyDescriptor(this.importRequestDTO.workspaces, key[0])
        if (workspace)
          Object.defineProperty(this.importRequestDTO.workspaces, this.formGroup.controls['name'].value, workspace)
        delete this.importRequestDTO.workspaces[key[0]]
        this.workspaceName = this.formGroup.controls['name'].value
      } else {
        this.workspaceName = key[0]
      }
      this.displayName = this.formGroup.controls['displayName'].value
      if (this.formGroup.controls['theme'].value) this.theme.name = this.formGroup.controls['theme'].value
      this.baseUrl = this.formGroup.controls['baseUrl'].value

      this.importRequestDTO.workspaces[this.workspaceName].name = this.workspaceName
      this.importRequestDTO.workspaces[this.workspaceName].displayName = this.displayName
      this.importRequestDTO.workspaces[this.workspaceName].theme = this.theme.name
      this.importRequestDTO.workspaces[this.workspaceName].baseUrl = this.baseUrl
    }
    this.isFormValide.emit(this.formGroup.valid)
  }

  private mapToTreeNodes(items?: EximWorkspaceMenuItem[]): TreeNode[] {
    if (!items || items.length === 0) {
      return []
    }
    const results: TreeNode[] = []
    items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    for (const item of items) {
      const newNode: TreeNode = this.createTreeNode(item)
      if (item.children && item.children.length > 0) {
        newNode.leaf = false
        newNode.children = this.mapToTreeNodes(item.children)
      }
      results.push(newNode)
    }
    return results
  }

  private createTreeNode(item: EximWorkspaceMenuItem): TreeNode {
    return {
      label: item.name,
      expanded: false,
      key: item.key,
      leaf: true,
      children: []
    }
  }

  private extractProductNames(products?: Product[]): string[] {
    const arr: string[] = []
    if (products) for (const p of products) if (p.productName) arr.push(p.productName)
    return arr
  }
  private extractRoleNames(roles?: any[]): string[] {
    const arr: string[] = []
    if (roles) for (const r of roles) arr.push(r.name)
    return arr
  }

  // sometimes the imported theme is unknown, then add to the list
  public checkAndExtendThemes(themes: Theme[]): Theme[] {
    // if not included (why ever) then add the used value to make it visible
    if (!themes.find((t) => t.name === this.theme.name)) {
      themes.push({ name: this.theme.name, displayName: this.theme.name } as Theme)
    }
    return themes
  }
}
