import { Component, OnInit, ViewChild } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { finalize, Observable, map } from 'rxjs'
import { TranslateService } from '@ngx-translate/core'

import { Action, DataViewControlTranslations, PortalMessageService } from '@onecx/portal-integration-angular'
import {
  ImagesInternalAPIService,
  SearchWorkspacesResponse,
  Workspace,
  WorkspaceAPIService,
  WorkspaceAbstract
} from 'src/app/shared/generated'
import { limitText } from 'src/app/shared/utils'

@Component({
  selector: 'app-workspace-search',
  templateUrl: './workspace-search.component.html',
  styleUrls: ['./workspace-search.component.scss']
})
export class WorkspaceSearchComponent implements OnInit {
  public searchInProgress = false
  public actions$: Observable<Action[]> | undefined
  public showCreateDialog = false
  public showImportDialog = false
  public limitText = limitText

  public workspaces: WorkspaceAbstract[] | undefined = []
  public viewMode = 'grid'
  public filter: string | undefined
  public sortField = ''
  public sortOrder = 1
  public defaultSortField = 'name'
  public dataViewControlsTranslations: DataViewControlTranslations = {}

  @ViewChild('table', { static: false }) table!: DataView | any

  constructor(
    private workspaceApi: WorkspaceAPIService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private msgService: PortalMessageService,
    private imageApi: ImagesInternalAPIService
  ) {}

  ngOnInit() {
    this.prepareDialogTranslations()
    this.prepareActionButtons()
    this.search()
  }

  private prepareDialogTranslations() {
    this.translate
      .get(['WORKSPACE.NAME', 'WORKSPACE.THEME', 'ACTIONS.SEARCH.SORT_BY', 'ACTIONS.SEARCH.FILTER_OF'])
      .pipe(
        map((data) => {
          this.dataViewControlsTranslations = {
            sortDropdownTooltip: data['ACTIONS.SEARCH.SORT_BY'],
            sortDropdownPlaceholder: data['ACTIONS.SEARCH.SORT_BY'],
            filterInputTooltip:
              data['ACTIONS.SEARCH.FILTER_OF'] + data['WORKSPACE.NAME'] + ', ' + data['WORKSPACE.THEME']
          }
        })
      )
      .subscribe()
  }

  private prepareActionButtons() {
    this.actions$ = this.translate
      .get([
        'ACTIONS.CREATE.WORKSPACE',
        'ACTIONS.CREATE.WORKSPACE.TOOLTIP',
        'ACTIONS.IMPORT.LABEL',
        'ACTIONS.IMPORT.WORKSPACE'
      ])
      .pipe(
        map((data) => {
          return [
            {
              label: data['ACTIONS.CREATE.WORKSPACE'],
              title: data['ACTIONS.CREATE.WORKSPACE.TOOLTIP'],
              actionCallback: () => this.toggleShowCreateDialog(),
              icon: 'pi pi-plus',
              show: 'always',
              permission: 'WORKSPACE#CREATE'
            },
            {
              label: data['ACTIONS.IMPORT.LABEL'],
              title: data['ACTIONS.IMPORT.WORKSPACE'],
              actionCallback: () => this.toggleShowImportDialog(),
              icon: 'pi pi-upload',
              show: 'always',
              permission: 'WORKSPACE#IMPORT'
            }
          ]
        })
      )
  }

  toggleShowCreateDialog = (): void => {
    this.showCreateDialog = !this.showCreateDialog
  }

  toggleShowImportDialog = (): void => {
    this.showImportDialog = !this.showImportDialog
  }

  public search(): void {
    this.searchInProgress = true
    this.workspaceApi
      .searchWorkspaces({ searchWorkspacesRequest: {} })
      .pipe(finalize(() => (this.searchInProgress = false)))
      .subscribe({
        next: (value: SearchWorkspacesResponse) => {
          this.workspaces = value.stream
          if (value.totalElements === 0) {
            this.msgService.info({ summaryKey: 'ACTIONS.SEARCH.NO_DATA' })
          }
          this.sortField = this.defaultSortField
        },
        error: () => {
          this.msgService.error({ summaryKey: 'ACTIONS.SEARCH.ERROR' })
        }
      })
  }

  onFilterChange(event: string): void {
    this.table.filter(event, 'contains')
  }

  onLayoutChange(viewMode: string) {
    this.viewMode = viewMode
  }

  onSortChange(field: string) {
    this.sortField = field
  }
  onSortDirChange(asc: boolean) {
    this.sortOrder = asc ? -1 : 1
  }
  public onGotoWorkspace(ev: any, workspace: Workspace) {
    ev.stopPropagation()
    window.open(window.document.location.href + '../../../..' + workspace.baseUrl, '_blank')
  }
  public onGotoMenu(ev: any, workspace: Workspace) {
    ev.stopPropagation()
    this.workspaceApi
      .getWorkspaceByName({ workspaceName: workspace.name })
      .pipe()
      .subscribe({
        next: (workspace) => {
          if (workspace.resource) {
            this.router.navigate(['./', workspace.resource.name, 'menu'], { relativeTo: this.route })
          }
        },
        error: () => {}
      })
  }

  getDescriptionString(text: string): string {
    if (text) {
      const chars = window.innerWidth < 1200 ? 200 : 120
      return text.length < chars ? text : text.substring(0, chars) + '...'
    } else {
      return ''
    }
  }

  getImageUrl(workspace: any) {
    if (workspace.logoUrl) {
      return workspace.logoUrl
    } else {
      return this.imageApi.configuration.basePath + '/images/' + workspace.name + '/logo'
    }
  }
}
