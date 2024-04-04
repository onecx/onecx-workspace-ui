import { ComponentFixture, TestBed } from '@angular/core/testing'

import { UserSidebarMenuComponent } from './user-sidebar-menu.component'

describe('UserSidebarMenuComponent', () => {
  let component: UserSidebarMenuComponent
  let fixture: ComponentFixture<UserSidebarMenuComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSidebarMenuComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(UserSidebarMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
