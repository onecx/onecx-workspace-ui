// Karma configuration file, see link for more information
// https://karma-runner.github.io/6.4/config/configuration-file.html
// process.env.CHROME_BIN = require('puppeteer').executablePath()

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
    port: 9876,
    colors: true,
    autoWatch: true,
    singleRun: false,
    restartOnFileChange: true,
    browserConsoleLogOptions: { level: 'debug', format: '%b %T: %m', terminal: true },
    // export CHROME_BIN=<path to binary>
    browsers: ['Chrome'],
    customLaunchers: {
      Chrome: { base: 'ChromeHeadless', flags: ['--no-sandbox', '--disable-web-security'] }
    },
    client: {
      // https://jasmine.github.io/api/edge/Configuration.html
      jasmine: { random: false },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    reporters: ['progress', 'kjhtml', 'coverage', 'sonarqubeUnit'],
    preprocessors: { 'src/**/*.js': ['coverage'] },
    jasmineHtmlReporter: {
      suppressAll: true // remove duplicated traces
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
    }
  })
}
