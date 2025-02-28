# SeatManagement

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.1.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

This project uses Playwright for end-to-end testing. Playwright provides a robust framework for testing web applications across multiple browsers (Chromium, Firefox, and WebKit).

To run the end-to-end tests, you have several options:

```bash
# Run all tests headlessly (CI mode)
npm run test:e2e

# Run tests with Playwright's UI mode (great for debugging)
npm run test:e2e:ui

# Run tests in debug mode with step-by-step execution
npm run test:e2e:debug
```

The test files are located in the `e2e` directory. When you run the tests:
- Playwright will automatically start the Angular development server
- Execute tests across all configured browsers (Chrome, Firefox, and Safari)
- Generate a detailed HTML report with test results
- Capture screenshots on test failures

For more information on using Playwright, visit the [Playwright Documentation](https://playwright.dev/docs/intro).

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
