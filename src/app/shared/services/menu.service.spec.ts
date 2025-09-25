import { MenuService } from './menu.service'
import { TestBed } from '@angular/core/testing'
import {
  FakeTopic,
  provideShellCapabilityServiceMock,
  provideUserServiceMock,
  ShellCapabilityServiceMock,
  UserServiceMock
} from '@onecx/angular-integration-interface/mocks'
import { Capability, UserService } from '@onecx/angular-integration-interface'
import { UserProfile } from '@onecx/integration-interface'
import { BehaviorSubject, of, skip } from 'rxjs'
import { Topic } from '@onecx/accelerator'

describe('MenuService', () => {
  let service: MenuService
  let userServiceMock: UserServiceMock

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MenuService, provideUserServiceMock(), provideShellCapabilityServiceMock()]
    })

    service = TestBed.inject(MenuService)
    userServiceMock = TestBed.inject(UserService) as unknown as UserServiceMock
    service['staticMenuVisible$'] = new FakeTopic() as unknown as Topic<{ isVisible: boolean }>
  })

  describe('visibility', () => {
    it('should be always visible if menu mode is not static', (done) => {
      service.isVisible('overlay').subscribe((isVisible) => {
        expect(isVisible).toBeTrue()
        done()
      })
    })

    it('should be visible if menu mode is static and capability is not present', (done) => {
      ShellCapabilityServiceMock.setCapabilities([])
      service.isVisible('static').subscribe((isVisible) => {
        expect(isVisible).toBeTrue()
        done()
      })
    })

    it('should be visible if menu mode is static and capability is present by default', (done) => {
      ShellCapabilityServiceMock.setCapabilities([Capability.PUBLISH_STATIC_MENU_VISIBILITY])
      service.isVisible('static').subscribe((isVisible) => {
        expect(isVisible).toBeTrue()
        done()
      })
    })

    it('should be visible if menu mode is static and capability is present and menu visibility is true', (done) => {
      ShellCapabilityServiceMock.setCapabilities([Capability.PUBLISH_STATIC_MENU_VISIBILITY])
      service['staticMenuVisible$'].publish({ isVisible: true })
      service
        .isVisible('static')
        // Skip initial value
        .pipe(skip(1))
        .subscribe((isVisible) => {
          expect(isVisible).toBeTrue()
          done()
        })
    })

    it('should be not visible if menu mode is static and capability is present and menu visibility is false', (done) => {
      ShellCapabilityServiceMock.setCapabilities([Capability.PUBLISH_STATIC_MENU_VISIBILITY])
      service['staticMenuVisible$'].publish({ isVisible: false })
      service
        .isVisible('static')
        // Skip initial value
        .pipe(skip(1))
        .subscribe((isVisible) => {
          expect(isVisible).toBeFalse()
          done()
        })
    })

    it('should not be visible after viewport changed to mobile', (done) => {
      ShellCapabilityServiceMock.setCapabilities([Capability.PUBLISH_STATIC_MENU_VISIBILITY])
      service['isMobile$'] = of(false, true)
      service
        .isVisible('static')
        // Skip initial value
        .pipe(skip(1))
        .subscribe((isVisible) => {
          expect(isVisible).toBeFalse()
          done()
        })
    })
  })

  describe('activation', () => {
    describe('on desktop', () => {
      beforeEach(() => {
        service['isMobile$'] = of(false)
      })
      it('should compare selected menu mode and activate menu', (done) => {
        userServiceMock.profile$.publish({
          accountSettings: {
            layoutAndThemeSettings: {
              menuMode: 'STATIC'
            }
          }
        } as UserProfile)

        service.isActive('static').subscribe((isActive) => {
          expect(isActive).toBeTrue()
          done()
        })
      })

      it('should compare selected menu mode and deactivate menu', (done) => {
        userServiceMock.profile$.publish({
          accountSettings: {
            layoutAndThemeSettings: {
              menuMode: 'STATIC'
            }
          }
        } as UserProfile)

        service.isActive('horizontal').subscribe((isActive) => {
          expect(isActive).toBeFalse()
          done()
        })
      })
    })

    describe('on mobile', () => {
      beforeEach(() => {
        service['isMobile$'] = of(true)
      })
      it('should compare selected menu mode if no edge cases apply and activate menu', (done) => {
        userServiceMock.profile$.publish({
          accountSettings: {
            layoutAndThemeSettings: {
              menuMode: 'OVERLAY'
            }
          }
        } as UserProfile)
        service.isActive('overlay').subscribe((isActive) => {
          expect(isActive).toBeTrue()
          done()
        })
      })
      it('should compare selected menu mode if no edge cases apply and deactivate menu', (done) => {
        userServiceMock.profile$.publish({
          accountSettings: {
            layoutAndThemeSettings: {
              menuMode: 'OVERLAY'
            }
          }
        } as UserProfile)
        service.isActive('slim').subscribe((isActive) => {
          expect(isActive).toBeFalse()
          done()
        })
      })
      it('should deactivate if selected mode is horizontal for horizontal menu', (done) => {
        userServiceMock.profile$.publish({
          accountSettings: {
            layoutAndThemeSettings: {
              menuMode: 'HORIZONTAL'
            }
          }
        } as UserProfile)
        service.isActive('horizontal').subscribe((isActive) => {
          expect(isActive).toBeFalse()
          done()
        })
      })
      it('should activate if selected mode is static for horizontal menu', (done) => {
        userServiceMock.profile$.publish({
          accountSettings: {
            layoutAndThemeSettings: {
              menuMode: 'HORIZONTAL'
            }
          }
        } as UserProfile)
        service.isActive('static').subscribe((isActive) => {
          expect(isActive).toBeTrue()
          done()
        })
      })
    })
  })
})
