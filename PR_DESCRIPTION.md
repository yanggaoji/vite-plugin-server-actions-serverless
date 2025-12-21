# Release v1.2.0 - Stability & Correctness Improvements

## Summary

This release focuses on stability, correctness, and documentation accuracy in preparation for wider public adoption. It includes critical bug fixes for falsy return values, validation adapter initialization, and error response consistency.

## Issues Addressed

- **Closes #3** - Port configuration now correctly propagates to OpenAPI documentation
- **Issue #5** - Verified that `fs` and other Node.js built-ins work correctly in `.server.ts` files (the existing TypeScript examples already demonstrate this working)

## Changes

### Critical Bug Fixes

| Issue                      | Fix                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Falsy Return Values**    | Server actions returning `0`, `false`, `""`, or `null` now work correctly. Actions returning `undefined` send HTTP 204 No Content |
| **Validation Adapter**     | Fixed bug where adapter configured as string `"zod"` wasn't properly instantiated                                                 |
| **Zod OpenAPI Conversion** | Added fallback converter for schemas without `.openapi()` metadata                                                                |
| **Error Response Shapes**  | Aligned error formats across dev, prod, and OpenAPI documentation                                                                 |

### Other Fixes

- **Production Validation Runtime** - Fixed dev/prod behavior mismatch for request body validation
- **Module Cache Isolation** - Prevents corruption across multiple plugin instances
- **Dead Code Removal** - Removed unreachable client proxy security check

### Type Definitions

- Added missing methods to `SchemaDiscovery` class (`hasSchema`, `clear`)
- Added missing methods to `ValidationAdapter` class (`toOpenAPISchema`, `getParameters`)
- Fixed `adapters` export type (was class reference, now properly typed)
- Added `defaultAdapter` and `defaultSchemaDiscovery` exports

### Documentation

- Clarified default route transform creates clean hierarchical paths
- Clarified that validation is disabled by default
- Updated README examples for accuracy

### Testing

- All **253 unit tests** passing
- All **E2E tests** passing (Svelte, Vue, React, React-TS)
- Added 39 error enhancement tests
- Added 8 HMR tests

## Testing Verification

```bash
# Unit tests
npm run test:run  # ✓ 253 tests passing

# Type checking
npm run typecheck  # ✓ No errors

# E2E tests (requires servers to be running)
npm run test:e2e  # ✓ All projects passing
```

## Breaking Changes

None - All changes are backward compatible.

## Version

Bump to 1.2.0 (minor version for new features and bug fixes)
