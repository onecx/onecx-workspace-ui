import { NO_ERRORS_SCHEMA, SimpleChanges, SimpleChange } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { MenuTreeComponent } from './menu-tree.component'
import { MenuTreeService } from 'src/app/services/menu-tree.service'
import { MenuStateService, MenuState } from 'src/app/services/menu-state.service'

const state: MenuState = {
  pageSize: 0,
  showDetails: false,
  rootFilter: true,
  treeMode: true,
  treeExpansionState: new Map()
}

describe('MenuTreeComponent', () => {
  let component: MenuTreeComponent
  let fixture: ComponentFixture<MenuTreeComponent>

  const treeServiceSpy = jasmine.createSpyObj<MenuTreeService>('MenuTreeService', ['calculateNewNodesPositions'])
  const stateServiceSpy = jasmine.createSpyObj<MenuStateService>('MenuStateService', ['getState'])

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MenuTreeComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: HttpLoaderFactory,
            deps: [HttpClient]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: MenuTreeService, useValue: treeServiceSpy },
        { provide: MenuStateService, useValue: stateServiceSpy }
      ]
    }).compileComponents()
    treeServiceSpy.calculateNewNodesPositions.calls.reset()
    stateServiceSpy.getState.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuTreeComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should set menuTreeNodes onChanges if portalDetail & changes correct: langExists false', () => {
    stateServiceSpy.getState.and.returnValue(state)
    const changes: SimpleChanges = {
      updateTree: new SimpleChange(null, component.updateTree, true)
    }
    component.portalMenuItems = [
      { key: 'key', i18n: { ['lang']: 'en' }, children: [{ key: 'key' }], disabled: true },
      { key: 'key2', badge: 'angle-double-down' }
    ]

    component.ngOnChanges(changes)

    expect(component.treeExpanded).toBeTrue()
  })

  it('should expand tree nodes on expandAll', () => {
    const mockExpansionState: Map<string, boolean> = new Map<string, boolean>()
    stateServiceSpy.getState.and.returnValue({
      treeExpansionState: mockExpansionState,
      pageSize: 0,
      showDetails: false,
      rootFilter: true,
      treeMode: true
    })
    component.menuTreeNodes = [
      { key: '1', expanded: false, children: [{ key: '1-1', children: [{ key: '1-1-1' }] }] },
      { key: '2' }
    ]

    component.expandAll()

    expect(stateServiceSpy.getState().treeExpansionState.get('1')).toBeTrue()
  })

  it('should collapse tree nodes on collapseAll', () => {
    const mockExpansionState: Map<string, boolean> = new Map<string, boolean>()
    stateServiceSpy.getState.and.returnValue({
      treeExpansionState: mockExpansionState,
      pageSize: 0,
      showDetails: false,
      rootFilter: true,
      treeMode: true
    })
    component.menuTreeNodes = [
      { key: '1', expanded: true, children: [{ key: '1-1', children: [{ key: '1-1-1' }] }] },
      { key: '2' }
    ]

    component.collapseAll()

    expect(stateServiceSpy.getState().treeExpansionState.get('1')).toBeFalse()
  })

  it('should update menu items onDrop: return before pushing items', () => {
    const event = {
      dragNode: { key: 'draggedNodeId', parent: { key: 'oldParentNodeId' } },
      dropNode: { key: 'newParentNodeId', children: [{ key: 'draggedNodeId' }], parent: { key: 'parent key' } }
    }
    treeServiceSpy.calculateNewNodesPositions.and.returnValue([{ id: 'id', position: 1 }])
    component.portalMenuItems = [
      { key: 'key', i18n: { ['lang']: 'en' }, children: [{ key: 'key' }], disabled: true },
      { key: 'key2', badge: 'angle-double-down' }
    ]

    component.onDrop(event)

    expect(treeServiceSpy.calculateNewNodesPositions).toHaveBeenCalledWith(
      'oldParentNodeId',
      'newParentNodeId',
      component.menuTreeNodes
    )
  })

  it('should update menu items onDrop: other branches: complete updating the structure', () => {
    const event = {
      dragNode: { key: 'draggedNodeId', parent: { key: 'oldParentNodeId' } },
      dropNode: { key: 'newParentNodeId', children: [{ key: 'otherdraggedNodeId' }], parent: { key: 'parent key' } }
    }
    treeServiceSpy.calculateNewNodesPositions.and.returnValue([{ id: 'id', position: 1 }])
    spyOn(component.updateMenuStructureEmitter, 'emit')
    component.portalMenuItems = [
      { key: 'key', id: 'id', position: 1, i18n: { ['lang']: 'en' }, children: [{ key: 'key' }], disabled: true },
      { key: 'key2', badge: 'angle-double-down' }
    ]
    const expectedItems = [
      {
        key: 'key',
        id: 'id',
        parentItemId: undefined,
        i18n: { lang: 'en' },
        position: 1,
        disabled: true,
        portalExit: undefined
      }
    ]

    component.onDrop(event)

    expect(component.updateMenuStructureEmitter.emit).toHaveBeenCalledWith(expectedItems)
  })

  it('should set treeExpansionState onHierarchyViewChange', () => {
    const mockExpansionState: Map<string, boolean> = new Map<string, boolean>()
    stateServiceSpy.getState.and.returnValue({
      treeExpansionState: mockExpansionState,
      pageSize: 0,
      showDetails: false,
      rootFilter: true,
      treeMode: true
    })
    const event = { node: { key: 'node', expanded: true } }
    spyOn(mockExpansionState, 'set').and.callThrough()

    component.onHierarchyViewChange(event)

    expect(stateServiceSpy.getState().treeExpansionState.set).toHaveBeenCalledWith(event.node.key, event.node.expanded)
  })

  it('should set languagePreviewValue and mapToTree onLanguagePreviewChange', () => {
    const lang = 'de'
    component.portalMenuItems = [
      { key: 'key', id: 'id', position: 1, i18n: { ['lang']: 'en' }, children: [{ key: 'key' }], disabled: true },
      { key: 'key2', badge: 'angle-double-down' }
    ]
    const mockExpansionState: Map<string, boolean> = new Map<string, boolean>()
    stateServiceSpy.getState.and.returnValue({
      treeExpansionState: mockExpansionState,
      pageSize: 0,
      showDetails: false,
      rootFilter: true,
      treeMode: true
    })

    component.onLanguagesPreviewChange(lang)

    expect(component.languagesPreviewValue).toEqual(lang)
  })
})
