import { inject, Injectable } from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { Topic } from '@onecx/accelerator'
import { UserService } from '@onecx/angular-integration-interface'
import { map, Observable, of, combineLatest, startWith, tap, fromEvent, pairwise, filter, debounceTime } from 'rxjs'

export type MenuMode = 'horizontal' | 'static' | 'overlay' | 'slim' | 'slimplus'

@UntilDestroy()
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly userService = inject(UserService)
  private readonly staticMenuVisible$ = new Topic<{ isVisible: boolean }>('staticMenuVisible', 1)

  private readonly menuMode$: Observable<MenuMode> = this.userService.profile$.pipe(
    map((p) => {
      return (p?.accountSettings?.layoutAndThemeSettings?.menuMode?.toLowerCase() ?? 'static') as
        | 'horizontal'
        | 'static'
        | 'overlay'
        | 'slim'
        | 'slimplus'
    })
  )

  private readonly onResize$: Observable<Event>
  private readonly isMobile$: Observable<boolean>

  constructor() {
    // TODO: Move to some lib to detect mobile
    const mobileBreakpointVar = getComputedStyle(document.documentElement).getPropertyValue('--mobile-break-point')
    this.onResize$ = fromEvent(window, 'resize').pipe(debounceTime(100), untilDestroyed(this))
    this.isMobile$ = this.onResize$.pipe(
      map(() => window.matchMedia(`(max-width: ${mobileBreakpointVar})`).matches),
      // Important: Start with 2 initial values to trigger pairwise for mobile detection on load
      startWith(
        !window.matchMedia(`(max-width: ${mobileBreakpointVar})`).matches,
        window.matchMedia(`(max-width: ${mobileBreakpointVar})`).matches
      )
    )

    // TODO: Move to Shell toggle menu button
    this.isMobile$
      .pipe(
        pairwise(),
        filter(([oldIsMobile, newIsMobile]) => {
          return oldIsMobile !== newIsMobile
        }),
        map(([, isMobile]) => ({ isVisible: !isMobile }))
      )
      .subscribe((state) => this.staticMenuVisible$.publish(state))
  }

  public isMenuActive(menuMode: MenuMode): Observable<boolean> {
    return combineLatest([this.isMobile$, this.menuMode$]).pipe(
      map(([isMobile, userSelectedMenuMode]) => {
        if (isMobile) {
          return this.isMenuModeActiveInMobile(menuMode, userSelectedMenuMode)
        }
        return menuMode === userSelectedMenuMode
      })
    )
  }

  public isVisible(menuMode: MenuMode): Observable<boolean> {
    if (menuMode === 'static') {
      return this.staticMenuVisible$.pipe(
        map((state) => state.isVisible),
        startWith(true)
      )
    }
    return of(true)
  }

  private isMenuModeActiveInMobile(menuMode: MenuMode, userSelectedMenuMode: MenuMode): boolean {
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
