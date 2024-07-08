const { ModifyEntryPlugin } = require('@angular-architects/module-federation/src/utils/modify-entry-plugin')
const { share, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack')

const config = withModuleFederationPlugin({
  name: 'onecx-workspace-ui',
  filename: 'remoteEntry.js',
  exposes: {
    './OneCXWorkspaceModule': 'src/bootstrap.ts',
    './OneCXUserAvatarMenuComponent': 'src/app/remotes/user-avatar-menu/user-avatar-menu.component.bootstrap.ts',
    './OneCXUserSidebarMenuComponent': 'src/app/remotes/user-sidebar-menu/user-sidebar-menu.component.bootstrap.ts',
    './OneCXVerticalMainMenuComponent': 'src/app/remotes/vertical-main-menu/vertical-main-menu.component.bootstrap.ts',
    './OneCXHorizontalMainMenuComponent':
      'src/app/remotes/horizontal-main-menu/horizontal-main-menu.component.bootstrap.ts',
    './OneCXFooterMenuComponent': 'src/app/remotes/footer-menu/footer-menu.component.bootstrap.ts'
  },
  shared: share({
    '@angular/core': { singleton: true, requiredVersion: 'auto', includeSecondaries: true },
    '@angular/forms': {
      singleton: true,
      requiredVersion: 'auto',
      includeSecondaries: true
    },
    '@angular/common': {
      singleton: true,
      requiredVersion: 'auto',
      includeSecondaries: {
        skip: ['@angular/common/http/testing']
      }
    },
    '@angular/common/http': {
      singleton: true,
      requiredVersion: 'auto',
      includeSecondaries: true
    },
    '@angular/router': { singleton: true, requiredVersion: 'auto', includeSecondaries: true },
    rxjs: { requiredVersion: 'auto', includeSecondaries: true },
    '@ngx-translate/core': { singleton: true, requiredVersion: 'auto' },
    '@onecx/accelerator': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/angular-accelerator': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/angular-webcomponents': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/angular-integration-interface': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/angular-remote-components': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/angular-testing': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/integration-interface': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/keycloak-auth': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/portal-integration-angular': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/portal-layout-styles': { requiredVersion: 'auto', includeSecondaries: true }
  }),
  sharedMappings: ['@onecx/portal-integration-angular']
})
config.devServer = {
  allowedHosts: 'all'
}

const plugins = config.plugins.filter((plugin) => !(plugin instanceof ModifyEntryPlugin))

module.exports = {
  ...config,
  plugins,
  output: {
    uniqueName: 'my-ui',
    publicPath: 'auto'
  },
  experiments: {
    ...config.experiments,
    topLevelAwait: true
  },
  optimization: {
    runtimeChunk: false,
    splitChunks: false
  }
}
