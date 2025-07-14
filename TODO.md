# TODO

## Future Tasks

- [ ] Ensure user defined middleware is bundled into production server build

### Configuration Enhancements

- [ ] Add configurable output server filename (default to server.js)
- [ ] Add ability to disable openapi.json and swagger-ui separately
- [ ] Allow configuring the output filename/location for openapi.json and swagger-ui when building
- [ ] Allow silencing the logging

### Additional Examples

- [x] Add Vue.js example todo app (exact replica of Svelte functionality)
- [x] Add React example todo app (exact replica of Svelte functionality)
- [ ] Add Riot.js example todo app (exact replica of Svelte functionality)
- [ ] Add Alpine.js example todo app (exact replica of Svelte functionality)

### Features

- [ ] Add WebSocket support for real-time server actions (alternative transport mechanism instead of HTTP fetch calls
      from the client-side)
- [ ] Add rate limiting middleware example
- [ ] Add "drop-in" simple authentication middleware that uses cookies/sessions and json/sqlite for storing user
      accounts and authenticated session (not really meant for prod usage, but it could i guess)
- [ ] Add support for streaming responses

---

## Completed Tasks (v1.0.0)

### NPM Publishing Preparation

- [x] Update package.json with proper metadata
  - [x] Add keywords for discoverability
  - [x] Update description
  - [x] Add repository, bugs, and homepage fields
  - [x] Set proper entry points
  - [x] Add files field to specify what to publish
- [x] Create CHANGELOG.md file
- [x] Create LICENSE file
- [x] Create .npmignore file

### CI/CD Setup

- [x] Create GitHub Actions workflow for automated testing
  - [x] Run unit tests on push/PR
  - [x] Run E2E tests
  - [x] Run linting and type checking
- [x] Add workflow for automated npm publishing on release
- [x] Add PR check workflow for commit linting and bundle size
- [x] Remove Husky in favor of GitHub Actions CI

### E2E Integration Tests

- [x] Add file upload tests to E2E integration tests for todo app

### Production Features

- [x] Production build validation and OpenAPI support
- [x] Fix TypeScript definitions
- [x] Add validation context to middleware

### Configuration Updates

- [x] Don't nest configuration for openapi under validation
- [x] Update TypeScript definitions for separated config
- [x] Update all tests to use new configuration structure
- [x] Update README documentation for new config options

### Documentation

- [x] README rewrite for production release
- [x] Create CONTRIBUTING.md

### Example App Enhancements

- [x] File Upload Feature for Todo App
  - [x] Add priority field to todo items
  - [x] Add file upload capability to todos
  - [x] Add description field to todos
  - [x] Implement Notion-style design
  - [x] Store files in public/uploads folder
  - [x] Add filepath field to todo.json
  - [x] Generate colorful test images
- [x] Create Vue.js example todo app with identical functionality to Svelte
- [x] Create React example todo app with identical functionality to Svelte
- [x] Unify visual styling across all three framework examples
- [x] Add framework-specific titles to distinguish apps
- [x] Remove unused authentication code from examples
