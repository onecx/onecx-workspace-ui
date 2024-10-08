import { Injectable } from '@angular/core'
import { UserWorkspaceMenuItem } from '../generated'
import { MenuItem } from 'primeng/api'

@Injectable({ providedIn: 'root' })
export class MenuItemService {
  public constructMenuItems(userWorkspaceMenuItem: UserWorkspaceMenuItem[] | undefined, userLang: string): MenuItem[] {
    const menuItems = userWorkspaceMenuItem?.filter((i) => i) // exclude undefined
    if (menuItems) {
      menuItems.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      return menuItems.filter((i) => !i.disabled).map((item) => this.mapMenuItem(item, userLang))
    } else {
      return []
    }
  }

  /** Item is never undefined when filtered out in constructMenuItems() */
  private mapMenuItem(item: UserWorkspaceMenuItem, userLang: string): MenuItem {
    const isLocal: boolean = !item.external
    const label: string | undefined = item.i18n ? item.i18n[userLang] || item.name : ''

    if (item.children && item.children.length > 0) {
      // separated due to sonar
      item.children.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    }
    return {
      id: item.key,
      items:
        item.children && item.children.length > 0
          ? item.children.filter((i) => !i.disabled).map((i) => this.mapMenuItem(i, userLang))
          : undefined,
      label,
      icon: item.badge ? 'pi pi-' + item.badge : undefined,
      routerLink: isLocal ? this.stripBaseHref(item.url) : undefined,
      url: isLocal ? undefined : this.replaceUrlVariables(item.url)
    }
  }

  private stripBaseHref(url: string | undefined): string | undefined {
    const basePath = document.getElementsByTagName('base')[0]?.href
    const baseUrl = new URL(basePath, window.location.origin).toString()
    return url?.replace(baseUrl, '')
  }

  private replaceUrlVariables(url: string | undefined): string | undefined {
    if (!url) {
      return
    }
    return url.replace(/\[\[.+\]\]/, (match) => {
      match = match.trim().substring(2, match.length - 2)
      return sessionStorage.getItem(match) ?? localStorage.getItem(match) ?? ''
    })
  }
}
