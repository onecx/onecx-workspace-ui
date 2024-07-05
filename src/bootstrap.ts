import { bootstrapModule } from '@onecx/angular-webcomponents'
import { environment } from 'src/environments/environment'
import { OneCXWorkspaceModule } from './app/onecx-workspace-remote.module'

bootstrapModule(OneCXWorkspaceModule, 'microfrontend', environment.production)
