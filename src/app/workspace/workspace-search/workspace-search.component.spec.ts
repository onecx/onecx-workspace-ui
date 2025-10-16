import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateService } from '@ngx-translate/core'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'
import { DataView } from 'primeng/dataview'

import { PortalMessageService } from '@onecx/angular-integration-interface'
import { AppStateServiceMock, provideAppStateServiceMock } from '@onecx/angular-integration-interface/mocks'
import { Workspace } from '@onecx/integration-interface'

import { WorkspaceAbstract, WorkspaceAPIService, SearchWorkspacesResponse } from 'src/app/shared/generated'
import { WorkspaceSearchComponent } from './workspace-search.component'

const currentWorkspace: Partial<Workspace> = {
  workspaceName: 'workspace1',
  displayName: 'Workspace 1'
}

describe('WorkspaceSearchComponent', () => {
  let component: WorkspaceSearchComponent
  let fixture: ComponentFixture<WorkspaceSearchComponent>

  let mockAppStateService: AppStateServiceMock
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['error'])
  const wApiServiceSpy = {
    searchWorkspaces: jasmine.createSpy('searchWorkspaces').and.returnValue(of({})),
    getWorkspaceByName: jasmine.createSpy('getWorkspaceByName').and.returnValue(of({}))
  }

  function initTestComponent() {
    fixture = TestBed.createComponent(WorkspaceSearchComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceSearchComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAppStateServiceMock(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: wApiServiceSpy }
      ]
    }).compileComponents()

    mockAppStateService = TestBed.inject(AppStateServiceMock)
    mockAppStateService.currentWorkspace$.publish({
      workspaceName: currentWorkspace.workspaceName
    } as Workspace)
  }))

  beforeEach(() => {
    initTestComponent()

    // to spy data: reset
    msgServiceSpy.error.calls.reset()
    wApiServiceSpy.searchWorkspaces.calls.reset()
    // to spy data: refill with neutral data
    wApiServiceSpy.searchWorkspaces.and.returnValue(of({}))
  })

  describe('initialize', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })

    it('dataview translations', (done) => {
      const translationData = {
        'DIALOG.DATAVIEW.FILTER': 'filter',
        'DIALOG.DATAVIEW.FILTER_OF': 'filterOf',
        'DIALOG.DATAVIEW.SORT_BY': 'sortBy'
      }
      const translateService = TestBed.inject(TranslateService)
      spyOn(translateService, 'get').and.returnValue(of(translationData))

      component.ngOnInit()

      component.dataViewControlsTranslations$?.subscribe({
        next: (data) => {
          if (data) {
            expect(data.sortDropdownTooltip).toEqual('sortBy')
          }
          done()
        },
        error: done.fail
      })
    })
  })

  describe('Search', () => {
    it('should search workspaces - success with results', (done) => {
      const w: WorkspaceAbstract = {
        name: 'name',
        theme: 'theme',
        baseUrl: 'url',
        displayName: ''
      }
      wApiServiceSpy.searchWorkspaces.and.returnValue(of({ stream: [w] } as SearchWorkspacesResponse))

      component.search()

      component.workspaces$.subscribe({
        next: (result) => {
          if (result) {
            expect(result.length).toBe(1)
            result.forEach((w) => {
              expect(w.name).toEqual('name')
            })
          }
          done()
        },
        error: done.fail
      })
    })

    it('should search workspaces - success without results', (done) => {
      wApiServiceSpy.searchWorkspaces.and.returnValue(of({ stream: [] } as SearchWorkspacesResponse))

      component.search()

      component.workspaces$.subscribe({
        next: (result) => {
          if (result) {
            expect(result.length).toBe(0)
          }
          done()
        },
        error: done.fail
      })
    })

    it('should search workspaces - failed', (done) => {
      const errorResponse = { status: 403, statusText: 'no permissions' }
      wApiServiceSpy.searchWorkspaces.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.search()

      component.workspaces$.subscribe({
        next: (result) => {
          if (result) {
            expect(result.length).toBe(0)
          }
          done()
        },
        error: (err) => {
          expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.WORKSPACES')
          expect(console.error).toHaveBeenCalledWith('searchWorkspaces', err)
          done.fail
        }
      })
    })
  })

  describe('table actions', () => {
    it('should call filter table onFilterChange', () => {
      const dv = jasmine.createSpyObj('nativeElement', ['filter']) as DataView
      const ev = 'filter'

      component.onFilterChange(ev, dv)

      expect(dv.filter).toHaveBeenCalledWith(ev)
    })

    it('should set correct values onLayoutChange', () => {
      component.onLayoutChange('list')

      expect(component.viewMode).toEqual('list')
    })

    describe('sorting', () => {
      it('should set correct values onSortChange', () => {
        component.onSortChange('field')

        expect(component.sortField).toEqual('field')
      })

      it('should set correct values onSortDirChange', () => {
        component.onSortDirChange(true)

        expect(component.sortOrder).toEqual(-1)
      })

      it('should set correct values onSortDirChange', () => {
        component.onSortDirChange(false)

        expect(component.sortOrder).toEqual(1)
      })
    })
  })

  describe('page actions', () => {
    it('should call toggleShowCreateDialog when actionCallback is executed', () => {
      spyOn(component, 'toggleShowCreateDialog')

      component.ngOnInit()

      if (component.actions$) {
        component.actions$.subscribe((actions) => {
          const action = actions[0]
          action.actionCallback()
          expect(component.toggleShowCreateDialog).toHaveBeenCalled()
        })
      }
    })

    it('should call toggleShowImportDialog when actionCallback is executed', () => {
      spyOn(component, 'toggleShowImportDialog')

      component.ngOnInit()

      if (component.actions$) {
        component.actions$.subscribe((actions) => {
          const action = actions[1]
          action.actionCallback()
          expect(component.toggleShowImportDialog).toHaveBeenCalled()
        })
      }
    })

    it('should toggle showCreateDialog from false to true', () => {
      component.showCreateDialog = false

      component.toggleShowCreateDialog()

      expect(component.showCreateDialog).toBeTrue()
    })

    it('should toggle showImportDialog from true to false', () => {
      component.showImportDialog = true

      component.toggleShowImportDialog()

      expect(component.showImportDialog).toBeFalse()
    })
  })

  describe('sort Workspaces by display name', () => {
    it('should sort workspaces by display name 1 - non-empty', () => {
      const a: WorkspaceAbstract = { name: 'a', displayName: 'a' }
      const b: WorkspaceAbstract = { name: 'b', displayName: 'b' }
      const c: WorkspaceAbstract = { name: 'c', displayName: 'c' }
      const workspaces = [b, c, a]

      workspaces.sort((x, y) => component.sortWorkspacesByName(x, y))

      expect(workspaces).toEqual([a, b, c])
    })

    it('should sort workspaces by display name 2 - empty and non-empty', () => {
      const a: WorkspaceAbstract = { name: 'a', displayName: '' }
      const b: WorkspaceAbstract = { name: '', displayName: '' }
      const c: WorkspaceAbstract = { name: '', displayName: '' }
      const workspaces = [b, c, a]

      workspaces.sort((x, y) => component.sortWorkspacesByName(x, y))

      expect(workspaces).toEqual([b, c, a])
    })

    it('should sort workspaces by display name 3 - empty display names', () => {
      const a: WorkspaceAbstract = { name: '', displayName: '' }
      const b: WorkspaceAbstract = { name: '', displayName: '' }
      const c: WorkspaceAbstract = { name: '', displayName: '' }
      const workspaces = [b, c, a]

      workspaces.sort((x, y) => component.sortWorkspacesByName(x, y))

      expect(workspaces).toEqual([b, c, a])
    })

    it('should sort workspaces by display name 4 - special characters', () => {
      const a: WorkspaceAbstract = { name: 'a', displayName: 'a' }
      const b: WorkspaceAbstract = { name: 'b', displayName: 'b' }
      const c: WorkspaceAbstract = { name: '$', displayName: '$' }
      const workspaces = [b, c, a]

      workspaces.sort((x, y) => component.sortWorkspacesByName(x, y))

      expect(workspaces).toEqual([c, a, b])
    })
  })
})
