# TODO

## Future Tasks

### Configuration Enhancements

- [ ] Don't nest configuration for openapi under validation, remember to update readme and tests
- [ ] Add configurable output server filename (default to server.js)
- [ ] Add ability to disable openapi.json and swagger-ui separately
- [ ] Allow configuring the output filename/location for openapi.json and swagger-ui when building

### Additional Examples

- [ ] Add Vue.js example todo app (exact replica of Svelte functionality)
- [ ] Add React example todo app (exact replica of Svelte functionality)
- [ ] Add Riot.js example todo app (exact replica of Svelte functionality)
- [ ] Add Alpine.js example todo app (exact replica of Svelte functionality)

### Documentation

- [ ] Add migration guide from other server action solutions
- [ ] Create framework-specific integration guides
- [ ] Add troubleshooting guide

### Features

- [ ] Add support for streaming responses
- [ ] Add WebSocket support for real-time server actions (alternative transport mechanism instead of HTTP fetch calls from the client-side)
- [ ] Add request/response interceptors
- [ ] Add rate limiting middleware example

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

### E2E Integration Tests
- [x] Add file upload tests to E2E integration tests for todo app

### Production Features
- [x] Production build validation and OpenAPI support
- [x] Fix TypeScript definitions
- [x] Add validation context to middleware

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