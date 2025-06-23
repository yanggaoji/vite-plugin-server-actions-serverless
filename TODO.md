# TODO

## Current Tasks

### NPM Publishing Preparation

- [ ] Update package.json with proper metadata
  - [ ] Add keywords for discoverability
  - [ ] Update description
  - [ ] Add repository, bugs, and homepage fields
  - [ ] Set proper entry points
  - [ ] Add files field to specify what to publish
- [ ] Create CHANGELOG.md file

### CI/CD Setup

- [ ] Create GitHub Actions workflow for automated testing
  - [ ] Run unit tests on push/PR
  - [ ] Run E2E tests
  - [ ] Run linting and type checking
- [ ] Add workflow for automated npm publishing on release

### E2E Integration Tests

- [ ] Add file upload tests to E2E integration tests for todo app

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

- [ ] Allow customizing HTTP method for each action (GET, POST, PUT, DELETE)
- [ ] Add support for streaming responses
- [ ] Add WebSocket support for real-time server actions
- [ ] Add request/response interceptors
- [ ] Add rate limiting middleware example

## Completed Tasks

- [x] Production build validation and OpenAPI support
- [x] README rewrite for production release
- [x] Create CONTRIBUTING.md
- [x] Fix TypeScript definitions
- [x] Add validation context to middleware
- [x] File Upload Feature for Todo App
  - [x] Add priority field to todo items
  - [x] Add file upload capability to todos
  - [x] Add description field to todos
  - [x] Implement Notion-style design
  - [x] Store files in public/uploads folder
  - [x] Add filepath field to todo.json
  - [x] Generate colorful test images
