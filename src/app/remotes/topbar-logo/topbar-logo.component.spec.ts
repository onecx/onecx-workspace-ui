import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideNoopAnimations } from '@angular/platform-browser/animations'
import { firstValueFrom, of, ReplaySubject } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { RemoteComponentConfig, REMOTE_COMPONENT_CONFIG, SlotService } from '@onecx/angular-remote-components'
import { SlotServiceMock } from '@onecx/angular-remote-components/mocks'
import { provideAppConfigServiceMock, provideAppStateServiceMock } from '@onecx/angular-integration-interface/mocks'
import { FakeTopic, Topic } from '@onecx/accelerator'

import { RefType } from 'src/app/shared/generated'
import { MenuService } from 'src/app/shared/services/menu.service'
import { ResizedEventType } from 'src/app/shared/resized-events/v1/resized-event-type'

import { OneCXTopbarLogoComponent } from './topbar-logo.component'
import { OneCXCurrentWorkspaceLogoComponent } from '../current-workspace-logo/current-workspace-logo.component'

describe('OneCXTopbarLogoComponent', () => {
  const menuServiceSpy = jasmine.createSpyObj<MenuService>('MenuService', ['isActive', 'isVisible'])
  // both the component and its <app-current-workspace-logo> child inject this token - it must be provided
  const rcConfig = new ReplaySubject<RemoteComponentConfig>(1)
  const defaultConfig: RemoteComponentConfig = {
    appId: 'appId',
    productName: 'prodName',
    permissions: ['permission'],
    baseUrl: 'base'
  }
  let fakeEventsTopic: FakeTopic<any>

  function setUp() {
    const fixture = TestBed.createComponent(OneCXTopbarLogoComponent)
    const component = fixture.componentInstance
    fixture.detectChanges()
    // swap in a controllable topic so resize events can be published synchronously
    fakeEventsTopic = new FakeTopic()
    component['resizedEventsTopic'] = fakeEventsTopic as unknown as Topic<any>
    return { fixture, component }
  }

  function publishSlotResized(width: number, height = 800) {
    fakeEventsTopic.publish({
      type: ResizedEventType.SLOT_RESIZED,
      payload: { slotName: 'onecx-shell-vertical-menu', slotDetails: { width, height } }
    })
  }

  function publishSlotGroupResized(width: number, height = 800) {
    fakeEventsTopic.publish({
      type: ResizedEventType.SLOT_GROUP_RESIZED,
      payload: { slotGroupName: 'onecx-shell-body-start', slotGroupDetails: { width, height } }
    })
  }

  beforeEach(async () => {
    // keep the parent's real imports (AngularRemoteComponentsModule / OneCXCurrentWorkspaceLogoComponent)
    // and the child's real imports so <app-current-workspace-logo> and [ocxSrc] resolve without NO_ERRORS_SCHEMA
    await TestBed.configureTestingModule({
      imports: [
        OneCXTopbarLogoComponent,
        OneCXCurrentWorkspaceLogoComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideAppConfigServiceMock(),
        provideAppStateServiceMock(),
        { provide: MenuService, useValue: menuServiceSpy },
        { provide: REMOTE_COMPONENT_CONFIG, useValue: rcConfig },
        { provide: SlotService, useClass: SlotServiceMock }
      ]
    }).compileComponents()

    rcConfig.next(defaultConfig)
    menuServiceSpy.isActive.and.returnValue(of(true))
    menuServiceSpy.isVisible.and.returnValue(of(true))
    document.documentElement.style.fontSize = '16px' // 1rem = 16px
  })

  describe('initialize', () => {
    it('should create', () => {
      const { component } = setUp()

      expect(component).toBeTruthy()
    })

    it('should call ocxInitRemoteComponent with the correct config', () => {
      const { component } = setUp()
      spyOn(component, 'ocxInitRemoteComponent')

      component.ocxRemoteComponentConfig = defaultConfig

      expect(component.ocxInitRemoteComponent).toHaveBeenCalledWith(defaultConfig)
    })

    it('should forward the config to the REMOTE_COMPONENT_CONFIG token', async () => {
      const { component } = setUp()
      const mockConfig: RemoteComponentConfig = { ...defaultConfig, baseUrl: 'base_url' }

      component.ocxInitRemoteComponent(mockConfig)

      expect(await firstValueFrom(component.remoteComponentConfig)).toEqual(mockConfig)
    })
  })

  describe('dynamic width', () => {
    it('should have default width', () => {
      const { component } = setUp()
      component.ocxRemoteComponentConfig = defaultConfig

      expect(component.container.nativeElement.style.width).toEqual('14.5rem')
    })

    it('should not change if slotWidth is not set', () => {
      const { component } = setUp()
      component.ocxRemoteComponentConfig = defaultConfig

      fakeEventsTopic.publish({
        type: ResizedEventType.SLOT_RESIZED,
        payload: { slotName: 'onecx-shell-vertical-menu', slotDetails: { height: 800 } }
      })

      expect(component.container.nativeElement.style.width).toEqual('14.5rem')
    })

    it('should change if slotWidth is set', () => {
      const { component } = setUp()
      component.ocxRemoteComponentConfig = defaultConfig

      publishSlotResized(400)

      const expectedWidth = 400 - 16 * 2.5 + 'px'
      expect(component.container.nativeElement.style.width).toEqual(expectedWidth)
    })

    it('should not change if static menu is not active', () => {
      menuServiceSpy.isActive.and.returnValue(of(false))
      const { component } = setUp()
      component.ocxRemoteComponentConfig = defaultConfig

      publishSlotResized(400)

      expect(component.container.nativeElement.style.width).toEqual('400px')
    })

    it('should handle slot group resized event', () => {
      const { component } = setUp()
      component.ocxRemoteComponentConfig = defaultConfig

      publishSlotGroupResized(300)

      const expectedWidth = 300 - 16 * 2.5 + 'px'
      expect(component.container.nativeElement.style.width).toEqual(expectedWidth)
    })

    it('should handle slot group resized event when static menu is not active', () => {
      menuServiceSpy.isActive.and.returnValue(of(false))
      const { component } = setUp()
      component.ocxRemoteComponentConfig = defaultConfig

      publishSlotGroupResized(300)

      expect(component.container.nativeElement.style.width).toEqual('300px')
    })

    it('should keep default width when slot width is zero', () => {
      const { component } = setUp()
      component.ocxRemoteComponentConfig = defaultConfig

      publishSlotResized(0)

      expect(component.container.nativeElement.style.width).toEqual('14.5rem')
    })
  })

  describe('logo type switching', () => {
    it('should switch to small logo when width is below threshold', () => {
      const { component } = setUp()
      component.currentImageType = RefType.Logo
      component.ocxRemoteComponentConfig = defaultConfig

      publishSlotResized(200)

      expect(component.currentImageType).toEqual(RefType.LogoSmall)
    })

    it('should not switch to small logo when already using small logo', () => {
      const { component } = setUp()
      component.currentImageType = RefType.LogoSmall
      component.ocxRemoteComponentConfig = defaultConfig

      publishSlotResized(200)

      expect(component.currentImageType).toEqual(RefType.LogoSmall)
    })

    it('should switch back to regular logo when width is above threshold', () => {
      const { component } = setUp()
      component.currentImageType = RefType.LogoSmall
      component.ocxRemoteComponentConfig = defaultConfig

      publishSlotResized(400)

      expect(component.currentImageType).toEqual(RefType.Logo)
    })
  })
})
