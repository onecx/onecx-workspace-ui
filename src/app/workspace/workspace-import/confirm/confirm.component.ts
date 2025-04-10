import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core'
import { WorkspaceAPIService, SearchWorkspacesResponse, WorkspaceAbstract } from 'src/app/shared/generated'

@Component({
  selector: 'app-import-confirm',
  templateUrl: './confirm.component.html'
})
export class ConfirmComponent implements OnInit {
  @Input() public workspaceName?: string
  @Input() public displayName?: string
  @Input() public themeName?: string
  @Input() public hasPermission = false
  @Input() public baseUrl?: string
  // eslint-disable-next-line @typescript-eslint/ban-types
  @Input() public importResponse: {} | undefined
  @Output() public isLoading = new EventEmitter<boolean>(true)
  @Output() public isFormValide = new EventEmitter<boolean>()

  private workspaces!: WorkspaceAbstract[] | undefined
  public workspaceNameExists = false
  public baseUrlExists = false
  public baseUrlIsMissing = false

  constructor(private readonly workspaceApi: WorkspaceAPIService) {}

  public ngOnInit(): void {
    this.baseUrlIsMissing = this.baseUrl === undefined || this.baseUrl.length === 0
    this.fetchWorkspace()
  }

  private fetchWorkspace(): void {
    this.workspaceApi.searchWorkspaces({ searchWorkspacesRequest: {} }).subscribe((value: SearchWorkspacesResponse) => {
      this.workspaces = value.stream
      this.checkWorkspaceUniqueness()
      this.isLoading.emit(false)
    })
  }

  public checkWorkspaceUniqueness(): void {
    this.workspaceNameExists = false
    this.baseUrlExists = false
    if (this.workspaces) {
      for (const { displayName, name, baseUrl } of this.workspaces) {
        if (this.workspaceName?.toLocaleLowerCase() === name.toLocaleLowerCase() || this.displayName === displayName) {
          this.workspaceNameExists = true
          this.isFormValide.emit(false)
        }
        if (!this.baseUrlIsMissing && baseUrl?.toLocaleLowerCase() === this.baseUrl?.toLocaleLowerCase()) {
          this.baseUrlExists = true
          this.isFormValide.emit(false)
        }
      }
    }
  }
}
