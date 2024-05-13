import { TestBed } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'

import { MenuStateService } from './menu-state.service'

describe('MenuStateService', () => {
  let service: MenuStateService

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MenuStateService]
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
