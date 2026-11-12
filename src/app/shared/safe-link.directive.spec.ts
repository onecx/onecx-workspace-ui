import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { Router, UrlTree } from '@angular/router'
import { SafeLinkDirective } from './safe-link.directive'

@Component({
  standalone: true,
  imports: [SafeLinkDirective],
  template: `
    <a id="same-window-link" [safeRouterLink]="'/home'" [target]="'_self'">Home</a>
    <a id="new-tab-link" [safeRouterLink]="['/profile', 123]" [target]="'_blank'">Profile</a>
    <a id="empty-link" [safeRouterLink]="''">Empty</a>
  `
})
class TestComponent {}

describe('SafeLinkDirective', () => {
  let fixture: any
  let routerSpy: jasmine.SpyObj<Router>

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl'])

    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [{ provide: Router, useValue: spy }]
    }).compileComponents()

    fixture = TestBed.createComponent(TestComponent)
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>

    routerSpy.createUrlTree.and.returnValue({} as unknown as UrlTree)
    routerSpy.serializeUrl.and.returnValue('/profile/123')

    fixture.detectChanges()
  })

  it('should navigate in the same window when target is _self', () => {
    const linkEl = fixture.debugElement.query(By.css('#same-window-link'))
    const event = new MouseEvent('click', { cancelable: true })

    linkEl.triggerEventHandler('click', event)

    expect(event.defaultPrevented).toBeTrue()
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home'])
  })

  it('should open a new tab when target is _blank', () => {
    spyOn(window, 'open')

    const linkEl = fixture.debugElement.query(By.css('#new-tab-link'))
    const event = new MouseEvent('click', { cancelable: true })

    linkEl.triggerEventHandler('click', event)

    expect(event.defaultPrevented).toBeTrue()
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/profile', 123])
    expect(window.open).toHaveBeenCalledWith('/profile/123', '_blank')
    expect(routerSpy.navigate).not.toHaveBeenCalled()
  })

  it('should cancel navigation when no valid link is provided', () => {
    const linkEl = fixture.debugElement.query(By.css('#empty-link'))
    const event = new MouseEvent('click', { cancelable: true })

    linkEl.triggerEventHandler('click', event)

    expect(event.defaultPrevented).toBeFalse()
    expect(routerSpy.navigate).not.toHaveBeenCalled()
  })
})
