import { CommonModule } from '@angular/common'
import { Component, Input, OnInit } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { NavigationEnd, Router, RouterModule } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { PortalUIService } from '@onecx/portal-integration-angular'
import { MenuItem } from 'primeng/api'
import { TooltipModule } from 'primeng/tooltip'
import { filter } from 'rxjs'

@Component({
  selector: 'app-sub-menu',
  standalone: true,
  templateUrl: './sub-menu.component.html',
  styleUrls: ['./sub-menu.component.scss'],
  imports: [CommonModule, RouterModule, TooltipModule]
})
@UntilDestroy()
export class SubMenuComponent implements OnInit {
  @Input() item!: MenuItem

  @Input() index!: number

  @Input() root = false

  @Input() parentKey: string | undefined

  @Input() active = false
  type: 'parent' | 'routerLink' | 'href' | 'command' | 'label' = 'label'

  constructor(public router: Router, public uiConfig: PortalUIService, private sanitizer: DomSanitizer) {
    this.router.events
      .pipe(untilDestroyed(this))
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.uiConfig.isHorizontal || this.uiConfig.isSlim) {
          this.active = false
        } else {
          if (this.type === 'routerLink' || this.type === 'parent') {
            this.updateActiveStateFromRoute()
          } else {
            this.active = false
          }
        }
      })
  }

  ngOnInit() {
    this.type = this.getItemType(this.item)
    if (!(this.uiConfig.isHorizontal || this.uiConfig.isSlim) && this.item.routerLink) {
      this.updateActiveStateFromRoute()
    }
  }

  sanitize(url?: string) {
    if (url) {
      return this.sanitizer.bypassSecurityTrustUrl(url)
    } else {
      return url
    }
  }

  updateActiveStateFromRoute() {
    this.active = this.isSelfOrChildActive(this.item)
  }

  getItemType(item: MenuItem): 'parent' | 'routerLink' | 'href' | 'command' | 'label' {
    if (item.items && item.items.length > 0) {
      return 'parent'
    } else if (item.routerLink) {
      return 'routerLink'
    } else if (item.command) {
      return 'command'
    } else if (item.url) {
      return 'href'
    } else {
      return 'label'
    }
  }

  isSelfOrChildActive(item: MenuItem) {
    const matchMode = 'subset'

    if (this.getItemType(item) === 'parent' && item.items) {
      for (const child of item.items) {
        if (this.isSelfOrChildActive(child)) {
          return true
        }
      }
      return false
    } else {
      let url = item.routerLink || item.url
      if (!url) {
        console.warn(`Item without any url ${item.id} ${item.label}`)
        return false
      }
      url = url.startsWith('/') ? url.substring(1) : url
      url = url.endsWith('/') ? url.substring(0, url.length - 1) : url
      return this.router.isActive(url, {
        paths: matchMode,
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored'
      })
    }
  }

  itemClick(event: Event) {
    // avoid processing disabled items
    if (this.item.disabled) {
      event.preventDefault()
      return
    }

    // navigate with hover in horizontal mode
    if (this.root) {
      this.uiConfig.menuHoverActive = !this.uiConfig.menuHoverActive
    }

    // notify other items
    // this.menuService.onMenuStateChange(this.key)

    // execute command
    if (this.item.command) {
      this.item.command({ originalEvent: event, item: this.item })
    }

    // toggle active state
    if (this.type === 'parent') {
      this.active = !this.active
      event.preventDefault()
      event.stopPropagation()
    } else {
      // activate item
      this.active = true

      // reset horizontal and slim menu
      if (this.uiConfig.isHorizontal || this.uiConfig.isSlim) {
        // this.menuService.reset()
        this.uiConfig.menuHoverActive = false
      }

      if (!this.uiConfig.isStatic) {
        this.uiConfig.menuActive = false
      }

      this.uiConfig.mobileMenuActive = false
    }

    this.removeActiveInk(event)

    // this.changDetectorRef.markForCheck()
  }

  onMouseEnter() {
    // activate item on hover
    if (this.root && (this.uiConfig.isHorizontal || this.uiConfig.isSlim) && this.uiConfig.isDesktop) {
      if (this.uiConfig.menuHoverActive) {
        // this.menuService.onMenuStateChange(this.key)
        this.active = true
      }
    }
  }

  removeActiveInk(event: Event) {
    const currentTarget = event.currentTarget as HTMLElement
    setTimeout(() => {
      if (currentTarget) {
        const activeInk = currentTarget.querySelector('.p-ink-active')
        if (activeInk) {
          if (activeInk.classList) {
            activeInk.classList.remove('p-ink-active')
          } else {
            activeInk.className = activeInk.className.replace(
              new RegExp('(^|\\b)' + 'p-ink-active'.split(' ').join('|') + '(\\b|$)', 'gi'),
              ' '
            )
          }
        }
      }
    }, 401)
  }
}
