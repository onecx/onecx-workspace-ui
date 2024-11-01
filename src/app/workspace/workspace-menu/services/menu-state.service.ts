import { Injectable } from '@angular/core'
import { WorkspaceMenuItem } from 'src/app/shared/generated'

export interface MenuState {
  selectedPortal?: string
  rootFilter: boolean
  showDetails: boolean
  treeMode?: boolean
  treeExpansionState: Map<string, boolean>
  menuTableFilters?: Map<string, string>
  pageSize: number
  workspaceMenuItems?: WorkspaceMenuItem[]
  sortColumn?: { sortField: string; sortOrder: number }
}

@Injectable({
  providedIn: 'root'
})
export class MenuStateService {
  private readonly state: MenuState = {
    pageSize: 0,
    showDetails: false,
    rootFilter: true,
    treeMode: true,
    treeExpansionState: new Map()
  }

  public updateState(data: Partial<MenuState>): void {
    Object.assign(this.state, data)
  }

  public getState() {
    return this.state
  }
}
