const { ModifyEntryPlugin } = require('@angular-architects/module-federation/src/utils/modify-entry-plugin')
const { share, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack')

const config = withModuleFederationPlugin({
  name: 'onecx-workspace-ui',
  filename: 'remoteEntry.js',
  exposes: {
    './OneCXWorkspaceModule': 'src/app/onecx-workspace-remote.module.ts',
    './UserAvatarMenuComponent': 'src/app/remotes/user-avatar-menu/user-avatar-menu.component.ts'
  },
  shared: share({
    '@angular/core': { singleton: true, strictVersion: true, requiredVersion: 'auto' },
    '@angular/forms': {
      singleton: true,
      strictVersion: true,
      requiredVersion: 'auto',
      includeSecondaries: true,
      eager: false
    },
    '@angular/common': {
      singleton: true,
      strictVersion: true,
      requiredVersion: 'auto',
      includeSecondaries: {
        skip: ['@angular/common/http/testing']
      }
    },
    '@angular/common/http': {
      singleton: true,
      strictVersion: true,
      requiredVersion: 'auto',
      includeSecondaries: true
    },
    rxjs: { singleton: true, strictVersion: true, requiredVersion: 'auto', includeSecondaries: true },
    '@angular/router': { singleton: true, strictVersion: true, requiredVersion: 'auto', includeSecondaries: true },
    '@ngx-translate/core': { singleton: true, strictVersion: false, requiredVersion: '^14.0.0' },
    '@onecx/keycloak-auth': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/portal-integration-angular': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/accelerator': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/integration-interface': { requiredVersion: 'auto', includeSecondaries: true }
  }),
  sharedMappings: ['@onecx/portal-integration-angular']
})
config.devServer = {
  allowedHosts: 'all'
}

const plugins = config.plugins.filter((plugin) => !(plugin instanceof ModifyEntryPlugin))

module.exports = {
  ...config,
  plugins
}
