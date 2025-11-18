const { ModifyEntryPlugin } = require('@angular-architects/module-federation/src/utils/modify-entry-plugin')
const { share, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack')

const config = withModuleFederationPlugin({
  name: 'onecx-workspace-ui',
  filename: 'remoteEntry.js',
  exposes: {
    './OneCXWorkspaceModule': 'src/main.ts',
    './OneCXWorkspaceDataComponent': 'src/app/remotes/workspace-data/workspace-data.component.main.ts',
    './OneCXUserAvatarMenuComponent': 'src/app/remotes/user-avatar-menu/user-avatar-menu.component.main.ts',
    './OneCXUserSidebarMenuComponent': 'src/app/remotes/user-sidebar-menu/user-sidebar-menu.component.main.ts',
    './OneCXVerticalMainMenuComponent': 'src/app/remotes/vertical-main-menu/vertical-main-menu.component.main.ts',
    './OneCXHorizontalMainMenuComponent': 'src/app/remotes/horizontal-main-menu/horizontal-main-menu.component.main.ts',
    './OneCXFooterMenuComponent': 'src/app/remotes/footer-menu/footer-menu.component.main.ts',
    './OneCXVersionInfoComponent': 'src/app/remotes/version-info/version-info.component.main.ts',
    './OneCXCurrentWorkspaceLogoComponent':
      'src/app/remotes/current-workspace-logo/current-workspace-logo.component.main.ts',
    './OneCXToggleMenuButtonComponent': 'src/app/remotes/toggle-menu-button/toggle-menu-button.component.main.ts',
    './OneCXSlimVerticalMainMenuComponent':
      'src/app/remotes/slim-vertical-main-menu/slim-vertical-main-menu.component.main.ts',
    './OneCXSlimUserMenuComponent': 'src/app/remotes/slim-user-menu/slim-user-menu.component.main.ts'
  },
  shared: share({
    '@angular/core': { requiredVersion: 'auto', includeSecondaries: true },
    '@angular/common': { requiredVersion: 'auto', includeSecondaries: { skip: ['@angular/common/http/testing'] } },
    '@angular/common/http': { requiredVersion: 'auto', includeSecondaries: true },
    '@angular/forms': { requiredVersion: 'auto', includeSecondaries: true },
    '@angular/platform-browser': { requiredVersion: 'auto', includeSecondaries: true },
    '@angular/router': { requiredVersion: 'auto', includeSecondaries: true },
    '@ngx-translate/core': { requiredVersion: 'auto' },
    '@ngneat/error-tailor': { requiredVersion: 'auto', includeSecondaries: true },
    primeng: { requiredVersion: 'auto', includeSecondaries: true },
    rxjs: { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/accelerator': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/angular-accelerator': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/angular-auth': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/angular-integration-interface': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/angular-remote-components': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/angular-testing': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/angular-utils': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/angular-webcomponents': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/integration-interface': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/keycloak-auth': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/portal-integration-angular': { requiredVersion: 'auto', includeSecondaries: true },
    '@onecx/portal-layout-styles': { requiredVersion: 'auto', includeSecondaries: true }
  }),
  sharedMappings: ['@onecx/portal-integration-angular']
})
config.devServer = { allowedHosts: 'all' }

const plugins = config.plugins.filter((plugin) => !(plugin instanceof ModifyEntryPlugin))

module.exports = {
  ...config,
  plugins,
  module: { parser: { javascript: { importMeta: false } } },
  output: { uniqueName: 'onecx-workspace-ui', publicPath: 'auto' },
  experiments: { ...config.experiments, topLevelAwait: true },
  optimization: { runtimeChunk: false, splitChunks: false }
}
