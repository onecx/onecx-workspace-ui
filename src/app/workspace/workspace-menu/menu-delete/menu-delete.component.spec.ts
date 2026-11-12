import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { MenuItemAPIService, WorkspaceMenuItem } from 'src/app/shared/generated'
import { MenuDeleteComponent } from './menu-delete.component'

describe('MenuDeleteComponent', () => {
  let component: MenuDeleteComponent
  let fixture: ComponentFixture<MenuDeleteComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const menuApiServiceSpy = {
    deleteMenuItemById: jasmine.createSpy('deleteMenuItemById').and.returnValue(of({}))
  }

  const menuItemOrg: WorkspaceMenuItem = {
    id: 'id1',
    key: 'key',
    name: 'menu name',
    position: 0
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        MenuDeleteComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations(), provideRouter([])]
    })
    // PortalMessageService and MenuItemAPIService use `providedIn: 'any'`, which TestBed
    // providers do not reliably override for standalone components - add providers on the component itself.
    TestBed.overrideComponent(MenuDeleteComponent, {
      add: {
        providers: [
          { provide: PortalMessageService, useValue: msgServiceSpy },
          { provide: MenuItemAPIService, useValue: menuApiServiceSpy }
        ]
      }
    })
    TestBed.compileComponents()

    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    menuApiServiceSpy.deleteMenuItemById.calls.reset()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuDeleteComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('Closing dialog', () => {
    it('should emit false when onCloseDialog is called', () => {
      spyOn(component.dataChanged, 'emit')

      component.onCloseDialog()

      expect(component.dataChanged.emit).toHaveBeenCalledWith(false)
    })
  })

  describe('deletion', () => {
    it('should delete menu item', () => {
      menuApiServiceSpy.deleteMenuItemById({ menuItemId: 'id' })
      component.menuItemOrg = menuItemOrg

      component.onMenuDelete()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MENU.MESSAGE.OK' })
    })

    it('should fall back to empty menu item id when no menuItemOrg is set', () => {
      component.menuItemOrg = undefined

      component.onMenuDelete()

      expect(menuApiServiceSpy.deleteMenuItemById).toHaveBeenCalledWith({ menuItemId: '' })
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MENU.MESSAGE.OK' })
    })

    it('should display error message on delete menu item', () => {
      const errorResponse = { status: 400, statusText: 'Error on deleting a menu item' }
      menuApiServiceSpy.deleteMenuItemById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component.menuItemOrg = menuItemOrg

      component.onMenuDelete()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MENU.MESSAGE.NOK' })
      expect(console.error).toHaveBeenCalledWith('deleteMenuItemById', errorResponse)
    })
  })
})
