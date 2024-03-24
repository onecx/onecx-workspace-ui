import { Component, Input, OnInit, Output, EventEmitter, OnChanges } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { TreeNode, SelectItem } from 'primeng/api'
import { Observable, map } from 'rxjs'

import { EximWorkspaceMenuItem, WorkspaceSnapshot, WorkspaceAPIService } from 'src/app/shared/generated'
import { forceFormValidation, sortByLocale } from 'src/app/shared/utils'

@Component({
  selector: 'app-import-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent implements OnInit, OnChanges {
  @Input() public importRequestDTO!: WorkspaceSnapshot
  @Input() public hasPermission = false
  @Output() public isFormValide = new EventEmitter<boolean>()

  public formGroup!: FormGroup
  public themes$: Observable<SelectItem<string>[]>
  public workspaceName = ''
  public themeName!: string
  public baseUrl = ''
  public themeProperties: any = null
  public menuItems: TreeNode[] = []
  public workspaceRoles: string[] = []
  public workspaceProducts: string[] = []
  public sortByLocale = sortByLocale

  constructor(private workspaceApi: WorkspaceAPIService) {
    this.formGroup = new FormGroup({
      workspaceName: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      theme: new FormControl(null),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(100)])
    })
    this.themes$ = this.workspaceApi.getAllThemes().pipe(map((val: any[]) => val.sort(sortByLocale)))
  }

  public ngOnInit(): void {
    let key: string[] = []
    if (this.importRequestDTO.workspaces) {
      key = Object.keys(this.importRequestDTO.workspaces)
    }
    if (this.importRequestDTO.workspaces) {
      this.workspaceName = this.importRequestDTO.workspaces[key[0]].name || ''
      this.themeName = this.importRequestDTO?.workspaces[key[0]].theme
        ? this.importRequestDTO?.workspaces[key[0]].theme
        : this.formGroup.controls['theme'].value || ''
      this.baseUrl = this.importRequestDTO.workspaces[key[0]].baseUrl || ''
      this.menuItems = this.mapToTreeNodes(this.importRequestDTO.workspaces[key[0]].menu?.menu?.menuItems)
    }
  }

  public ngOnChanges(): void {
    this.fillForm()
    // trigger validation to be up-to-date
    forceFormValidation(this.formGroup)
    this.onModelChange()
  }

  public fillForm(): void {
    let key: string[] = []
    if (this.importRequestDTO.workspaces) {
      key = Object.keys(this.importRequestDTO.workspaces)
    }
    if (this.importRequestDTO.workspaces) {
      this.formGroup.controls['workspaceName'].setValue(this.importRequestDTO?.workspaces[key[0]].name)
      this.formGroup.controls['theme'].setValue(this.importRequestDTO?.workspaces[key[0]].theme)
      this.formGroup.controls['baseUrl'].setValue(this.importRequestDTO?.workspaces[key[0]].baseUrl)
    }
  }

  public onModelChange(): void {
    let key: string[] = []
    if (this.importRequestDTO.workspaces) {
      key = Object.keys(this.importRequestDTO.workspaces)
    }
    this.workspaceName = this.formGroup.controls['workspaceName'].value
    this.themeName = this.formGroup.controls['theme'].value
    this.baseUrl = this.formGroup.controls['baseUrl'].value
    // update origin => used in the import-detail component
    if (this.importRequestDTO.workspaces) {
      this.importRequestDTO.workspaces[key[0]].name = this.workspaceName
      this.importRequestDTO.workspaces[key[0]].theme = this.themeName
      this.importRequestDTO.workspaces[key[0]].baseUrl = this.baseUrl
    }
    this.isFormValide.emit(this.formGroup.valid)
  }

  private mapToTreeNodes(items?: EximWorkspaceMenuItem[]): TreeNode[] {
    if (!items || items.length === 0) {
      return []
    }
    const results: TreeNode[] = []
    items.sort((a, b) => (a.position || 0) - (b.position || 0))
    for (const item of items) {
      const newNode: TreeNode = this.createTreeNode(item)
      if (item.children && item.children.length > 0 && item.children != null && item.children.toLocaleString() != '') {
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
}
