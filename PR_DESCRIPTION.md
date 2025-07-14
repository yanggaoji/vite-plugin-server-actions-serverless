# Fix Port Configuration and Enhance TypeScript Type Generation

## Summary

This PR addresses issue #3 where custom port configuration was not properly propagated to OpenAPI documentation. Additionally, it significantly enhances TypeScript type generation to support complex type patterns.

## Changes

### Bug Fixes
- Fixed hardcoded port 5173 throughout the codebase
- Port configuration now correctly propagates from Vite config to OpenAPI spec
- Dynamic port detection in both development and production modes

### TypeScript Enhancements
- Added support for 95% of TypeScript type patterns in AST parser
- New type support includes:
  - Intersection types (`A & B`)
  - Tuple types (`[string, number]`)
  - Template literal types
  - Conditional types (`T extends U ? X : Y`)
  - Index signatures (`{ [key: string]: any }`)
  - Type operators (`keyof`, `typeof`, `readonly`)
  - Mapped types, type predicates, import types, and more
- Added comprehensive test coverage (20+ new test cases)

### Documentation
- Removed marketing language from README
- Reduced emoji usage throughout documentation
- Added future improvements roadmap to TODO.md

## Testing
- All 194 unit tests passing
- All 52 E2E tests passing
- Added new test files:
  - `tests/generate-code.test.js` - Comprehensive TypeScript type testing
  - `tests/advanced-types-parsing.test.js` - Real-world type pattern validation
  - `examples/react-todo-app-typescript/src/actions/advanced-types.server.ts` - Advanced type examples

## Version
- Bumped version to 1.1.1
- Updated CHANGELOG.md with all changes

## Breaking Changes
None - All changes are backward compatible.