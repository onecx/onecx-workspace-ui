import { importProvidersFrom } from '@angular/core'
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { provideRouter } from '@angular/router'

import { AngularAuthModule } from '@onecx/angular-auth'
import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'

import { environment } from 'src/environments/environment'
import { OneCXVerticalMainMenuComponent } from './vertical-main-menu.component'

bootstrapRemoteComponent(OneCXVerticalMainMenuComponent, 'ocx-vertical-main-menu-component', environment.production, [
  provideHttpClient(withInterceptorsFromDi()),
  importProvidersFrom(AngularAuthModule),
  importProvidersFrom(BrowserModule),
  importProvidersFrom(BrowserAnimationsModule),
  provideRouter([{ path: '**', children: [] }])
])
