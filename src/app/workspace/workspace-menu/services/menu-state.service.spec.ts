import { TestBed } from '@angular/core/testing'

import { MenuStateService } from './menu-state.service'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'

describe('MenuStateService', () => {
  let service: MenuStateService

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClientTesting(), provideHttpClient(), MenuStateService]
    })

    service = TestBed.inject(MenuStateService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  it('should get and updateState', () => {
    const initialShowDetails = service.getState().showDetails

    service.updateState({ showDetails: !initialShowDetails })

    expect(service.getState().showDetails).toBe(!initialShowDetails)
  })
})
