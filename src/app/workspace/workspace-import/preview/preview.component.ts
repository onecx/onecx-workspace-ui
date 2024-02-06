import { Component, Input, OnInit, Output, EventEmitter, OnChanges } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { TreeNode, SelectItem } from 'primeng/api'
import { /* first,  map, */ Observable, of } from 'rxjs'

import {
  ImportWorkspacesRequestParams,
  EximWorkspaceMenuItem
  // MicrofrontendRegistrationDTO
  // ThemesAPIService
} from '../../../shared/generated'
import { forceFormValidation /* , sortThemeByName */ } from '../../../shared/utils'

@Component({
  selector: 'app-import-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent implements OnInit, OnChanges {
  @Input() public importRequestDTO!: ImportWorkspacesRequestParams
  @Input() public importThemeCheckbox = false
  @Input() public hasPermission = false
  @Output() public isFormValide = new EventEmitter<boolean>()

  public formGroup!: FormGroup
  public themes$: Observable<SelectItem<string>[]> = of([])
  public portalName = ''
  public themeName!: string
  public baseUrl = ''
  public tenantId: string | undefined = undefined
  public themeProperties: any = null
  public menuItems: TreeNode[] = []
  // public portalMfes = new Array<MicrofrontendRegistrationDTO>()
  public portalRoles = new Array<string>()

  constructor(/* private themeApi: ThemesAPIService */) {
    this.formGroup = new FormGroup({
      portalName: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      // themeName: new FormControl(
      //   null,
      //   !this.importThemeCheckbox ? [Validators.required, Validators.minLength(2), Validators.maxLength(50)] : []
      // ),
      baseUrl: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(100)])
      // tenantId: new FormControl(undefined)
    })

    /* this.themes$ = this.themeApi
      .getThemes()
      .pipe(map((val) => val.sort(sortThemeByName).map((theme) => ({ label: theme.name, value: theme.name || '' })))) */
  }

  public ngOnInit(): void {
    if (this.importRequestDTO.workspaceSnapshot.workspaces) {
      this.portalName = this.importRequestDTO?.workspaceSnapshot.workspaces[0].name || ''
      // this.themeName = this.importRequestDTO?.themeImportData?.name
      // ? this.importRequestDTO?.themeImportData?.name
      // : this.formGroup.controls['themeName'].value || ''
      this.baseUrl = this.importRequestDTO?.workspaceSnapshot.workspaces[0].baseUrl || ''
      // this.tenantId = this.importRequestDTO?.workspaceSnapshot.workspaces[0].tenantId || undefined
      this.menuItems = this.mapToTreeNodes(this.importRequestDTO?.workspaceSnapshot.workspaces[0].menu?.menu?.menuItems)
      // this.themeProperties = this.importRequestDTO?.themeImportData?.properties
      // check mfe existence
      // if (this.importRequestDTO.portal.microfrontendRegistrations) {
      //   this.portalMfes = Array.from(this.importRequestDTO.portal.microfrontendRegistrations)
      // }
      if (this.importRequestDTO?.workspaceSnapshot.workspaces[0].workspaceRoles) {
        this.portalRoles = Array.from(this.importRequestDTO?.workspaceSnapshot.workspaces[0].workspaceRoles)
      }
    }
    // error handling if no theme name or no match with existing themes
    /* this.themes$.pipe(first()).subscribe((themes) => {
      if (themes.length > 0) {
        const matchingTheme = themes.find((theme) => theme.value === this.themeName)
        if (!this.themeName || !matchingTheme) {
          const firstTheme = themes[0]
          this.themeName = firstTheme.value
        }
        this.formGroup.controls['themeName'].setValue(this.themeName)
        this.onModelChange()
      }
    }) */
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
    if (this.importRequestDTO.workspaceSnapshot.workspaces) {
      this.formGroup.controls['portalName'].setValue(this.importRequestDTO?.workspaceSnapshot.workspaces[0].name)
      // this.formGroup.controls['themeName'].setValue(this.importRequestDTO?.workspaceSnapshot.workspaces[0].themeName)
      this.formGroup.controls['baseUrl'].setValue(this.importRequestDTO?.workspaceSnapshot.workspaces[0].baseUrl)
      // if (this.hasPermission && this.importRequestDTO?.portal?.tenantId != undefined)
      //   this.formGroup.controls['tenantId'].setValue(this.importRequestDTO?.portal?.tenantId)
    }
  }

  public onModelChange(): void {
    this.portalName = this.formGroup.controls['portalName'].value
    // this.themeName = this.formGroup.controls['themeName'].value
    this.baseUrl = this.formGroup.controls['baseUrl'].value
    // if (this.hasPermission && this.formGroup.controls['tenantId'].value !== undefined)
    //   this.tenantId = this.formGroup.controls['tenantId'].value
    if (this.importRequestDTO.workspaceSnapshot.workspaces) {
      this.importRequestDTO.workspaceSnapshot.workspaces[0].name = this.portalName
      // this.importRequestDTO.portal.themeName = this.themeName
      this.importRequestDTO.workspaceSnapshot.workspaces[0].baseUrl = this.baseUrl
      // if (this.hasPermission) this.importRequestDTO.portal.tenantId = this.tenantId
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
