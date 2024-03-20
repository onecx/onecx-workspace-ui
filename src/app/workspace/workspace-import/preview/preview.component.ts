import { Component, Input, OnInit, Output, EventEmitter, OnChanges } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { TreeNode, SelectItem } from 'primeng/api'
import { /* first,  map, */ Observable, map, of } from 'rxjs'

import {
  EximWorkspaceMenuItem,
  WorkspaceSnapshot,
  // MicrofrontendRegistrationDTO
  WorkspaceAPIService
} from 'src/app/shared/generated'
import { forceFormValidation } from 'src/app/shared/utils'

@Component({
  selector: 'app-import-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent implements OnInit, OnChanges {
  @Input() public importRequestDTO!: WorkspaceSnapshot
  @Input() public importThemeCheckbox = false
  @Input() public hasPermission = false
  @Output() public isFormValide = new EventEmitter<boolean>()

  public formGroup!: FormGroup
  public themes$: Observable<SelectItem<string>[]> = of([])
  public workspaceName = ''
  public themeName!: string
  public baseUrl = ''
  public themeProperties: any = null
  public menuItems: TreeNode[] = []
  // public portalMfes = new Array<MicrofrontendRegistrationDTO>()
  public workspaceRoles = new Array<string>()

  constructor(private workspaceService: WorkspaceAPIService) {
    this.formGroup = new FormGroup({
      workspaceName: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      themeName: new FormControl(
        null,
        !this.importThemeCheckbox ? [Validators.required, Validators.minLength(2), Validators.maxLength(50)] : []
      ),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(100)])
    })

    this.themes$ = this.workspaceService
      .getAllThemes()
      .pipe(map((val) => val.map((theme) => ({ label: theme, value: theme || '' }))))
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
        : this.formGroup.controls['themeName'].value || ''
      this.baseUrl = this.importRequestDTO.workspaces[key[0]].baseUrl || ''
      this.menuItems = this.mapToTreeNodes(this.importRequestDTO.workspaces[key[0]].menu?.menu?.menuItems)
      // check mfe existence
      // if (this.importRequestDTO.portal.microfrontendRegistrations) {
      //   this.portalMfes = Array.from(this.importRequestDTO.portal.microfrontendRegistrations)
      // }
      /*
      if (this.importRequestDTO.workspaces[key[0]].workspaceRoles) {
        this.workspaceRoles = Array.from(this.importRequestDTO.workspaces[key[0]].workspaceRoles!)
      }*/
    }
    // error handling if no theme name or no match with existing themes
    // this.themes$.pipe(first()).subscribe((themes) => {
    //   if (themes.length > 0) {
    //     const matchingTheme = themes.find((theme) => theme.value === this.themeName)
    //     if (!this.themeName || !matchingTheme) {
    //       const firstTheme = themes[0]
    //       this.themeName = firstTheme.value
    //     }
    //     this.formGroup.controls['themeName'].setValue(this.themeName)
    //     this.onModelChange()
    //   }
    // })
  }

  public ngOnChanges(): void {
    this.fillForm()
    if (this.importThemeCheckbox) {
      this.formGroup.controls['themeName'].addValidators([
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50)
      ])
    } else {
      this.formGroup.controls['themeName'].clearValidators()
    }
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
      this.formGroup.controls['themeName'].setValue(this.importRequestDTO?.workspaces[key[0]].theme)
      this.formGroup.controls['baseUrl'].setValue(this.importRequestDTO?.workspaces[key[0]].baseUrl)
    }
  }

  public onModelChange(): void {
    let key: string[] = []
    if (this.importRequestDTO.workspaces) {
      key = Object.keys(this.importRequestDTO.workspaces)
    }
    this.workspaceName = this.formGroup.controls['workspaceName'].value
    this.themeName = this.formGroup.controls['themeName'].value
    this.baseUrl = this.formGroup.controls['baseUrl'].value
    if (this.importRequestDTO.workspaces) {
      this.importRequestDTO.workspaces[key[0]].name = this.workspaceName
      this.importRequestDTO.workspaces[key[0]].theme = this.themeName
      this.importRequestDTO.workspaces[key[0]].baseUrl = this.baseUrl
    }
    this.isFormValide.emit(this.formGroup.valid)
  }

  public onThemeChange(event: any): void {
    this.themeName = event.value
    this.onModelChange()
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
