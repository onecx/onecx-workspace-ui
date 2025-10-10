import { inject, Injectable } from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { Capability, ShellCapabilityService, UserService } from '@onecx/angular-integration-interface'
import {
  map,
  Observable,
  of,
  combineLatest,
  startWith,
  fromEvent,
  debounceTime,
  pairwise,
  filter,
  mergeMap,
  distinctUntilChanged,
  shareReplay,
  Subject
} from 'rxjs'
import { StaticMenuStateTopic } from '../topics/static-menu-state.topic'

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
  private staticMenuState$ = new StaticMenuStateTopic()

  private readonly menuMode$: Observable<MenuMode> = this.userService.profile$.pipe(
    map((p) => {
      return (p?.accountSettings?.layoutAndThemeSettings?.menuMode?.toLowerCase() ?? 'static') as MenuMode
    })
  )

  private readonly onResize$: Observable<Event>
  private isMobile$: Observable<boolean>
  private isMobileDistinct$: Observable<boolean>

  constructor() {
    const mobileBreakpointVar = getComputedStyle(document.documentElement).getPropertyValue('--mobile-break-point')

    this.onResize$ = fromEvent(window, 'resize').pipe(
      // Debounce to avoid excessive emissions during window resizing
      debounceTime(100),
      untilDestroyed(this)
    )

    this.isMobile$ = this.onResize$.pipe(
      map(() => window.matchMedia(`(max-width: ${mobileBreakpointVar})`).matches),
      // Force first value emission for pairwise operator
      startWith(
        !window.matchMedia(`(max-width: ${mobileBreakpointVar})`).matches,
        window.matchMedia(`(max-width: ${mobileBreakpointVar})`).matches
      )
    )

    this.isMobileDistinct$ = this.isMobile$.pipe(
      pairwise(),
      filter(([oldIsMobile, newIsMobile]) => {
        return oldIsMobile !== newIsMobile
      }),
      map(([, isMobile]) => isMobile)
    )

    combineLatest([this.isMobileDistinct$, this.menuMode$]).subscribe(([isMobile, userSelctedMenuMode]) => {
      this.handleViewportChange(userSelctedMenuMode, isMobile)
    })
  }

  /**
   * Compares the specified menu mode with the user's selected menu mode and determines if it is active based on viewport size.
   * @param menuMode Menu mode to check if it is active
   * @returns Observable that emits true if the specified menu mode is active, false otherwise
   */
  public isActive(menuMode: MenuMode): Observable<boolean> {
    return combineLatest([this.isMobileDistinct$, this.menuMode$]).pipe(
      mergeMap(([isMobile, userSelectedMenuMode]) => {
        switch (userSelectedMenuMode) {
          case 'horizontal':
            return this.isMenuModeActiveForHorizontalMode(menuMode, isMobile)
          case 'static':
            return this.isMenuModeActiveForStaticMode(menuMode, isMobile)
          default:
            return of(menuMode === userSelectedMenuMode)
        }
      }),
      // Set timeout for returning the active state to allow visibility state to be updated first
      // Setting timeout without delay makes sure that the emitting of this value is scheduled after the processing of new value of the topic
      mergeMap((isActive) => {
        const s = new Subject<boolean>()
        setTimeout(() => {
          s.next(isActive)
          s.complete()
        })
        return s.asObservable()
      })
    )
  }

  private isMenuModeActiveForHorizontalMode(menuMode: MenuMode, isMobile: boolean): Observable<boolean> {
    if (isMobile) {
      if (menuMode === 'horizontal') {
        return of(false)
      }

      if (menuMode === 'static') {
        return of(true)
      }
    }

    return of(menuMode === 'horizontal')
  }

  private isMenuModeActiveForStaticMode(menuMode: MenuMode, isMobile: boolean): Observable<boolean> {
    return of(menuMode === 'static')
  }

  /**
   * Determines if the specified menu mode is visible.
   * @param menuMode Menu mode to check visibility for
   * @returns Observable that emits true if the menu mode is visible, false otherwise
   */
  public isVisible(menuMode: MenuMode): Observable<boolean> {
    switch (menuMode) {
      case 'horizontal':
        return this.isHorizontalMenuVisible()
      case 'static':
        return this.isStaticMenuVisible()
      default:
        return of(true)
    }
  }

  private isHorizontalMenuVisible(): Observable<boolean> {
    return of(true)
  }

  private isStaticMenuVisible(): Observable<boolean> {
    if (this.capabilityService.hasCapability(Capability.ACTIVENESS_AWARE_MENUS)) {
      return this.staticMenuState$.pipe(
        distinctUntilChanged((prevState, currState) => prevState.isVisible === currState.isVisible),
        map((state) => state.isVisible),
        shareReplay(1)
      )
    }

    return of(true)
  }

  private handleViewportChange(userSelectedMenuMode: MenuMode, isMobile: boolean): void {
    switch (userSelectedMenuMode) {
      case 'horizontal':
        return this.handleHorizontalMenuViewportChange(isMobile)
      case 'static':
        return this.handleStaticMenuViewportChange(isMobile)
      default:
        return
    }
  }

  private handleHorizontalMenuViewportChange(isMobile: boolean): void {
    this.staticMenuState$.publish({ isVisible: !isMobile })
  }

  private handleStaticMenuViewportChange(isMobile: boolean): void {
    this.staticMenuState$.publish({ isVisible: !isMobile })
  }
}
