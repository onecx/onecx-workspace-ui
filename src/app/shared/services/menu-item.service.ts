import { Injectable } from '@angular/core'
import { UserWorkspaceMenuItem } from '../generated'
import { MenuItem } from 'primeng/api'

@Injectable({ providedIn: 'root' })
export class MenuItemService {
  public constructMenuItems(userWorkspaceMenuItem: UserWorkspaceMenuItem[] | undefined, userLang: string): MenuItem[] {
    const menuItems = userWorkspaceMenuItem?.filter((item) => {
      return item
    })
    if (menuItems) {
      return menuItems
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .filter((i) => i)
        .map((item) => this.mapMenuItem(item, userLang))
    } else {
      return []
    }
  }

  private mapMenuItem(item: UserWorkspaceMenuItem | undefined, userLang: string): MenuItem {
    let isLocal: boolean
    let label: string | undefined

    if (item) {
      isLocal = !item.external
      label = item.i18n ? item.i18n[userLang] || item.name : ''

      return {
        id: item.key,
        items:
          item.children && item.children.length > 0
            ? item.children
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                .filter((i) => i)
                .map((i) => this.mapMenuItem(i, userLang))
            : undefined,
        label,
        icon: item.badge ? 'pi pi-' + item.badge : undefined,
        routerLink: isLocal ? this.stripBaseHref(item.url) : undefined,
        url: isLocal ? undefined : item.url
      }
    } else {
      return {}
    }
  }

  private stripBaseHref(url: string | undefined): string | undefined {
    const basePath = document.getElementsByTagName('base')[0]?.href
    const baseUrl = new URL(basePath, window.location.origin).toString()
    return url?.replace(baseUrl, '')
  }
}
