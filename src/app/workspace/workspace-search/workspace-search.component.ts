import { Component, OnInit, ViewChild } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { Observable, catchError, finalize, map, of } from 'rxjs'

import { Action } from '@onecx/angular-accelerator'
import { PortalMessageService } from '@onecx/angular-integration-interface'
import { DataViewControlTranslations } from '@onecx/portal-integration-angular'

import { Location } from '@angular/common'
import { getLocation } from '@onecx/accelerator'
import {
  ImagesInternalAPIService,
  RefType,
  SearchWorkspacesResponse,
  Workspace,
  WorkspaceAPIService,
  WorkspaceAbstract
} from 'src/app/shared/generated'
import { bffImageUrl, limitText } from 'src/app/shared/utils'

@Component({
  selector: 'app-workspace-search',
  templateUrl: './workspace-search.component.html',
  styleUrls: ['./workspace-search.component.scss']
})
export class WorkspaceSearchComponent implements OnInit {
  public searchInProgress = false
  public exceptionKey: string | undefined = undefined
  public actions$: Observable<Action[]> | undefined
  public showCreateDialog = false
  public showImportDialog = false
  public limitText = limitText

  public workspaces$!: Observable<SearchWorkspacesResponse>
  public workspaces: WorkspaceAbstract[] | undefined = []
  public viewMode = 'grid'
  public filter: string | undefined
  public sortField = 'name'
  public sortOrder = 1
  public dataViewControlsTranslations: DataViewControlTranslations = {}
  public deploymentPath = ''

  @ViewChild('table', { static: false }) table!: any

  constructor(
    private workspaceApi: WorkspaceAPIService,
    public route: ActivatedRoute,
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

  public search(): void {
    this.searchInProgress = true
    this.workspaces$ = this.workspaceApi.searchWorkspaces({ searchWorkspacesRequest: {} }).pipe(
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.WORKSPACES'
        console.error('searchWorkspaces():', err)
        return of({ stream: [] } as SearchWorkspacesResponse)
      }),
      finalize(() => (this.searchInProgress = false))
    )
  }
  public sortWorkspacesByName(a: WorkspaceAbstract, b: WorkspaceAbstract): number {
    return a.name.toUpperCase().localeCompare(b.name.toUpperCase())
  }

  /**
   * DIALOG
   */
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

  /**
   * UI EVENTS
   */
  public toggleShowCreateDialog(): void {
    this.showCreateDialog = !this.showCreateDialog
  }

  public toggleShowImportDialog(): void {
    this.showImportDialog = !this.showImportDialog
  }

  public onFilterChange(event: string): void {
    this.table.filter(event, 'contains')
  }

  public onLayoutChange(viewMode: string) {
    this.viewMode = viewMode
  }

  public onSortChange(field: string) {
    this.sortField = field
  }
  public onSortDirChange(asc: boolean) {
    this.sortOrder = asc ? -1 : 1
  }
  public onGotoWorkspace(ev: any, workspace: Workspace) {
    ev.stopPropagation()
    this.deploymentPath = getLocation().deploymentPath === '/' ? '' : getLocation().deploymentPath
    window.open(
      Location.joinWithSlash(
        Location.joinWithSlash(window.document.location.origin, this.deploymentPath),
        workspace.baseUrl || ''
      ),
      '_blank'
    )
  }
  public onGotoMenu(ev: any, workspace: Workspace) {
    ev.stopPropagation()
    this.router.navigate(['./', workspace.name, 'menu'], { relativeTo: this.route })
  }

  public getDescriptionString(text: string): string {
    if (text) {
      const chars = window.innerWidth < 1200 ? 200 : 120
      return text.length < chars ? text : text.substring(0, chars) + '...'
    } else {
      return ''
    }
  }

  public getImageUrl(workspace: any): string {
    if (workspace.logoUrl) {
      return workspace.logoUrl
    } else {
      return this.imageApi.configuration.basePath + '/images/' + workspace.name + '/logo'
    }
  }
  public getLogoUrl(workspace: Workspace | undefined): string | undefined {
    if (!workspace) {
      return undefined
    }
    if (workspace.logoUrl && workspace.logoUrl != '') {
      return workspace.logoUrl
    }
    return bffImageUrl(this.imageApi.configuration.basePath, workspace.name, RefType.Logo)
  }
}
