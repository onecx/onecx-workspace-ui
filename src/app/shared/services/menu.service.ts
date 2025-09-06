import { inject, Injectable } from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { isMobile, Topic } from '@onecx/accelerator'
import { Capability, ShellCapabilityService, UserService } from '@onecx/angular-integration-interface'
import { map, Observable, of, combineLatest, startWith } from 'rxjs'

export type MenuMode = 'horizontal' | 'static' | 'overlay' | 'slim' | 'slimplus'

@UntilDestroy()
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly userService = inject(UserService)
  private capabilityService = inject(ShellCapabilityService)
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

  private readonly isMobile$: Observable<boolean>

  constructor() {
    this.isMobile$ = isMobile().pipe(untilDestroyed(this))
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
      if (this.capabilityService.hasCapability(Capability.PUBLISH_STATIC_MENU_VISIBILITY))
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
