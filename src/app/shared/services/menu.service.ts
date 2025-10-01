import { inject, Injectable } from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { Capability, ShellCapabilityService, UserService } from '@onecx/angular-integration-interface'
import { StaticMenuVisibleTopic } from '@onecx/integration-interface'
import { map, Observable, of, combineLatest, startWith, fromEvent, debounceTime } from 'rxjs'

export type MenuMode = 'horizontal' | 'static' | 'overlay' | 'slim' | 'slimplus'

/**
 * Service to manage menu state such as visibility and active mode.
 * The service uses user profile settings and window size to determine the current menu state.
 *
 * Usage:
 *
 * ```typescript
 * constructor(private menuService: MenuService) {}
 *
 * this.menuService.isActive('horizontal').subscribe(isActive => {
 *   // Handle active state
 * });
 *
 * this.menuService.isVisible('static').subscribe(isVisible => {
 *   // Handle visibility state
 * });
 * ```
 */
@UntilDestroy()
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly userService = inject(UserService)
  private capabilityService = inject(ShellCapabilityService)
  private staticMenuVisible$ = new StaticMenuVisibleTopic()

  private readonly menuMode$: Observable<MenuMode> = this.userService.profile$.pipe(
    map((p) => {
      return (p?.accountSettings?.layoutAndThemeSettings?.menuMode?.toLowerCase() ?? 'static') as MenuMode
    })
  )

  private readonly onResize$: Observable<Event>
  private isMobile$: Observable<boolean>

  constructor() {
    this.onResize$ = fromEvent(window, 'resize').pipe(debounceTime(100), untilDestroyed(this))
    const mobileBreakpointVar = getComputedStyle(document.documentElement).getPropertyValue('--mobile-break-point')
    this.isMobile$ = this.onResize$.pipe(
      map(() => window.matchMedia(`(max-width: ${mobileBreakpointVar})`).matches),
      startWith(
        !window.matchMedia(`(max-width: ${mobileBreakpointVar})`).matches,
        window.matchMedia(`(max-width: ${mobileBreakpointVar})`).matches
      )
    )
  }

  public isActive(menuMode: MenuMode): Observable<boolean> {
    return combineLatest([this.isMobile$, this.menuMode$]).pipe(
      map(([isMobile, userSelectedMenuMode]) => {
        if (isMobile) {
          return this.isActiveOnMobile(menuMode, userSelectedMenuMode)
        }
        return menuMode === userSelectedMenuMode
      })
    )
  }

  public isVisible(menuMode: MenuMode): Observable<boolean> {
    if (menuMode === 'static') {
      if (this.capabilityService.hasCapability(Capability.PUBLISH_STATIC_MENU_VISIBILITY))
        return this.staticMenuVisible$.pipe(
          map((state) => state.isVisible),
          startWith(true)
        )
    }
    return of(true)
  }

  private isActiveOnMobile(menuMode: MenuMode, userSelectedMenuMode: MenuMode): boolean {
    // Disable horizontal menu in mobile
    if (menuMode === 'horizontal' && userSelectedMenuMode === 'horizontal') {
      return false
    }
    // Enable static menu in mobile when horizontal menu is selected
    if (menuMode === 'static' && userSelectedMenuMode === 'horizontal') {
      return true
    }

    return menuMode === userSelectedMenuMode
  }
}
