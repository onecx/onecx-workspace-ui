import { ComponentFixture, TestBed } from '@angular/core/testing'

import { OcxChipComponent } from './ocx-chip.component'

describe('OcxChipComponent', () => {
  let component: OcxChipComponent
  let fixture: ComponentFixture<OcxChipComponent>

  beforeEach(async () => {
    // standalone component - must be imported, not declared. Its real imports (TooltipModule)
    // are kept so [pTooltip] resolves without NO_ERRORS_SCHEMA. No injected services needed.
    await TestBed.configureTestingModule({
      imports: [OcxChipComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(OcxChipComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
