import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { BrowserModule } from '@angular/platform-browser'
import { provideRouter } from '@angular/router'
import { importProvidersFrom } from '@angular/core'
import { AngularAuthModule } from '@onecx/angular-auth'
import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import { environment } from 'src/environments/environment'
import { OneCXListWorkspacesUsingThemeComponent } from './list-workspaces-using-theme.component'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'

bootstrapRemoteComponent(
  OneCXListWorkspacesUsingThemeComponent,
  'ocx-list-workspaces-using-theme-component',
  environment.production,
  [
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(AngularAuthModule),
    importProvidersFrom(BrowserModule),
    importProvidersFrom(BrowserAnimationsModule),
    provideRouter([
      {
        path: '**',
        children: []
      }
    ])
  ]
)
