import { ComponentFixture, TestBed } from '@angular/core/testing'

import { UserAvatarMenuComponent } from './user-avatar-menu.component'

describe('UserAvatarMenuComponent', () => {
  let component: UserAvatarMenuComponent
  let fixture: ComponentFixture<UserAvatarMenuComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAvatarMenuComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(UserAvatarMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
