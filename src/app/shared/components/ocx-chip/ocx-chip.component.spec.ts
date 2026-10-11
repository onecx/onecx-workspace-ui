import { ComponentFixture, TestBed } from '@angular/core/testing'

import { OcxChipComponent } from './ocx-chip.component'

describe('OcxChipComponent', () => {
  let component: OcxChipComponent
  let fixture: ComponentFixture<OcxChipComponent>

  beforeEach(async () => {
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
