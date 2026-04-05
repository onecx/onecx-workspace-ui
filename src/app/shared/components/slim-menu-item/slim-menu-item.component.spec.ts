import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideRouter, Router, withDisabledInitialNavigation } from '@angular/router'

import { TestbedHarnessEnvironment } from '@onecx/angular-testing'

import { SlimMenuItemComponent } from './slim-menu-item.component'
import { SlimMenuItemHarness } from './slim-menu-item.component.harness'
import { SlimMenuMode } from '../../model/slim-menu-mode'
import { ItemType } from '../../model/slim-menu-item'

describe('SlimMenuItemComponent', () => {
  let fixture: ComponentFixture<SlimMenuItemComponent>
  let component: SlimMenuItemComponent

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [],
      imports: [SlimMenuItemComponent],
      providers: [
        provideRouter(
          [
            { path: 'route1', component: {} as any },
            { path: 'route2', component: {} as any }
          ],
          withDisabledInitialNavigation()
        )
      ]
    })
    fixture = TestBed.createComponent(SlimMenuItemComponent)
    component = fixture.componentInstance
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should have id', waitForAsync(async () => {
    component.id = 'test_id'
    component.item = {} as any
    fixture.detectChanges()

    const slimItem = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlimMenuItemHarness)
    const host = await slimItem.host()
    expect(await host.getAttribute('id')).toEqual('test_id')
  }))

  it('should not display if item is undefined', waitForAsync(async () => {
    component.item = undefined
    fixture.detectChanges()

    const slimItem = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlimMenuItemHarness)
    const icon = await slimItem.getIcon()
    expect(icon).toBeNull()
  }))

  it('should have active style when active is true', waitForAsync(async () => {
    component.item = {
      active: true
    }
    fixture.detectChanges()

    const slimItem = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlimMenuItemHarness)
    const host = await slimItem.host()
    expect(await host.getAttribute('class')).toContain('slim-menu-list-item-active')
  }))

  it('should have slim plus style when activeMode is SLIM_PLUS', waitForAsync(async () => {
    component.activeMode = SlimMenuMode.SLIM_PLUS
    component.item = {
      active: false
    }
    fixture.detectChanges()

    const slimItem = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlimMenuItemHarness)
    const host = await slimItem.host()
    expect(await host.getAttribute('class')).toContain('slim-menu-list-item-plus')
  }))

  describe('click()', () => {
    it('should click the anchor when an anchor is present', waitForAsync(async () => {
      component.item = {
        routerLink: '/route1',
        label: 'Menu Item 1',
        icon: 'pi pi-home',
        active: false,
        type: ItemType.ROUTER_LINK
      }
      component.activeMode = SlimMenuMode.SLIM
      component.index = 0
      fixture.detectChanges()

      const router = TestBed.inject(Router)
      spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true))

      const slimItem = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlimMenuItemHarness)
      await slimItem.click()

      expect(router.navigateByUrl).toHaveBeenCalled()
    }))

    it('should click the button when no anchor is present', waitForAsync(async () => {
      const command = jasmine.createSpy('command')
      component.item = {
        command,
        label: 'Action Item',
        icon: 'pi pi-cog',
        active: false,
        type: ItemType.ACTION
      }
      component.activeMode = SlimMenuMode.SLIM
      component.index = 0
      fixture.detectChanges()

      const slimItem = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlimMenuItemHarness)
      await slimItem.click()

      expect(command).toHaveBeenCalled()
    }))
  })

  describe('ROUTER_LINK', () => {
    it('should display anchor with icon only in SLIM mode', waitForAsync(async () => {
      component.item = {
        routerLink: '/route1',
        label: 'Menu Item 1',
        icon: 'pi pi-home',
        active: false,
        type: ItemType.ROUTER_LINK
      }
      component.activeMode = SlimMenuMode.SLIM
      component.index = 0
      fixture.detectChanges()

      const slimItem = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlimMenuItemHarness)
      const anchor = await slimItem.getAnchor()
      expect(anchor).toBeTruthy()
      expect(await anchor?.getAttribute('id')).toEqual('ws_slim_vertical_main_menu_item_1_link')
      expect(await anchor?.getAttribute('href')).toEqual('/route1')
      const icon = await slimItem.getIcon()
      expect(icon).toBeTruthy()
      expect(await icon?.getAttribute('class')).toContain('pi pi-home')
      const content = await anchor?.text()
      expect(content).toEqual('')
    }))

    it('should display anchor with icon and label in SLIM_PLUS mode', waitForAsync(async () => {
      component.item = {
        routerLink: '/route2',
        label: 'Menu Item 2',
        icon: 'pi pi-user',
        active: false,
        type: ItemType.ROUTER_LINK
      }
      component.activeMode = SlimMenuMode.SLIM_PLUS
      component.index = 1
      fixture.detectChanges()

      const slimItem = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlimMenuItemHarness)
      const anchor = await slimItem.getAnchor()
      expect(anchor).toBeTruthy()
      expect(await anchor?.getAttribute('id')).toEqual('ws_slim_vertical_main_menu_item_2_link')
      expect(await anchor?.getAttribute('href')).toEqual('/route2')
      const icon = await slimItem.getIcon()
      expect(icon).toBeTruthy()
      expect(await icon?.getAttribute('class')).toContain('pi pi-user')
      const content = await anchor?.text()
      expect(content).toContain('Menu Item 2')
    }))
  })

  describe('URL', () => {
    it('should display anchor with icon only in SLIM mode', waitForAsync(async () => {
      component.item = {
        url: 'https://example.com',
        label: 'External Link',
        icon: 'pi pi-external-link',
        active: false,
        type: ItemType.URL
      }
      component.activeMode = SlimMenuMode.SLIM
      component.index = 2
      fixture.detectChanges()

      const slimItem = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlimMenuItemHarness)
      const anchor = await slimItem.getAnchor()
      expect(anchor).toBeTruthy()
      expect(await anchor?.getAttribute('id')).toEqual('ws_slim_vertical_main_menu_item_3_link')
      expect(await anchor?.getAttribute('href')).toEqual('https://example.com')
      const icon = await slimItem.getIcon()
      expect(icon).toBeTruthy()
      expect(await icon?.getAttribute('class')).toContain('pi pi-external-link')
      const content = await anchor?.text()
      expect(content).toEqual('')
    }))

    it('should display anchor with icon and label in SLIM_PLUS mode', waitForAsync(async () => {
      component.item = {
        url: 'https://example.org',
        label: 'Another Link',
        icon: 'pi pi-globe',
        active: false,
        type: ItemType.URL
      }
      component.activeMode = SlimMenuMode.SLIM_PLUS
      component.index = 3
      fixture.detectChanges()

      const slimItem = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlimMenuItemHarness)
      const anchor = await slimItem.getAnchor()
      expect(anchor).toBeTruthy()
      expect(await anchor?.getAttribute('id')).toEqual('ws_slim_vertical_main_menu_item_4_link')
      expect(await anchor?.getAttribute('href')).toEqual('https://example.org')
      const icon = await slimItem.getIcon()
      expect(icon).toBeTruthy()
      expect(await icon?.getAttribute('class')).toContain('pi pi-globe')
      const content = await anchor?.text()
      expect(content).toContain('Another Link')
    }))
  })

  describe('ACTION', () => {
    it('should display button with icon only in SLIM mode', waitForAsync(async () => {
      const command = () => {
        console.log('Action executed')
      }
      spyOn(console, 'log')
      component.item = {
        command: command,
        label: 'Action Item',
        icon: 'pi pi-cog',
        active: false,
        type: ItemType.ACTION
      }
      component.activeMode = SlimMenuMode.SLIM
      component.index = 4
      fixture.detectChanges()

      const slimItem = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlimMenuItemHarness)
      const button = await slimItem.getButton()
      expect(button).toBeTruthy()
      expect(await button?.getAttribute('id')).toEqual('ws_slim_vertical_main_menu_item_5_button')
      const icon = await slimItem.getIcon()
      expect(icon).toBeTruthy()
      expect(await icon?.getAttribute('class')).toContain('pi pi-cog')
      const content = await button?.text()
      expect(content).toEqual('')

      button?.click()
      expect(console.log).toHaveBeenCalledWith('Action executed')
    }))

    it('should display button with icon and label in SLIM_PLUS mode', waitForAsync(async () => {
      const command = () => {
        console.log('Another action executed')
      }
      spyOn(console, 'log')
      component.item = {
        command: command,
        label: 'Action Plus',
        icon: 'pi pi-wrench',
        active: false,
        type: ItemType.ACTION
      }
      component.activeMode = SlimMenuMode.SLIM_PLUS
      component.index = 5
      fixture.detectChanges()

      const slimItem = await TestbedHarnessEnvironment.harnessForFixture(fixture, SlimMenuItemHarness)
      const button = await slimItem.getButton()
      expect(button).toBeTruthy()
      expect(await button?.getAttribute('id')).toEqual('ws_slim_vertical_main_menu_item_6_button')
      const icon = await slimItem.getIcon()
      expect(icon).toBeTruthy()
      expect(await icon?.getAttribute('class')).toContain('pi pi-wrench')
      const content = await button?.text()
      expect(content).toContain('Action Plus')

      button?.click()
      expect(console.log).toHaveBeenCalledWith('Another action executed')
    }))
  })
})
