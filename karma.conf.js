// Karma configuration file, see link for more information
// https://karma-runner.github.io/6.4/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '.',
    port: 9876,
    colors: true,
    autoWatch: true,
    singleRun: false,
    restartOnFileChange: true,
    logLevel: config.LOG_INFO,
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-chrome-launcher'),
      require('karma-coverage'),
      require('karma-jasmine'),
      require('karma-jasmine-html-reporter'),
      require('karma-sonarqube-unit-reporter'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: { random: false },
      clearContext: false
    },
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-web-security']
      }
    },
    browserConsoleLogOptions: {
      level: 'debug',
      format: '%b %T: %m',
      terminal: true
    },
    reporters: ['progress', 'coverage', 'sonarqubeUnit'],
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      includeAllSources: true,
      dir: 'reports',
      subdir: 'coverage',
      reporters: [{ type: 'text-summary' }, { type: 'lcov' }]
    },
    sonarQubeUnitReporter: {
      outputFile: 'reports/sonarqube_report.xml',
      testPaths: ['./src/app'],
      testFilePattern: '**/*.spec.ts',
      useBrowserName: false
    }
  })
}
