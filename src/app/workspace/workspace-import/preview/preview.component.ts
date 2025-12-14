import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { TreeNode } from 'primeng/api'
import { BehaviorSubject, Observable } from 'rxjs'

import { SlotService } from '@onecx/angular-remote-components'

import { EximWorkspaceMenuItem, Product } from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'
import { Theme, ImportWorkspace } from '../workspace-import.component'

@Component({
  selector: 'app-import-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent implements OnInit {
  @Input() public importWorkspace: ImportWorkspace | undefined
  @Input() public hasPermission = false
  @Output() public isFormValide = new EventEmitter<boolean>()

  public formGroup: FormGroup
  public importWorkspaceName!: string
  public importTheme!: Theme
  public themeProperties: any = null
  public menuItems!: TreeNode[]
  public workspaceRoles: string[] = []
  public workspaceProducts!: string[]
  public sortByLocale = Utils.sortByLocale
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
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
      mandatory: new FormControl(null)
    })
    this.isThemeComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.slotName)
    this.themesEmitter.subscribe(this.themes$)
  }

  public ngOnInit(): void {
    if (this.importWorkspace) {
      // extras
      this.importTheme = this.importWorkspace.themeObject ?? {}
      this.menuItems = this.mapToTreeNodes(this.importWorkspace.menuItems)
      this.workspaceRoles = this.extractRoleNames(this.importWorkspace.roles)
      this.workspaceProducts = this.extractProductNames(this.importWorkspace.products)
      //
      this.fillForm(this.importWorkspace)
      this.onModelChange()
    }
  }

  public fillForm(ws: any): void {
    if (ws) {
      this.formGroup.controls['name'].setValue(ws.name)
      this.formGroup.controls['displayName'].setValue(ws.displayName)
      this.formGroup.controls['theme'].setValue(ws.theme)
      this.formGroup.controls['baseUrl'].setValue(ws.baseUrl)
      this.formGroup.controls['mandatory'].setValue(ws.mandatory)
      // trigger validation to be up-to-date
      Utils.forceFormValidation(this.formGroup)
    }
  }

  // fired on each keyup/paste event => update workspace
  public onModelChange(): void {
    if (this.importWorkspace) {
      this.importWorkspace.displayName = this.formGroup.controls['displayName'].value
      this.importWorkspace.name = this.formGroup.controls['name'].value
      this.importWorkspace.theme = this.formGroup.controls['theme'].value
      this.importWorkspace.baseUrl = this.formGroup.controls['baseUrl'].value
      this.importWorkspace.mandatory = this.formGroup.controls['mandatory'].value
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
    if (themes && this.importTheme)
      if (!themes.some((t) => t.name === this.importTheme?.name)) themes.push(this.importTheme)
    return themes
  }
}
