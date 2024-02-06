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
  @Input() public portalName?: string
  @Input() public themeName?: string
  @Input() public themeProperties?: any
  @Input() public importThemeCheckbox = false
  @Input() public tenantId?: string | undefined
  @Input() public hasPermission = false
  @Input() public baseUrl?: string
  @Output() public isLoading = new EventEmitter<boolean>(true)

  private portals!: WorkspaceAbstract[] | undefined
  // private themes!: ThemeDTO[]
  public portalNameExists = false
  public themeNameExists = false
  public baseUrlExists = false
  public baseUrlIsMissing = false
  public portalTenantExists = false

  constructor(private readonly workspaceApi: WorkspaceAPIService /* , private readonly themeAPI: ThemesAPIService */) {}

  public ngOnInit(): void {
    this.baseUrlIsMissing = this.baseUrl === undefined || this.baseUrl.length === 0
    this.fetchPortalsAndThemes()
  }

  private fetchPortalsAndThemes(): void {
    this.workspaceApi.searchWorkspaces({ searchWorkspacesRequest: {} }).subscribe((value: SearchWorkspacesResponse) => {
      this.portals = value.stream
      this.checkPortalUniqueness()
      if (this.themeName) {
        /* this.themeAPI.getThemes().subscribe((themes: any) => {
          this.themes = themes
          this.checkThemeNames()
          this.isLoading.emit(false)
        }) */
      } else this.isLoading.emit(false)
    })
  }

  public checkPortalUniqueness(): void {
    this.portalNameExists = false
    this.baseUrlExists = false
    if (this.portals) {
      for (const { name, /* tenantId, */ baseUrl } of this.portals) {
        if (this.hasPermission) {
          /* if ((tenantId ?? undefined) === this.tenantId && name === this.portalName) {
            this.portalTenantExists = true
          } */
        } else if (this.portalName === name) {
          this.portalNameExists = true
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
