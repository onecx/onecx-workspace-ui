import { Injectable } from '@angular/core'
import { Location } from '@angular/common'
import { MenuItem } from 'primeng/api'
import { ItemType, SlimMenuItem } from '../model/slim-menu-item'

import { getLocation } from '@onecx/accelerator'

import { Target, UserWorkspaceMenuItem } from '../generated'

@Injectable({ providedIn: 'root' })
export class MenuItemService {
  public constructMenuItems(
    userWorkspaceMenuItem: UserWorkspaceMenuItem[] | undefined,
    userLang: string,
    workspaceBaseUrl: string | undefined
  ): MenuItem[] {
    const workspaceMenuItems = userWorkspaceMenuItem?.filter((i) => i) // exclude undefined
    if (workspaceMenuItems) {
      workspaceMenuItems.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      const menuItems = workspaceMenuItems
        .filter((i) => !i.disabled)
        .map((item) => this.mapMenuItem(item, userLang, workspaceBaseUrl))
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
      const segments = this.getMatchedSegments(item, pathToMatch)
      if (segments > (bestMatch?.matchedSegments ?? 0)) {
        bestMatch = {
          item: item,
          parents: [],
          matchedSegments: segments
        }
      }

      if (item.items) {
        const bestChildMatch = this.findActiveItemBestMatch(item.items, pathToMatch)
        if (bestChildMatch && bestChildMatch.matchedSegments > (bestMatch?.matchedSegments ?? 0)) {
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

  hasAction(item: MenuItem): boolean {
    return !!item.routerLink || !!item.url || !!item.command
  }

  getItemType(item: MenuItem): ItemType | undefined {
    if (item.routerLink) {
      return ItemType.ROUTER_LINK
    }
    if (item.url) {
      return ItemType.URL
    }
    if (item.command) {
      return ItemType.ACTION
    }
    return undefined
  }

  mapMenuItemsToSlimMenuItems(items: MenuItem[], currentUrl?: string): SlimMenuItem[] {
    const actionItems = items.flatMap((item) => [item, ...(item.items ?? [])]).filter((item) => this.hasAction(item))
    const bestMatch = currentUrl ? this.findActiveItemBestMatch(items, currentUrl) : undefined
    return actionItems.map((item) => {
      return {
        active: item === bestMatch?.item,
        type: this.getItemType(item),
        label: item.label ?? item.title,
        icon: item.icon,
        command: item.command,
        routerLink: item.routerLink,
        url: item.url,
        tooltip: item.tooltip ?? item.label ?? item.title
      }
    })
  }

  private getMatchedSegments(item: MenuItem, strippedPath: string): number {
    const itemStrippedPath = item.routerLink ? this.stripPath(item.routerLink) : undefined
    if (itemStrippedPath && itemStrippedPath === strippedPath) {
      return this.countSegments(this.stripPath(strippedPath))
    } else if (itemStrippedPath && strippedPath.includes(itemStrippedPath)) {
      const matchedSegments = this.countSegments(itemStrippedPath)
      return matchedSegments
    }
    return 0
  }

  /** Item is never undefined when filtered out in constructMenuItems() */
  private mapMenuItem(item: UserWorkspaceMenuItem, userLang: string, workspaceBaseUrl: string | undefined): MenuItem {
    // is local (stay within Shell)  => use router link
    // is NOT local (leave Shell)    => use URL
    const isLocal: boolean = !item.external
    const label = item.i18n ? (item.i18n[userLang] ?? item.name) : item.name
    let url = this.replaceUrlVariables(item.url)
    let queryParams: { [key: string]: string } | undefined
    let routerUrl: string | undefined

    if (url && isLocal) {
      // separate query parameter if using router link
      const u = new URL(url, 'https://dummy')
      if (u.searchParams.size > 0) queryParams = Object.fromEntries(u.searchParams.entries())
      routerUrl = u.pathname
    }
    // build a complete URL for opening in a new TAB
    if (url && item.target === Target.Blank && !/^(http|https):\/\/.{6,245}$/.exec(url)) {
      url = Location.joinWithSlash(
        Location.joinWithSlash(getLocation().origin, getLocation().deploymentPath),
        Location.joinWithSlash(workspaceBaseUrl!, url)
      )
    }
    if (item.children && item.children.length > 0) {
      item.children.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    }

    return {
      id: item.key?.toLocaleLowerCase(),
      label: label,
      items:
        item.children && item.children.length > 0
          ? item.children.filter((i) => !i.disabled).map((i) => this.mapMenuItem(i, userLang, workspaceBaseUrl))
          : undefined,
      icon: item.badge ? 'pi pi-' + item.badge : undefined,
      target: item.target,
      routerLink: isLocal ? this.stripBaseHref(routerUrl) : undefined,
      queryParams: queryParams,
      url: isLocal ? undefined : this.stripBaseHref(url)
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
    return url?.replaceAll(
      /\[\[(.+?)\]\]/g, //NOSONAR
      (_match, $1) => {
        return sessionStorage.getItem($1) ?? localStorage.getItem($1) ?? ''
      }
    )
  }
}
