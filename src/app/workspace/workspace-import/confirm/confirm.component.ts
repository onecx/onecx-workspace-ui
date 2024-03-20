import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core'
import { WorkspaceAPIService, SearchWorkspacesResponse, WorkspaceAbstract } from 'src/app/shared/generated'

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
  @Input() public hasPermission = false
  @Input() public baseUrl?: string
  @Output() public isLoading = new EventEmitter<boolean>(true)

  private workspaces!: WorkspaceAbstract[] | undefined
  public workspaceNameExists = false
  public themes: string[] = []
  public themeNameExists = false
  public baseUrlExists = false
  public baseUrlIsMissing = false

  constructor(private readonly workspaceApi: WorkspaceAPIService) {}

  public ngOnInit(): void {
    this.baseUrlIsMissing = this.baseUrl === undefined || this.baseUrl.length === 0
    this.fetchWorkspacesAndThemes()
  }

  private fetchWorkspacesAndThemes(): void {
    this.workspaceApi.searchWorkspaces({ searchWorkspacesRequest: {} }).subscribe((value: SearchWorkspacesResponse) => {
      this.workspaces = value.stream
      this.checkWorkspaceUniqueness()
      /* if (this.themeName) {
        this.workspaceApi.getAllThemes().subscribe((themes: any) => {
          this.themes = themes
          this.checkThemeNames()
          this.isLoading.emit(false)
        })
      } else  */ this.isLoading.emit(false)
    })
  }

  public checkWorkspaceUniqueness(): void {
    this.workspaceNameExists = false
    this.baseUrlExists = false
    if (this.workspaces) {
      for (const { name, baseUrl } of this.workspaces) {
        if (this.workspaceName === name) {
          this.workspaceNameExists = true
        }
        if (!this.baseUrlIsMissing && baseUrl === this.baseUrl) {
          this.baseUrlExists = true
        }
      }
    }
  }

  public checkThemeNames(): void {
    this.themeNameExists = false
    this.themes.forEach((theme) => {
      if (theme === this.themeName) {
        this.themeNameExists = true
      }
    })
  }
}
