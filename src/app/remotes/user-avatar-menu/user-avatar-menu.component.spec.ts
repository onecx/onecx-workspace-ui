import { ComponentFixture, TestBed } from '@angular/core/testing'

import { OneCXUserAvatarMenuComponent } from './user-avatar-menu.component'

xdescribe('UserAvatarMenuComponent', () => {
  let component: OneCXUserAvatarMenuComponent
  let fixture: ComponentFixture<OneCXUserAvatarMenuComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OneCXUserAvatarMenuComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(OneCXUserAvatarMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
