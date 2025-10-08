import { NO_ERRORS_SCHEMA } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ToggleButtonModule } from 'primeng/togglebutton'
import { TreeNodeDropEvent, TreeNodeExpandEvent } from 'primeng/tree'

import { PortalMessageService } from '@onecx/angular-integration-interface'
import { MenuPreviewComponent } from './menu-preview.component'
import { MenuTreeService } from '../services/menu-tree.service'
import { MenuStateService, MenuState } from '../services/menu-state.service'
import { MenuItemAPIService } from 'src/app/shared/generated'
import { of, throwError } from 'rxjs'

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
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const menuApiService = {
    updateMenuItemParent: jasmine.createSpy('updateMenuItemParent').and.returnValue(of({}))
  }

  function initTestComponent(): void {
    fixture = TestBed.createComponent(MenuPreviewComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MenuPreviewComponent],
      imports: [
        ToggleButtonModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', component: MenuPreviewComponent }]),
        { provide: MenuTreeService, useValue: treeServiceSpy },
        { provide: MenuStateService, useValue: stateServiceSpy },
        { provide: MenuItemAPIService, useValue: menuApiService },
        { provide: PortalMessageService, useValue: msgServiceSpy }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    treeServiceSpy.calculateNewNodesPositions.calls.reset()
    stateServiceSpy.getState.calls.reset()
    menuApiService.updateMenuItemParent.calls.reset()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()

    initTestComponent()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnChanges', () => {
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
  })

  describe('on Drop', () => {
    it('should update menu item - drag on node', () => {
      menuApiService.updateMenuItemParent.and.returnValue(of({}))
      spyOn(component.reorderEmitter, 'emit')
      const event: TreeNodeDropEvent = {
        dropPoint: 'node',
        index: 1,
        dragNode: { key: 'draggedNodeId', parent: { key: 'oldParentNodeId' }, data: items[0] },
        dropNode: { key: 'newParentNodeId', children: [{ key: 'draggedNodeId' }], parent: { key: 'parent key' } }
      }

      component.onDrop(event)

      expect(component.reorderEmitter.emit).toHaveBeenCalledWith(true)
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_OK' })
    })

    it('should update menu item - drag between nodes', () => {
      const event: TreeNodeDropEvent = {
        dropPoint: 'between',
        index: 1,
        dragNode: { key: 'draggedNodeId', parent: { key: 'oldParentNodeId' }, data: items[0] },
        dropNode: { key: 'newParentNodeId', children: [{ key: 'draggedNodeId' }], parent: { key: 'parent key' } }
      }
      menuApiService.updateMenuItemParent.and.returnValue(of({}))

      component.onDrop(event)

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_OK' })
    })

    it('should update menu items onDrop: return before pushing items', () => {
      const errorResponse = { status: 400, statusText: 'Error on change parent' }
      const event = {
        dragNode: { key: 'draggedNodeId', parent: { key: 'oldParentNodeId' }, data: items[0] },
        dropNode: { key: 'newParentNodeId', children: [{ key: 'draggedNodeId' }], parent: { key: 'parent key' } }
      }
      menuApiService.updateMenuItemParent.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.onDrop(event)

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.MENU_CHANGE_NOK' })
      expect(console.error).toHaveBeenCalledWith('updateMenuItemParent', errorResponse)
    })
  })

  describe('toggle tree view', () => {
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
      component.menuNodes = [
        { expanded: false, children: [{ key: '1-1', children: [{ key: '1-1-1' }] }] },
        { key: '2' }
      ]

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

    component.onHierarchyViewChange(event as TreeNodeExpandEvent)

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
})
