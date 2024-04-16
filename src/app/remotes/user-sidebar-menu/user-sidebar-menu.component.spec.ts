import { ComponentFixture, TestBed } from '@angular/core/testing'

import { OneCXUserSidebarMenuComponent } from './user-sidebar-menu.component'

describe('UserSidebarMenuComponent', () => {
  let component: OneCXUserSidebarMenuComponent
  let fixture: ComponentFixture<OneCXUserSidebarMenuComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OneCXUserSidebarMenuComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(OneCXUserSidebarMenuComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
