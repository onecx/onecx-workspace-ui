import { Injectable } from '@angular/core'
import { UserWorkspaceMenuItem } from '../generated'
import { MenuItem } from 'primeng/api'

@Injectable({ providedIn: 'root' })
export class MenuItemService {
  public constructMenuItems(
    userWorkspaceMenuItem: UserWorkspaceMenuItem[] | undefined,
    userLang: string,
    currentMfePath?: string
  ): MenuItem[] {
    const workspaceMenuItems = userWorkspaceMenuItem?.filter((i) => i) // exclude undefined
    if (workspaceMenuItems) {
      workspaceMenuItems.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      const menuItems = workspaceMenuItems.filter((i) => !i.disabled).map((item) => this.mapMenuItem(item, userLang))
      const mfePath = this.stripPath(currentMfePath)
      mfePath && this.expandCurrentMfeMenuItems(menuItems, mfePath)
      return menuItems
    } else {
      return []
    }
  }

  /** Item is never undefined when filtered out in constructMenuItems() */
  private mapMenuItem(item: UserWorkspaceMenuItem, userLang: string): MenuItem {
    const isLocal: boolean = !item.external
    const label: string | undefined = item.i18n ? (item.i18n[userLang] ?? item.name) : item.name

    if (item.children && item.children.length > 0) {
      // separated due to sonar
      item.children.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    }
    return {
      id: item.key,
      label: label,
      items:
        item.children && item.children.length > 0
          ? item.children.filter((i) => !i.disabled).map((i) => this.mapMenuItem(i, userLang))
          : undefined,
      icon: item.badge ? 'pi pi-' + item.badge : undefined,
      routerLink: isLocal ? this.stripBaseHref(item.url) : undefined,
      url: isLocal ? undefined : this.replaceUrlVariables(item.url),
      routerLinkActiveOptions: { exact: true }
    }
  }

  private stripBaseHref(url: string | undefined): string | undefined {
    const basePath = document.getElementsByTagName('base')[0]?.href
    const baseUrl = new URL(basePath, window.location.origin).toString()
    return url?.replace(baseUrl, '')
  }

  private stripPath(path: string | undefined): string | undefined {
    return path?.slice(path.startsWith('/') ? 1 : 0, path[-1] === '/' ? -1 : path.length)
  }

  private expandCurrentMfeMenuItems(items: MenuItem[], currentMfePath: string): boolean {
    let expanded = false
    for (const item of items) {
      if (!expanded)
        if (this.stripPath(item.routerLink) === currentMfePath) expanded = true
        else if (item.items && this.expandCurrentMfeMenuItems(item.items, currentMfePath)) {
          item.expanded = true
          expanded = true
        }
    }
    return expanded
  }

  private replaceUrlVariables(url: string | undefined): string | undefined {
    return url?.replaceAll(
      /\[\[(.+?)\]\]/g, //NOSONAR
      (_match, $1) => {
        return sessionStorage.getItem($1) ?? localStorage.getItem($1) ?? ''
      }
    )
  }
}
