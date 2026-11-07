import { Directive, inject, input, HostListener } from '@angular/core'
import { Router } from '@angular/router'

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'a[safeRouterLink]',
  standalone: true
})
export class SafeLinkDirective {
  private readonly router = inject(Router)

  safeRouterLink = input<string | any[] | undefined | null>(undefined) // Der Router-Link
  target = input<string>('_self')

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    const link = this.safeRouterLink()
    if (!link) return

    event.preventDefault()
    const commands = Array.isArray(link) ? link : [link]

    if (this.target() === '_blank') {
      const urlTree = this.router.createUrlTree(commands)
      const url = this.router.serializeUrl(urlTree)
      window.open(url, '_blank')
    } else {
      this.router.navigate(commands)
    }
  }
}
