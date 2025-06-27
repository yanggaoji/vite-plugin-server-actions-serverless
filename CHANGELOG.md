# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2025-06-26

### Added
- Support for Vite 7
- Mobile responsiveness for code tabs in documentation site
- Improved terminal-style tabs design in documentation site

### Changed
- Dropped support for Vite 2 and 3 (now requires Vite 4+)
- Removed ESLint in favor of Prettier-only formatting

### Fixed
- Code tabs interference between examples in documentation
- Mobile scrolling behavior for code tabs (dots now stay fixed)

## [1.0.0] - 2025-06-23

First stable release! This version is production-ready with comprehensive features for building full-stack applications with Vite.

### Added

- File upload support in todo example app
- Priority field for todos (low/medium/high)
- Description field for todos (max 800 chars)
- Notion-style UI design for todo app
- Comprehensive E2E tests for file upload functionality
- Error handling for corrupted JSON files
- LICENSE file for MIT license
- .npmignore file for cleaner npm package
- GitHub Actions CI/CD workflows for automated testing and npm publishing
- PR check workflow for commit linting and bundle size verification

### Changed

- Improved package.json metadata for npm publishing
- Enhanced keywords for better discoverability
- Added proper exports field for ES modules
- Added files field to specify published files
- Added engines field for Node.js compatibility

### Fixed

- Test parallelization issues with proper cleanup
- ESLint errors in todo.server.js
- JSON import syntax for production builds

## [0.1.1] - 2025-06-22

### Added

- Production build support with validation and OpenAPI
- TypeScript type definitions
- Middleware support with validation context
- Swagger UI for API documentation
- File-based routing for server actions
- Request validation with Zod schemas
- Automatic OpenAPI spec generation

### Changed

- Complete README rewrite for production release
- Removed experimental warnings
- Improved error handling and validation

### Fixed

- TypeScript definition issues
- Production build validation
- API route generation

## [0.1.0] - 2025-06-20

### Added

- Initial release
- Basic server actions functionality
- Vite plugin for proxying backend functions
- Express server integration
- Hot module replacement support
- Basic todo app example

[Unreleased]: https://github.com/HelgeSverre/vite-plugin-server-actions/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/HelgeSverre/vite-plugin-server-actions/compare/v0.1.1...v1.0.0
[0.1.1]: https://github.com/HelgeSverre/vite-plugin-server-actions/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/HelgeSverre/vite-plugin-server-actions/releases/tag/v0.1.0
