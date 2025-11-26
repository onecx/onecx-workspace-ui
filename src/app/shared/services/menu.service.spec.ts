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
import { Topic } from '@onecx/accelerator'

fdescribe('MenuService', () => {
  let service: MenuService
  let userServiceMock: UserServiceMock
  let realWindowMatchMedia: (query: string) => MediaQueryList
  let mode: 'DESKTOP' | 'MOBILE' = 'DESKTOP'

  /**
   * Mock matchMedia to simulate mobile/desktop. Desktop by default.
   */
  function mockMatchMedia() {
    // console.log('Will mock matchMedia')
    ;(globalThis.matchMedia as any) = (query: string) => {
      // console.log('Mocking for mode:', mode)
      return {
        matches: mode === 'DESKTOP' ? false : true
      }
    }
  }

  /**
   * Switch to desktop mode
   */
  function mockDesktop() {
    mode = 'DESKTOP'
  }

  /**
   * Switch to mobile mode
   */
  function mockMobile() {
    mode = 'MOBILE'
  }

  beforeAll(() => {
    realWindowMatchMedia = globalThis.matchMedia

    mockMatchMedia()
  })

  afterAll(() => {
    globalThis.matchMedia = realWindowMatchMedia
  })

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MenuService, provideUserServiceMock(), provideShellCapabilityServiceMock()]
    })

    service = TestBed.inject(MenuService)
    userServiceMock = TestBed.inject(UserService) as unknown as UserServiceMock
    const fakeTopic = new FakeTopic() as unknown as Topic<{ isVisible: boolean }>
    service['staticMenuState$'] = fakeTopic
    fakeTopic.publish({ isVisible: true })
  })

  it('should react to resize events', (done) => {
    ShellCapabilityServiceMock.setCapabilities([Capability.ACTIVENESS_AWARE_MENUS])
    userServiceMock.profile$.publish({
      accountSettings: {
        layoutAndThemeSettings: {
          menuMode: 'STATIC'
        }
      }
    } as UserProfile)

    const results: boolean[] = []

    service.isVisible('static').subscribe((isVisible) => {
      results.push(isVisible)
      if (results.length === 2) {
        expect(results).toEqual([true, false])
        done()
      }
    })

    mockMobile()
    setTimeout(() => {
      const event = new Event('resize')
      globalThis.dispatchEvent(event)
    }, 150)
  })

  it('should use static mode if profile does not contain menu mode', (done) => {
    userServiceMock.profile$.publish({} as UserProfile)

    service.isActive('static').subscribe((isActive) => {
      expect(isActive).toBeTrue()
      done()
    })
  })

  describe('activation', () => {
    describe('on desktop', () => {
      beforeEach(() => {
        mockDesktop()
      })

      describe('user selected STATIC MODE', () => {
        beforeEach(() => {
          userServiceMock.profile$.publish({
            accountSettings: {
              layoutAndThemeSettings: {
                menuMode: 'STATIC'
              }
            }
          } as UserProfile)
        })

        it('should activate if mode matches', (done) => {
          service.isActive('static').subscribe((isActive) => {
            expect(isActive).toBeTrue()
            done()
          })
        })

        it('should deactivate if mode does not match', (done) => {
          service.isActive('overlay').subscribe((isActive) => {
            expect(isActive).toBeFalse()
            done()
          })
        })
      })

      describe('user selected HORIZONTAL MODE', () => {
        beforeEach(() => {
          userServiceMock.profile$.publish({
            accountSettings: {
              layoutAndThemeSettings: {
                menuMode: 'HORIZONTAL'
              }
            }
          } as UserProfile)
        })

        it('should activate if mode matches', (done) => {
          service.isActive('horizontal').subscribe((isActive) => {
            expect(isActive).toBeTrue()
            done()
          })
        })

        it('should deactivate if mode does not match', (done) => {
          service.isActive('overlay').subscribe((isActive) => {
            expect(isActive).toBeFalse()
            done()
          })
        })
      })

      describe('user selected other mode', () => {
        beforeEach(() => {
          userServiceMock.profile$.publish({
            accountSettings: {
              layoutAndThemeSettings: {
                menuMode: 'OVERLAY'
              }
            }
          } as UserProfile)
        })

        it('should activate if mode matches', (done) => {
          service.isActive('overlay').subscribe((isActive) => {
            expect(isActive).toBeTrue()
            done()
          })
        })

        it('should deactivate if mode does not match', (done) => {
          service.isActive('horizontal').subscribe((isActive) => {
            expect(isActive).toBeFalse()
            done()
          })
        })
      })
    })

    describe('on mobile', () => {
      beforeEach(() => {
        mockMobile()
      })

      describe('user selected STATIC MODE', () => {
        beforeEach(() => {
          userServiceMock.profile$.publish({
            accountSettings: {
              layoutAndThemeSettings: {
                menuMode: 'STATIC'
              }
            }
          } as UserProfile)
        })

        it('should activate if mode matches', (done) => {
          service.isActive('static').subscribe((isActive) => {
            expect(isActive).toBeTrue()
            done()
          })
        })

        it('should deactivate if mode does not match', (done) => {
          service.isActive('overlay').subscribe((isActive) => {
            expect(isActive).toBeFalse()
            done()
          })
        })
      })

      describe('user selected HORIZONTAL MODE', () => {
        beforeEach(() => {
          userServiceMock.profile$.publish({
            accountSettings: {
              layoutAndThemeSettings: {
                menuMode: 'HORIZONTAL'
              }
            }
          } as UserProfile)
        })

        it('should deactivate horizontal', (done) => {
          service.isActive('horizontal').subscribe((isActive) => {
            expect(isActive).toBeFalse()
            done()
          })
        })

        it('should activate static', (done) => {
          service.isActive('static').subscribe((isActive) => {
            expect(isActive).toBeTrue()
            done()
          })
        })

        it('should deactivate if mode does not match', (done) => {
          service.isActive('overlay').subscribe((isActive) => {
            expect(isActive).toBeFalse()
            done()
          })
        })
      })

      describe('user selected other mode', () => {
        beforeEach(() => {
          userServiceMock.profile$.publish({
            accountSettings: {
              layoutAndThemeSettings: {
                menuMode: 'OVERLAY'
              }
            }
          } as UserProfile)
        })

        it('should activate if mode matches', (done) => {
          service.isActive('overlay').subscribe((isActive) => {
            expect(isActive).toBeTrue()
            done()
          })
        })

        it('should deactivate if mode does not match', (done) => {
          service.isActive('horizontal').subscribe((isActive) => {
            expect(isActive).toBeFalse()
            done()
          })
        })
      })
    })
  })

  describe('visibility', () => {
    describe('on desktop', () => {
      beforeEach(() => {
        mockDesktop()
      })

      describe('for static mode', () => {
        it('should be visible if capability is not present', (done) => {
          ShellCapabilityServiceMock.setCapabilities([])
          service.isVisible('static').subscribe((isVisible) => {
            expect(isVisible).toBeTrue()
            done()
          })
        })

        it('should be visible on user selected static', (done) => {
          ShellCapabilityServiceMock.setCapabilities([Capability.ACTIVENESS_AWARE_MENUS])
          userServiceMock.profile$.publish({
            accountSettings: {
              layoutAndThemeSettings: {
                menuMode: 'STATIC'
              }
            }
          } as UserProfile)
          service.isVisible('static').subscribe((isVisible) => {
            expect(isVisible).toBeTrue()
            done()
          })
        })

        it('should be visible on user selected horizontal', (done) => {
          ShellCapabilityServiceMock.setCapabilities([Capability.ACTIVENESS_AWARE_MENUS])
          userServiceMock.profile$.publish({
            accountSettings: {
              layoutAndThemeSettings: {
                menuMode: 'HORIZONTAL'
              }
            }
          } as UserProfile)
          service.isVisible('static').subscribe((isVisible) => {
            expect(isVisible).toBeTrue()
            done()
          })
        })
      })

      describe('for horizontal mode', () => {
        it('should be visible', (done) => {
          service.isVisible('horizontal').subscribe((isActive) => {
            expect(isActive).toBeTrue()
            done()
          })
        })
      })

      describe('for other mode', () => {
        it('should be visible', (done) => {
          service.isVisible('overlay').subscribe((isActive) => {
            expect(isActive).toBeTrue()
            done()
          })
        })
      })
    })

    describe('on mobile', () => {
      beforeEach(() => {
        mockMobile()
      })

      describe('for static mode', () => {
        it('should be visible if capability is not present', (done) => {
          ShellCapabilityServiceMock.setCapabilities([])
          service.isVisible('static').subscribe((isVisible) => {
            expect(isVisible).toBeTrue()
            done()
          })
        })

        it('should be not visible on user selected static', (done) => {
          ShellCapabilityServiceMock.setCapabilities([Capability.ACTIVENESS_AWARE_MENUS])
          userServiceMock.profile$.publish({
            accountSettings: {
              layoutAndThemeSettings: {
                menuMode: 'STATIC'
              }
            }
          } as UserProfile)

          const results: boolean[] = []

          service.isVisible('static').subscribe((isVisible) => {
            results.push(isVisible)
            if (results.length === 2) {
              expect(results).toEqual([true, false])
              done()
            }
          })

          mockDesktop()
          setTimeout(() => {
            const event1 = new Event('resize')
            globalThis.dispatchEvent(event1)

            setTimeout(() => {
              mockMobile()
              const event2 = new Event('resize')
              globalThis.dispatchEvent(event2)
            }, 150)
          }, 50)
        })

        it('should be not visible on user selected horizontal', (done) => {
          ShellCapabilityServiceMock.setCapabilities([Capability.ACTIVENESS_AWARE_MENUS])
          userServiceMock.profile$.publish({
            accountSettings: {
              layoutAndThemeSettings: {
                menuMode: 'HORIZONTAL'
              }
            }
          } as UserProfile)

          const results: boolean[] = []

          service.isVisible('static').subscribe((isVisible) => {
            results.push(isVisible)
            if (results.length === 2) {
              expect(results).toEqual([true, false])
              done()
            }
          })

          mockDesktop()
          setTimeout(() => {
            const event1 = new Event('resize')
            globalThis.dispatchEvent(event1)

            // Now switch to mobile
            setTimeout(() => {
              mockMobile()
              const event2 = new Event('resize')
              globalThis.dispatchEvent(event2)
            }, 150)
          }, 50)
        })
      })
      describe('for horizontal mode', () => {
        it('should be visible', (done) => {
          service.isVisible('horizontal').subscribe((isActive) => {
            expect(isActive).toBeTrue()
            done()
          })
        })
      })
      describe('for other mode', () => {
        it('should be visible', (done) => {
          service.isVisible('overlay').subscribe((isActive) => {
            expect(isActive).toBeTrue()
            done()
          })
        })
      })
    })
  })
})
