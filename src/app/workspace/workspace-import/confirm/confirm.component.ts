import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core'
import {
  /* ThemeDTO, ThemesAPIService, */ WorkspaceAPIService,
  SearchWorkspacesResponse,
  WorkspaceAbstract
} from '../../../shared/generated'

@Component({
  selector: 'app-import-confirm',
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.scss']
})
export class ConfirmComponent implements OnInit {
  @Input() public workspaceName?: string
  @Input() public themeName?: string
  @Input() public themeProperties?: any
  @Input() public importThemeCheckbox = false
  @Input() public tenantId?: string | undefined
  @Input() public hasPermission = false
  @Input() public baseUrl?: string
  @Output() public isLoading = new EventEmitter<boolean>(true)

  private workspaces!: WorkspaceAbstract[] | undefined
  // private themes!: ThemeDTO[]
  public workspaceNameExists = false
  public themeNameExists = false
  public baseUrlExists = false
  public baseUrlIsMissing = false
  public workspaceTenantExists = false

  constructor(private readonly workspaceApi: WorkspaceAPIService /* , private readonly themeAPI: ThemesAPIService */) {}

  public ngOnInit(): void {
    this.baseUrlIsMissing = this.baseUrl === undefined || this.baseUrl.length === 0
    this.fetchWorkspacesAndThemes()
  }

  private fetchWorkspacesAndThemes(): void {
    this.workspaceApi.searchWorkspaces({ searchWorkspacesRequest: {} }).subscribe((value: SearchWorkspacesResponse) => {
      this.workspaces = value.stream
      this.checkWorkspaceUniqueness()
      if (this.themeName) {
        /* this.themeAPI.getThemes().subscribe((themes: any) => {
          this.themes = themes
          this.checkThemeNames()
          this.isLoading.emit(false)
        }) */
      } else this.isLoading.emit(false)
    })
  }

  public checkWorkspaceUniqueness(): void {
    this.workspaceNameExists = false
    this.baseUrlExists = false
    if (this.workspaces) {
      for (const { name, /* tenantId, */ baseUrl } of this.workspaces) {
        if (this.hasPermission) {
          /* if ((tenantId ?? undefined) === this.tenantId && name === this.workspaceName) {
            this.workspaceTenantExists = true
          } */
        } else if (this.workspaceName === name) {
          this.workspaceNameExists = true
        }
        if (!this.baseUrlIsMissing && baseUrl === this.baseUrl) {
          this.baseUrlExists = true
        }
      }
    }
  }

  public checkThemeNames(): void {
    /* this.themeNameExists = false
    for (const { name } of this.themes) {
      if (name === this.themeName) {
        this.themeNameExists = true
        break
      }
    } */
  }
}
