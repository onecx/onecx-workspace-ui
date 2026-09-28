import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { Router, UrlTree } from '@angular/router'
import { SafeLinkDirective } from './safe-link.directive'
// 1. Die Test-Komponente muss ganz oben stehen, damit die IDE den Typen unten bereits kennt!
@Component({
  standalone: true,
  imports: [SafeLinkDirective],
  template: ``
})
class TestComponent {}
describe('SafeLinkDirective', () => {
  // Jetzt kennt TypeScript 'TestComponent' fehlerfrei
  let fixture: ComponentFixture
  let routerSpy: jasmine.SpyObj
  beforeEach(async () => {
    const spy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl'])
    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [{ provide: Router, useValue: spy }]
    }).compileComponents()

    fixture = TestBed.createComponent(TestComponent)
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>

    // Typensicherer Mock für den UrlTree, um die IDE glücklich zu machen
    routerSpy.createUrlTree.and.returnValue({} as UrlTree)
    routerSpy.serializeUrl.and.returnValue('/profile/123')

    fixture.detectChanges()
  })
  it('sollte im selben Fenster navigieren, wenn target _self ist', () => {
    const linkEl = fixture.debugElement.query(By.css('#same-window-link'))
    const event = new MouseEvent('click', { cancelable: true })
    linkEl.triggerEventHandler('click', event)
    expect(event.defaultPrevented).toBeTrue()
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home'])
  })
  it('sollte einen neuen Tab öffnen, wenn target _blank ist', () => {
    spyOn(window, 'open')
    const linkEl = fixture.debugElement.query(By.css('#new-tab-link'))
    const event = new MouseEvent('click', { cancelable: true })
    linkEl.triggerEventHandler('click', event)

    expect(event.defaultPrevented).toBeTrue()
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/profile', 123])
    expect(window.open).toHaveBeenCalledWith('/profile/123', '_blank')
    expect(routerSpy.navigate).not.toHaveBeenCalled()
  })
  it('sollte die Navigation abbrechen, wenn kein gültiger Link übergeben wurde', () => {
    const linkEl = fixture.debugElement.query(By.css('#empty-link'))
    const event = new MouseEvent('click', { cancelable: true })
    linkEl.triggerEventHandler('click', event)
    expect(event.defaultPrevented).toBeFalse()
    expect(routerSpy.navigate).not.toHaveBeenCalled()
  })
})
