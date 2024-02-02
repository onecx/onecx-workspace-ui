// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
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
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
        random: false
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    sonarqubeReporter: {
      basePath: 'src/app', // test files folder
      filePattern: '**/*.spec.ts', // test files glob pattern
      encoding: 'utf-8', // test files encoding
      outputFolder: 'sonar', // report destination
      legacyMode: false, // report for Sonarqube < 6.2 (disabled)
      reportName: 'sonarqube_report.xml'
    },
    sonarQubeUnitReporter: {
      sonarQubeVersion: 'LATEST',
      outputFile: 'reports/sonarqube_report.xml',
      testPaths: ['./src/app'],
      testFilePattern: '**/*.spec.ts',
      useBrowserName: false
    },
    coverageReporter: {
      includeAllSources: true,
      dir: 'reports',
      subdir: 'coverage', // common name instaed browser-specific
      reporters: [{ type: 'text-summary' }, { type: 'lcov' }]
    },
    reporters: ['progress', 'kjhtml', 'coverage', 'sonarqubeUnit'],
    preprocessors: { 'src/**/*.js': ['coverage'] },
    port: 9876,
    colors: true,
    autoWatch: true,
    singleRun: false,
    restartOnFileChange: true,
    browsers: ['HeadlessChrome'],
    customLaunchers: {
      HeadlessChrome: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox']
      }
    }
  })
}
