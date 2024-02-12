import { Component, OnInit, ViewChild } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { finalize, Observable } from 'rxjs'
import { TranslateService } from '@ngx-translate/core'
import {
  Action,
  // ConfigurationService,
  DataViewControlTranslations,
  PortalMessageService
} from '@onecx/portal-integration-angular'
import { limitText } from '../../shared/utils'
import { SearchWorkspacesResponse, Workspace, WorkspaceAPIService, WorkspaceAbstract } from '../../shared/generated'

@Component({
  selector: 'app-workspace-search',
  templateUrl: './workspace-search.component.html',
  styleUrls: ['./workspace-search.component.scss']
})
export class WorkspaceSearchComponent implements OnInit {
  portals$!: Observable<Workspace[]>
  public searchInProgress = false
  public actions: Action[] = []
  public showCreateDialog = false
  public showImportDialog = false
  public limitText = limitText

  public portalItems: WorkspaceAbstract[] | undefined = []
  public viewMode = 'grid'
  public filter: string | undefined
  public sortField = ''
  public sortOrder = 1
  public defaultSortField = 'portalName'
  public fieldLabelPortalName = ''
  public fieldLabelThemeName = ''
  public dataViewControlsTranslations: DataViewControlTranslations = {}

  @ViewChild('table', { static: false }) table!: DataView | any

  constructor(
    private workspaceApi: WorkspaceAPIService,
    private route: ActivatedRoute,
    private router: Router,
    // private config: ConfigurationService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {}

  ngOnInit() {
    this.translate
      .get([
        'PORTAL.ITEM.PORTAL_NAME',
        'PORTAL.ITEM.THEME',
        'SEARCH.SORT_BY',
        'SEARCH.FILTER',
        'SEARCH.FILTER_OF',
        'GENERAL.TOOLTIP.VIEW_MODE_GRID',
        'GENERAL.TOOLTIP.VIEW_MODE_LIST',
        'GENERAL.TOOLTIP.VIEW_MODE_TABLE',
        'SEARCH.SORT_DIRECTION_ASC',
        'SEARCH.SORT_DIRECTION_DESC'
      ])
      .subscribe((data) => {
        this.prepareTranslations(data)
      })
    this.translate
      .get(['ACTIONS.CREATE.PORTAL', 'ACTIONS.CREATE.PORTAL.TOOLTIP', 'ACTIONS.IMPORT.LABEL', 'ACTIONS.IMPORT.PORTAL'])
      .subscribe((data) => {
        this.prepareActionButtons(data)
      })
    // this.config.getMFEInfo()
    this.search()
  }

  private prepareTranslations(data: any) {
    this.fieldLabelPortalName = data['PORTAL.ITEM.PORTAL_NAME']
    this.fieldLabelThemeName = data['PORTAL.ITEM.THEME']
    this.dataViewControlsTranslations = {
      sortDropdownPlaceholder: data['SEARCH.SORT_BY'],
      filterInputPlaceholder: data['SEARCH.FILTER'],
      filterInputTooltip: data['SEARCH.FILTER_OF'] + this.fieldLabelPortalName + ', ' + this.fieldLabelThemeName,
      viewModeToggleTooltips: {
        grid: data['GENERAL.TOOLTIP.VIEW_MODE_GRID'],
        list: data['GENERAL.TOOLTIP.VIEW_MODE_LIST'],
        table: data['GENERAL.TOOLTIP.VIEW_MODE_TABLE']
      },
      sortOrderTooltips: {
        ascending: data['SEARCH.SORT_DIRECTION_ASC'],
        descending: data['SEARCH.SORT_DIRECTION_DESC']
      },
      sortDropdownTooltip: data['SEARCH.SORT_BY']
    }
  }

  private prepareActionButtons(data: any) {
    this.actions.push(
      {
        label: data['ACTIONS.CREATE.PORTAL'],
        title: data['ACTIONS.CREATE.PORTAL.TOOLTIP'],
        actionCallback: () => this.toggleShowCreateDialog(),
        icon: 'pi pi-plus',
        show: 'always',
        permission: 'WORKSPACE#CREATE'
      },
      {
        label: data['ACTIONS.IMPORT.LABEL'],
        title: data['ACTIONS.IMPORT.PORTAL'],
        actionCallback: () => this.toggleShowImportDialog(),
        icon: 'pi pi-upload',
        show: 'always',
        permission: 'WORKSPACE#IMPORT'
      }
    )
  }

  /* public loadPortals() {
    this.portals$ = this.portalApi.getAllPortals()
  } */

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
          this.portalItems = value.stream
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
  public onGotoPortal(ev: any, portal: Workspace) {
    ev.stopPropagation()
    window.open(window.document.location.href + '../../../..' + portal.baseUrl, '_blank')
  }
  public onGotoMenu(ev: any, portal: Workspace) {
    ev.stopPropagation()
    this.workspaceApi
      .getWorkspaceByName({ name: portal.name })
      .pipe()
      .subscribe({
        next: (portal) => {
          if (portal.resource) {
            this.router.navigate(['./', portal.resource.name, 'menu'], { relativeTo: this.route })
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
}
