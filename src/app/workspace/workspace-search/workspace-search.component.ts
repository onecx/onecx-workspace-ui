import { Component, OnInit, ViewChild } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { finalize } from 'rxjs'
import { TranslateService } from '@ngx-translate/core'

import { Action, DataViewControlTranslations, PortalMessageService } from '@onecx/portal-integration-angular'
import { limitText } from 'src/app/shared/utils'
import {
  ImagesInternalAPIService,
  SearchWorkspacesResponse,
  Workspace,
  WorkspaceAPIService,
  WorkspaceAbstract
} from 'src/app/shared/generated'

@Component({
  selector: 'app-workspace-search',
  templateUrl: './workspace-search.component.html',
  styleUrls: ['./workspace-search.component.scss']
})
export class WorkspaceSearchComponent implements OnInit {
  public searchInProgress = false
  public actions: Action[] = []
  public showCreateDialog = false
  public showImportDialog = false
  public limitText = limitText

  public workspaces: WorkspaceAbstract[] | undefined = []
  public viewMode = 'grid'
  public filter: string | undefined
  public sortField = ''
  public sortOrder = 1
  public defaultSortField = 'name'
  public fieldLabelWorkspaceName = ''
  public fieldLabelThemeName = ''
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
    this.prepareTranslations()
    this.prepareActionButtons()
    this.search()
  }

  private prepareTranslations() {
    this.translate
      .get([
        'WORKSPACE.NAME',
        'WORKSPACE.THEME',
        'ACTIONS.SEARCH.SORT_BY',
        'ACTIONS.SEARCH.FILTER',
        'ACTIONS.SEARCH.FILTER_OF',
        'ACTIONS.SEARCH.SORT_DIRECTION_ASC',
        'ACTIONS.SEARCH.SORT_DIRECTION_DESC',
        'DIALOG.DATAVIEW.VIEW_MODE_GRID',
        'DIALOG.DATAVIEW.VIEW_MODE_LIST',
        'DIALOG.DATAVIEW.VIEW_MODE_TABLE'
      ])
      .subscribe((data) => {
        this.fieldLabelWorkspaceName = data['WORKSPACE.NAME']
        this.fieldLabelThemeName = data['WORKSPACE.THEME']
        this.dataViewControlsTranslations = {
          sortDropdownPlaceholder: data['ACTIONS.SEARCH.SORT_BY'],
          filterInputPlaceholder: data['ACTIONS.SEARCH.FILTER'],
          filterInputTooltip:
            data['ACTIONS.SEARCH.FILTER_OF'] + this.fieldLabelWorkspaceName + ', ' + this.fieldLabelThemeName,
          viewModeToggleTooltips: {
            grid: data['DIALOG.DATAVIEW.VIEW_MODE_GRID'],
            list: data['DIALOG.DATAVIEW.VIEW_MODE_LIST'],
            table: data['DIALOG.DATAVIEW.VIEW_MODE_TABLE']
          },
          sortOrderTooltips: {
            ascending: data['ACTIONS.SEARCH.SORT_DIRECTION_ASC'],
            descending: data['ACTIONS.SEARCH.SORT_DIRECTION_DESC']
          },
          sortDropdownTooltip: data['ACTIONS.SEARCH.SORT_BY']
        }
      })
  }

  private prepareActionButtons() {
    this.translate
      .get([
        'ACTIONS.CREATE.WORKSPACE',
        'ACTIONS.CREATE.WORKSPACE.TOOLTIP',
        'ACTIONS.IMPORT.LABEL',
        'ACTIONS.IMPORT.WORKSPACE'
      ])
      .subscribe((data) => {
        this.actions.push(
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
        )
      })
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
            this.msgService.info({ summaryKey: 'SEARCH.MSG_NO_RESULTS' })
          }
          this.sortField = this.defaultSortField
        },
        error: () => {
          this.msgService.error({ summaryKey: 'SEARCH.ERROR' })
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
