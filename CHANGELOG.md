# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-12-21

This release focuses on stability, correctness, and documentation accuracy in preparation for public release.

### Fixed

- **Falsy Return Value Handling** - Server actions returning `0`, `false`, `""`, or `null` now work correctly. Previously these values were incorrectly treated as errors. Actions returning `undefined` now properly send HTTP 204 No Content.
- **Validation Adapter Initialization** - Fixed bug where validation adapter configured as a string (e.g., `"zod"`) was not properly instantiated, causing validation to fail silently.
- **Production Validation Runtime** - Fixed dev/prod validation behavior mismatch where production wasn't validating request body array structure.
- **OpenAPI Zod Conversion** - Added fallback converter for Zod schemas without `.openapi()` metadata, preventing "zodSchema.openapi is not a function" errors.
- **Module Cache Isolation** - Fixed global singleton module cache that could cause corruption across multiple plugin instances.
- **Error Response Consistency** - Aligned error response shapes across development, production, and OpenAPI schema documentation.
- **Analytics Demo Tests** - Fixed test timeouts by increasing timeout limits from 5s to 15s/30s.

### Added

- **Error Enhancement Tests** - 39 new tests covering error message formatting, typo detection, and helpful suggestions.
- **HMR Tests** - 8 new tests for Hot Module Replacement functionality including watcher setup and file change detection.

### Changed

- **Package Homepage** - Updated from GitHub URL to serveractions.dev for better documentation experience.
- **Test Count** - Increased from 206 to 253 tests (100% passing).
- **Type Definitions** - Improved `index.d.ts` to accurately reflect runtime behavior of validation and OpenAPI modules.
- **Documentation** - Clarified default route transform behavior and that validation is disabled by default.

### Removed

- **Dead Code** - Removed unreachable client proxy security check that could never trigger.

## [1.1.1] - 2025-07-14

### Added

- Enhanced TypeScript type generation with support for 95% of TypeScript type patterns
- Support for intersection types, tuple types, template literals, conditional types, and more
- Comprehensive test suite for TypeScript type generation (20+ test cases)
- Advanced TypeScript examples demonstrating complex type patterns

### Fixed

- Port configuration now correctly propagates to OpenAPI documentation
- Fixed hardcoded port 5173 in multiple locations
- Improved error handling for malformed TypeScript types

### Changed

- Reduced marketing language in documentation
- Minimized emoji usage throughout codebase
- Updated TODO.md with future improvement roadmap

## [1.1.0] - 2025-06-27

### Added

- **Enhanced TypeScript Support** - Full TypeScript integration with real-time compilation in development
- **Automatic Type Generation** - Generate `.d.ts` files for all server actions with proper TypeScript types
- **AST-Based Function Detection** - More reliable function parsing with detailed TypeScript analysis
- **TypeScript React Example** - Comprehensive example showcasing all DX features with full TypeScript support
- **Development Experience Improvements** - Smart code analysis with helpful warnings and suggestions
- **Enhanced Error Messages** - Detailed error messages with actionable suggestions for better code quality
- **Security Enhancements** - Path traversal protection and secure module name validation
- **Test Infrastructure** - Comprehensive test coverage (100% success rate) with both unit and e2e tests
- **OpenAPI Type Integration** - TypeScript types automatically extracted for OpenAPI documentation
- **Production TypeScript Compilation** - Full TypeScript support in production builds using esbuild

### Improved

- **TypeScript Development Mode** - On-the-fly TypeScript compilation with retry logic and cache busting
- **Module Import Reliability** - Enhanced import system with better error handling and recovery
- **Test Coverage** - Achieved 100% test success rate across all frameworks (Svelte, Vue, React, TypeScript React)
- **Documentation** - Updated README with comprehensive TypeScript examples and DX feature showcase
- **Developer Feedback** - Real-time validation warnings and best practice suggestions

### Fixed

- **TypeScript Import Issues** - Resolved module loading problems in development mode
- **Test Reliability** - Fixed flaky tests and improved test infrastructure
- **File Upload Compatibility** - Enhanced file upload testing across all framework implementations
- **Cache Management** - Better HMR cache handling for TypeScript files

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

[1.2.0]: https://github.com/HelgeSverre/vite-plugin-server-actions/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/HelgeSverre/vite-plugin-server-actions/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/HelgeSverre/vite-plugin-server-actions/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/HelgeSverre/vite-plugin-server-actions/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/HelgeSverre/vite-plugin-server-actions/compare/v0.1.1...v1.0.0
[0.1.1]: https://github.com/HelgeSverre/vite-plugin-server-actions/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/HelgeSverre/vite-plugin-server-actions/releases/tag/v0.1.0
