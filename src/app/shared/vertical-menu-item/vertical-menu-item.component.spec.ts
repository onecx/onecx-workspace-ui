import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { By } from '@angular/platform-browser'
import { MenuItem } from 'primeng/api'
import { Tooltip } from 'primeng/tooltip'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { VerticalMenuItemComponent } from './vertical-menu-item.component'

// Host component. The component under test uses *signal* inputs (`input<T>()`),
// which are read-only and cannot be assigned directly (e.g. `component.item = ...`
// fails to compile). We therefore drive them through template bindings on a host
// component and mutate the host's signals to re-render.
@Component({
  selector: 'app-vertical-menu-item-test-host',
  standalone: true,
  imports: [VerticalMenuItemComponent],
  template: `
    <app-vertical-menu-item
      [item]="item()"
      [id]="id()"
      [styleClass]="styleClass()"
      [styleClassIcon]="styleClassIcon()"
      [styleClassLabel]="styleClassLabel()"
      [title]="title()"
    />
  `
})
class TestHostComponent {
  item = signal<MenuItem | undefined>(undefined)
  id = signal<string | undefined>(undefined)
  styleClass = signal<string | undefined>(undefined)
  styleClassIcon = signal<string | undefined>(undefined)
  styleClassLabel = signal<string | undefined>(undefined)
  title = signal<string | undefined>(undefined)
}

function setItem(fixture: ComponentFixture<TestHostComponent>, item: MenuItem | undefined) {
  fixture.componentInstance.item.set(item)
  fixture.detectChanges()
}

fdescribe('VerticalMenuItemComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>
  let host: TestHostComponent
  let router: Router

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        VerticalMenuItemComponent,
        TestHostComponent,
        TranslateTestingModule.withTranslations({ en: {} }).withDefaultLanguage('en')
      ],
      providers: [provideRouter([])]
    })

    router = TestBed.inject(Router)
    fixture = TestBed.createComponent(TestHostComponent)
    host = fixture.componentInstance
    fixture.detectChanges()
  })

  /** The rendered root element: an <a> for routerLink/url/command items, a <div> otherwise. */
  function rootElement(): HTMLElement {
    const el = fixture.debugElement.query(By.css('app-vertical-menu-item')).nativeElement
    return el.querySelector('a') ?? el.querySelector('div')
  }

  describe('rendering', () => {
    it('should be created', () => {
      expect(fixture).toBeTruthy()
      expect(host).toBeTruthy()
    })

    it('should render nothing when item is undefined', () => {
      expect(rootElement()).toBeNull()
    })

    it('should render a routerLink item as an anchor with the label', () => {
      setItem(fixture, { routerLink: ['detail', '1'], label: 'Detail', icon: 'pi-user' })

      const anchor = rootElement() as HTMLAnchorElement
      expect(anchor.tagName).toBe('A')
      expect(anchor.textContent?.trim()).toContain('Detail')
      // A routerLink anchor is handled by SafeLinkDirective; it does not render an href.
      expect(anchor.hasAttribute('href')).toBeFalse()
    })

    it('should render a url item as an anchor with the href', () => {
      setItem(fixture, { url: 'https://example.com', label: 'Home', icon: 'pi-home' })

      const anchor = rootElement() as HTMLAnchorElement
      expect(anchor.tagName).toBe('A')
      expect(anchor.getAttribute('href')).toBe('https://example.com')
      expect(anchor.textContent?.trim()).toContain('Home')
    })

    it('should render a command item as an anchor without href or routerLink', () => {
      const command = jasmine.createSpy('command')
      setItem(fixture, { command, label: 'Action' })

      const anchor = rootElement() as HTMLAnchorElement
      expect(anchor.tagName).toBe('A')
      expect(anchor.hasAttribute('href')).toBeFalse()
    })

    it('should render a plain item as a div with the label', () => {
      setItem(fixture, { label: 'Section', icon: 'pi-folder' })

      const el = rootElement()
      expect(el.tagName).toBe('DIV')
      expect(el.textContent).toContain('Section')
    })

    it('should not render an icon span when the item has no icon', () => {
      setItem(fixture, { label: 'No icon' })
      expect(rootElement().querySelector('span.mr-2')).toBeNull()
    })
  })

  describe('icon & label styling', () => {
    it('should render the icon with the icon class and the mr-2 spacer', () => {
      setItem(fixture, { label: 'Detail', icon: 'pi-user' })
      const icon = rootElement().querySelector('span.mr-2') as HTMLElement
      expect(icon.classList).toContain('pi-user')
    })

    it('should add the styleClassIcon to the icon span', () => {
      host.styleClassIcon.set('text-warning')
      setItem(fixture, { label: 'Detail', icon: 'pi-user' })
      const icon = rootElement().querySelector('span.mr-2') as HTMLElement
      expect(icon.classList).toContain('text-warning')
      expect(icon.classList).toContain('pi-user')
    })

    it('should add the styleClassLabel to the label span', () => {
      host.styleClassLabel.set('font-bold')
      setItem(fixture, { label: 'Detail' })
      const spans = Array.from(rootElement().querySelectorAll('span'))
      expect(spans.some((s) => s.classList.contains('font-bold') && s.textContent?.trim() === 'Detail')).toBeTrue()
    })

    it('should add the styleClass to the root element', () => {
      host.styleClass.set('bg-gray-100')
      setItem(fixture, { label: 'Detail' })
      expect(rootElement().classList).toContain('bg-gray-100')
      // general look&feel of the menu item is always applied
      expect(rootElement().classList).toContain('ocx-menu-item')
    })
  })

  describe('id', () => {
    // For routerLink/url/command items the [id] binding lands on the root <a>.
    it('should use the item id when no id input is given', () => {
      setItem(fixture, { routerLink: 'detail', label: 'Detail', id: 'item-1' })
      expect(rootElement().id).toBe('item-1')
    })

    it('should prefer the id input over the item id', () => {
      host.id.set('input-id')
      setItem(fixture, { routerLink: 'detail', label: 'Detail', id: 'item-1' })
      expect(rootElement().id).toBe('input-id')
    })

    it('should place the id on the inner span for a plain item', () => {
      setItem(fixture, { label: 'Detail', id: 'plain-item' })
      // plain items render a <div> root; the id sits on the inner flex <span>
      expect(rootElement().id).toBe('')
      expect(rootElement().querySelector('span[id]')?.id).toBe('plain-item')
    })
  })

  describe('tooltip', () => {
    // The PrimeNG tooltip is a hover-rendered portal: it writes no DOM attribute at
    // detect time. The template binds [pTooltip]="title() ?? itm.tooltip ?? ''", so we
    // read the bound `content` off the Tooltip directive to verify the precedence.
    function tooltipContent(): string {
      // The template always binds a string; `content` is also typed as a possible TemplateRef.
      return String(fixture.debugElement.query(By.directive(Tooltip)).injector.get(Tooltip).content)
    }

    it('should prefer the title input over the item tooltip', () => {
      host.title.set('from input')
      setItem(fixture, { label: 'Detail', tooltip: 'from item' })
      expect(tooltipContent()).toBe('from input')
    })

    it('should fall back to the item tooltip when no title input is given', () => {
      setItem(fixture, { label: 'Detail', tooltip: 'from item' })
      expect(tooltipContent()).toBe('from item')
    })

    it('should bind an empty tooltip when neither title nor item tooltip is set', () => {
      setItem(fixture, { label: 'Detail' })
      expect(tooltipContent() ?? '').toBe('')
    })
  })

  describe('chevron (plain items with sub-items)', () => {
    it('should show a right chevron for a collapsed plain item with sub-items', () => {
      setItem(fixture, { label: 'Section', items: [{ label: 'Child' }], expanded: false })
      const el = rootElement()
      expect(el.querySelector('.pi-chevron-right')).toBeTruthy()
      expect(el.querySelector('.pi-chevron-down')).toBeNull()
    })

    it('should show a down chevron for an expanded plain item with sub-items', () => {
      setItem(fixture, { label: 'Section', items: [{ label: 'Child' }], expanded: true })
      const el = rootElement()
      expect(el.querySelector('.pi-chevron-down')).toBeTruthy()
      expect(el.querySelector('.pi-chevron-right')).toBeNull()
    })

    it('should show no chevron for a plain item without sub-items', () => {
      setItem(fixture, { label: 'Section' })
      const el = rootElement()
      expect(el.querySelector('.pi-chevron-right')).toBeNull()
      expect(el.querySelector('.pi-chevron-down')).toBeNull()
    })
  })

  describe('routerLink navigation', () => {
    it('should navigate with the router when a routerLink item is clicked', () => {
      const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true))
      setItem(fixture, { routerLink: ['detail', '1'], label: 'Detail' })

      ;(rootElement() as HTMLAnchorElement).click()

      expect(navigateSpy).toHaveBeenCalledWith(['detail', '1'])
    })

    it('should open a new tab with the serialized url when target is _blank', () => {
      const createUrlTreeSpy = spyOn(router, 'createUrlTree').and.returnValue({ toString: () => 'url' } as never)
      spyOn(router, 'serializeUrl').and.returnValue('/detail/1')
      const openSpy = spyOn(window, 'open')
      setItem(fixture, { routerLink: 'detail/1', label: 'Detail', target: '_blank' })

      ;(rootElement() as HTMLAnchorElement).click()

      // SafeLinkDirective normalises the link into an array before calling createUrlTree
      expect(createUrlTreeSpy).toHaveBeenCalledWith(['detail/1'])
      expect(openSpy).toHaveBeenCalledWith('/detail/1', '_blank')
    })
  })

  describe('command invocation', () => {
    it('should invoke the command when a command item is clicked', () => {
      const command = jasmine.createSpy('command')
      setItem(fixture, { command, label: 'Action' })

      ;(rootElement() as HTMLAnchorElement).click()

      expect(command).toHaveBeenCalledTimes(1)
      expect(command).toHaveBeenCalledWith({})
    })

    it('should not invoke the command for url or plain items on click', () => {
      // url item: no command attached
      setItem(fixture, { url: 'https://example.com', label: 'Home' })
      expect(rootElement().getAttribute('href')).toBe('https://example.com')

      // plain item: no command attached
      setItem(fixture, { label: 'Section' })
      expect(rootElement().tagName).toBe('DIV')
    })
  })

  // NOTE: the component declares a `clicked` output that is never emitted from the
  // template and is not consumed anywhere in the repo. It is dead code and has no
  // behaviour to assert; consider removing it or wiring it up if it becomes needed.
})
