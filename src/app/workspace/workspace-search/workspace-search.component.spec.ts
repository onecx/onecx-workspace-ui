import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { Router } from '@angular/router'
import { of, throwError } from 'rxjs'
import { ActivatedRoute } from '@angular/router'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { RouterTestingModule } from '@angular/router/testing'

import { PortalMessageService } from '@onecx/portal-integration-angular'
import { Workspace, WorkspaceAbstract, WorkspaceAPIService, SearchWorkspacesResponse } from 'src/app/shared/generated'

import { WorkspaceSearchComponent } from './workspace-search.component'
import { getLocation } from '@onecx/accelerator'
import { Location } from '@angular/common'

describe('WorkspaceSearchComponent', () => {
  let component: WorkspaceSearchComponent
  let fixture: ComponentFixture<WorkspaceSearchComponent>
  let mockActivatedRoute: ActivatedRoute
  let mockRouter = { navigate: jasmine.createSpy('navigate') }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockNewWorkspaceWindow: any

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['info', 'error'])
  const wApiServiceSpy = {
    searchWorkspaces: jasmine.createSpy('searchWorkspaces').and.returnValue(of({})),
    getWorkspaceByName: jasmine.createSpy('getWorkspaceByName').and.returnValue(of({}))
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WorkspaceSearchComponent],
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: WorkspaceAPIService, useValue: wApiServiceSpy }
      ]
    }).compileComponents()
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.error.calls.reset()
    wApiServiceSpy.searchWorkspaces.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkspaceSearchComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should search workspaces with results', (done) => {
    const w: WorkspaceAbstract = {
      name: 'name',
      theme: 'theme',
      baseUrl: 'url'
    }
    wApiServiceSpy.searchWorkspaces.and.returnValue(of({ stream: [w] } as SearchWorkspacesResponse))

    component.search()

    component.workspaces$.subscribe({
      next: (result) => {
        if (result.stream) {
          expect(result.stream.length).toBe(1)
          result.stream.forEach((w) => {
            expect(w.name).toEqual('name')
          })
        }
        done()
      },
      error: done.fail
    })
  })

  it('should search workspaces without results', (done) => {
    wApiServiceSpy.searchWorkspaces.and.returnValue(of({ stream: [] } as SearchWorkspacesResponse))

    component.search()

    component.workspaces$.subscribe({
      next: (result) => {
        if (result.stream) {
          expect(result.stream.length).toBe(0)
        }
        done()
      },
      error: done.fail
    })
  })

  it('should call filter table onFilterChange', () => {
    component.table = jasmine.createSpyObj('table', ['filter'])

    component.onFilterChange('test')

    expect(component.table?.filter).toHaveBeenCalledWith('test', 'contains')
  })

  it('should set correct values onLayoutChange', () => {
    component.onLayoutChange('EDIT')

    expect(component.viewMode).toEqual('EDIT')
  })

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

  it('should behave correctly onGotoWorkspace', () => {
    mockNewWorkspaceWindow = spyOn(window, 'open')
    const mockEvent = {
      stopPropagation: jasmine.createSpy()
    }
    const w: WorkspaceAbstract = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url'
    }

    const deploymentPath = getLocation().deploymentPath === '/' ? '' : getLocation().deploymentPath

    component.onGotoWorkspace(mockEvent, w)

    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(window.open).toHaveBeenCalledWith(
      Location.joinWithSlash(Location.joinWithSlash(window.document.location.origin, deploymentPath), w.baseUrl || ''),
      '_blank'
    )
  })

  it('should behave correctly onGotoMenu', () => {
    const mockEvent = {
      stopPropagation: jasmine.createSpy()
    }
    const w: WorkspaceAbstract = {
      name: 'name',
      theme: 'theme',
      baseUrl: '/some/base/url'
    }

    component.onGotoMenu(mockEvent, w)

    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(mockRouter.navigate).toHaveBeenCalledWith(['./', w.name, 'menu'], { relativeTo: component.route })
  })

  it('should return correct string on getDescriptionString: smaller width, longer text', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(10)
    const text = 'a'.repeat(201)

    const result = component.getDescriptionString(text)

    expect(result).toEqual('a'.repeat(200) + '...')
  })

  it('should return correct string on getDescriptionString: greater width', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(1250)
    const text = 'text'

    const result = component.getDescriptionString(text)

    expect(result).toEqual(text)
  })

  it('should return correct string on getDescriptionString: empty string', () => {
    const text = ''

    const result = component.getDescriptionString(text)

    expect(result).toEqual('')
  })

  it('should return correct imageUrl', () => {
    const result = component.getLogoUrl({ logoUrl: 'url' } as Workspace)

    expect(result).toBe('url')
  })

  it('should return uploaded imageUrl', () => {
    const result = component.getLogoUrl({ name: 'workspace' } as Workspace)

    expect(result).toBe('http://onecx-workspace-bff:8080/images/workspace/logo')
  })

  it('should call toggleShowCreateDialog when actionCallback is executed', () => {
    spyOn(component, 'toggleShowCreateDialog')

    component.ngOnInit()

    if (component.actions$) {
      component.actions$.subscribe((actions) => {
        const firstAction = actions[0]
        firstAction.actionCallback()
        expect(component.toggleShowCreateDialog).toHaveBeenCalled()
      })
    }
  })

  it('should call toggleShowImportDialog when actionCallback is executed', () => {
    spyOn(component, 'toggleShowImportDialog')

    component.ngOnInit()

    if (component.actions$) {
      component.actions$.subscribe((actions) => {
        const firstAction = actions[1]
        firstAction.actionCallback()
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

  it('should search workspaces but display error if API call fails', (done) => {
    const err = { status: 403 }
    wApiServiceSpy.searchWorkspaces.and.returnValue(throwError(() => err))

    component.search()

    component.workspaces$.subscribe({
      next: (result) => {
        if (result.stream) {
          expect(result.stream.length).toBe(0)
          expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_403.WORKSPACES')
        }
        done()
      },
      error: done.fail
    })
  })
})
