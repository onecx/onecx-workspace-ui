import { Injectable } from '@angular/core'
import { UserWorkspaceMenuItem } from '../generated'
import { MenuItem } from 'primeng/api'

@Injectable({ providedIn: 'root' })
export class MenuItemService {
  public constructMenuItems(userWorkspaceMenuItem: UserWorkspaceMenuItem[] | undefined, userLang: string): MenuItem[] {
    const workspaceMenuItems = userWorkspaceMenuItem?.filter((i) => i) // exclude undefined
    if (workspaceMenuItems) {
      workspaceMenuItems.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      const menuItems = workspaceMenuItems.filter((i) => !i.disabled).map((item) => this.mapMenuItem(item, userLang))
      return menuItems
    } else {
      return []
    }
  }

  findActiveItemBestMatch(
    items: MenuItem[],
    path: string
  ): { item: MenuItem; parents: MenuItem[]; matchedSegments: number } | undefined {
    const pathToMatch = this.stripPath(path)
    let bestMatch: { item: MenuItem; parents: MenuItem[]; matchedSegments: number } | undefined = undefined

    for (const item of items) {
      if (item.routerLink) {
        const itemPath = this.stripPath(item.routerLink)
        if (itemPath === pathToMatch) {
          return { item: item, parents: [], matchedSegments: this.countSegments(this.stripPath(pathToMatch)) }
        } else if (itemPath && pathToMatch.includes(itemPath)) {
          const matchedSegments =
            this.countSegments(pathToMatch) + this.countSegments(this.stripPath(pathToMatch.replace(itemPath, '')))
          if ((bestMatch?.matchedSegments || 0) < matchedSegments) {
            bestMatch = {
              item: item,
              parents: [],
              matchedSegments: matchedSegments
            }
          }
        }
      }

      if (item.items) {
        const bestChildMatch = this.findActiveItemBestMatch(item.items, pathToMatch)
        if (bestChildMatch && bestChildMatch.matchedSegments > (bestMatch?.matchedSegments || 0)) {
          bestMatch = {
            item: bestChildMatch.item,
            parents: [...bestChildMatch.parents, item],
            matchedSegments: bestChildMatch.matchedSegments
          }
        }
      }
    }

    return bestMatch
  }

  flatMenuItems(items: MenuItem[]): MenuItem[] {
    return items.flatMap((item) => ([] as MenuItem[]).concat(item, this.flatMenuItems(item.items ?? [])))
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

  private stripPath(path: string): string {
    return path.slice(path.at(0) === '/' ? 1 : 0, path.at(-1) === '/' ? -1 : path.length)
  }

  private countSegments(path: string): number {
    return path.split('/').length
  }

  private replaceUrlVariables(url: string | undefined): string | undefined {
    if (!url) {
      return
    }
    return url.replaceAll(
      /\[\[(.+?)\]\]/g, //NOSONAR
      (_match, $1) => {
        return sessionStorage.getItem($1) ?? localStorage.getItem($1) ?? ''
      }
    )
  }
}
