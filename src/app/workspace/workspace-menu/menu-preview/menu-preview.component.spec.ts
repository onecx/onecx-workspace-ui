import { NO_ERRORS_SCHEMA /*SimpleChanges, SimpleChange */ } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'

import { MenuPreviewComponent } from './menu-preview.component'
import { MenuTreeService } from '../services/menu-tree.service'
import { MenuStateService, MenuState } from '../services/menu-state.service'
import { RouterTestingModule } from '@angular/router/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ToggleButtonModule } from 'primeng/togglebutton'

const state: MenuState = {
  pageSize: 0,
  showDetails: false,
  rootFilter: true,
  treeMode: true,
  treeExpansionState: new Map()
}

const items = [
  { key: 'key', id: 'id', i18n: { ['lang']: 'en' }, children: [{ key: 'key', id: 'id' }], disabled: true },
  { key: 'key2', badge: 'angle-double-down', id: 'id' }
]

describe('MenuPreviewComponent', () => {
  let component: MenuPreviewComponent
  let fixture: ComponentFixture<MenuPreviewComponent>

  const treeServiceSpy = jasmine.createSpyObj<MenuTreeService>('MenuTreeService', ['calculateNewNodesPositions'])
  const stateServiceSpy = jasmine.createSpyObj<MenuStateService>('MenuStateService', ['getState'])

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MenuPreviewComponent],
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        ToggleButtonModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
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
    fixture = TestBed.createComponent(MenuPreviewComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should set menuNodes onChanges if workspaceDetail & changes correct: langExists false', () => {
    stateServiceSpy.getState.and.returnValue(state)
    component.displayDialog = true
    component.menuItems = items

    component.ngOnChanges({})

    expect(component.treeExpanded).toBeFalse()
  })

  it('should set menuNodes onChanges if workspaceDetail & changes correct: langExists true', () => {
    stateServiceSpy.getState.and.returnValue(state)
    component.displayDialog = true
    component.menuItems = items
    component.languagesPreviewValue = 'lang'

    component.ngOnChanges({})

    expect(component.treeExpanded).toBeFalse()
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
    component.menuNodes = [
      { key: '1', expanded: false, children: [{ key: '1-1', children: [{ key: '1-1-1' }] }] },
      { key: '2' }
    ]

    component.onToggleTreeViewMode({ checked: true })

    expect(stateServiceSpy.getState().treeExpansionState.get('1')).toBeTrue()
  })

  it('should expand tree nodes on expandAll: no node key', () => {
    const mockExpansionState: Map<string, boolean> = new Map<string, boolean>()
    stateServiceSpy.getState.and.returnValue({
      treeExpansionState: mockExpansionState,
      pageSize: 0,
      showDetails: false,
      rootFilter: true,
      treeMode: true
    })
    component.menuNodes = [{ expanded: false, children: [{ key: '1-1', children: [{ key: '1-1-1' }] }] }, { key: '2' }]

    component.onToggleTreeViewMode({ checked: true })

    expect(stateServiceSpy.getState().treeExpansionState.get('1')).toBeUndefined()
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
    component.menuNodes = [
      { key: '1', expanded: true, children: [{ key: '1-1', children: [{ key: '1-1-1' }] }] },
      { key: '2' }
    ]

    component.onToggleTreeViewMode({ checked: false })

    expect(stateServiceSpy.getState().treeExpansionState.get('1')).toBeFalse()
  })

  xit('should update menu items onDrop: return before pushing items', () => {
    const event = {
      dragNode: { key: 'draggedNodeId', parent: { key: 'oldParentNodeId' } },
      dropNode: { key: 'newParentNodeId', children: [{ key: 'draggedNodeId' }], parent: { key: 'parent key' } }
    }
    treeServiceSpy.calculateNewNodesPositions.and.returnValue([{ id: '', position: 1 }])
    component.menuItems = items

    component.onDrop(event)

    expect(treeServiceSpy.calculateNewNodesPositions).toHaveBeenCalledWith(
      'oldParentNodeId',
      'newParentNodeId',
      component.menuNodes
    )
  })

  xit('should update menu items onDrop: other branches: complete updating the structure', () => {
    const event = {
      dragNode: { key: 'draggedNodeId', parent: { key: 'oldParentNodeId' } },
      dropNode: { key: 'newParentNodeId', children: [{ key: 'otherdraggedNodeId' }], parent: { key: 'parent key' } }
    }
    treeServiceSpy.calculateNewNodesPositions.and.returnValue([{ id: 'id', position: 1 }])
    spyOn(component.reorderEmitter, 'emit')
    component.menuItems = items
    component.onDrop(event)

    expect(component.reorderEmitter.emit).toHaveBeenCalledWith(true)
  })

  xit('should update menu items onDrop: other branches: complete updating the structure for dragged node', () => {
    const event = {
      dragNode: { key: 'id', parent: { key: 'oldParentNodeId' } },
      dropNode: { key: 'newParentNodeId', children: [{ key: 'otherdraggedNodeId' }], parent: { key: 'parent key' } }
    }
    treeServiceSpy.calculateNewNodesPositions.and.returnValue([{ id: 'id', position: 1 }])
    spyOn(component.reorderEmitter, 'emit')
    component.menuItems = items
    component.onDrop(event)

    expect(component.reorderEmitter.emit).toHaveBeenCalledWith(true)
  })

  xit('should update menu items onDrop: other branches: complete updating the structure, no parent key', () => {
    const event = {
      dragNode: { key: 'draggedNodeId' },
      dropNode: { key: 'newParentNodeId', children: [{ key: 'otherdraggedNodeId' }], parent: { key: 'parent key' } }
    }
    treeServiceSpy.calculateNewNodesPositions.and.returnValue([{ id: 'id', position: 1 }])
    spyOn(component.reorderEmitter, 'emit')
    component.menuItems = items
    component.onDrop(event)

    expect(component.reorderEmitter.emit).toHaveBeenCalledWith(true)
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
    component.menuItems = items
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

  it('should hide the dialog', () => {
    spyOn(component.hideDialog, 'emit')

    component.onClose()

    expect(component.hideDialog.emit).toHaveBeenCalled()
  })

  it('should call onStartResizeTree without errors', () => {
    const mockEvent = new MouseEvent('click')

    expect(() => component.onStartResizeTree(mockEvent)).not.toThrow()
  })

  it('should set treeHeight on onEndResizeTree call', () => {
    const mockClientY = 300
    const mockEvent = { clientY: mockClientY } as MouseEvent

    component.onEndResizeTree(mockEvent)

    expect(component['treeHeight']).toEqual(mockClientY)
  })
})
