# Contributing to Vite Server Actions

Thank you for your interest in contributing to Vite Server Actions! This document provides guidelines and instructions for contributing to the project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (Node 16 reached EOL)
- npm or yarn
- Git

### Development Setup

```bash
# Clone the repository
git clone git@github.com:HelgeSverre/vite-plugin-server-actions.git
cd vite-plugin-server-actions

# Install dependencies
npm install

# Run tests in watch mode
npm test
```

## 📁 Project Structure

```
vite-plugin-server-actions/
├── src/                     # Plugin source code
│   ├── index.js            # Main plugin implementation
│   ├── validation.js       # Validation middleware
│   ├── openapi.js          # OpenAPI generation
│   ├── middleware.js       # Express middleware utilities
│   ├── build-utils.js      # Production build utilities
│   └── types.ts            # TypeScript type definitions
├── tests/                   # Test files
│   ├── index.test.js       # Core plugin tests
│   ├── validation.test.js  # Validation tests
│   ├── openapi.test.js     # OpenAPI generation tests
│   ├── e2e/                # End-to-end tests
│   └── production-build.test.js
├── examples/                # Example applications
│   ├── svelte-todo-app/    # Svelte todo example
│   ├── vue-todo-app/       # Vue todo example
│   └── react-todo-app/     # React todo example
├── docs/                    # Documentation
│   └── index.html          # Landing page for serveractions.dev
└── index.d.ts              # TypeScript definitions

```

## 🛠️ Development Commands

### Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run E2E tests with Playwright
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific test file
npm test validation.test.js
```

### Code Quality

```bash
# Check TypeScript types
npm run typecheck

# Format code with Prettier
npm run format

# Run all checks (tests, typecheck)
npm run check
```

### Working with Examples

```bash
# Run Svelte example in development
npm run example:svelte:dev

# Run Vue example in development
npm run example:vue:dev

# Run React example in development
npm run example:react:dev

# Build examples
npm run example:svelte:build
npm run example:vue:build
npm run example:react:build

# Test production build
cd examples/svelte-todo-app && npm run build && npm run preview
```

## 🧪 Writing Tests

### Unit Tests

Unit tests are located in `tests/` and use Vitest. Follow these patterns:

```javascript
import { describe, it, expect } from "vitest";

describe("Feature Name", () => {
  it("should do something specific", () => {
    // Arrange
    const input = createTestInput();

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### E2E Tests

E2E tests use Playwright and test all three framework examples with a shared test suite:

```javascript
import { test, expect } from "@playwright/test";

test.describe("Todo App Integration", () => {
  test("should add a new todo", async ({ page }) => {
    await page.goto("/");

    // Using data-testid for framework-agnostic testing
    await page.getByTestId("todo-input").fill("New todo");
    await page.getByTestId("add-button").click();

    await expect(page.getByTestId("todo-item")).toContainText("New todo");
  });
});
```

The E2E tests run against all three framework examples (Svelte, Vue, React) using the same test suite located in `tests/e2e/todo-app-shared.spec.js`.

## 📝 Coding Standards

### JavaScript Style

- Use ES modules (`import`/`export`)
- Use `async`/`await` over promises
- Prefer `const` over `let`
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Use tabs for indentation
- No semicolons (configured in Prettier)

### Commit Messages

Follow conventional commits:

```
feat: add validation middleware
fix: handle edge case in route transformation
docs: update README examples
test: add tests for production build
chore: update dependencies
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add/update tests as needed
5. Run `npm run check` to ensure all checks pass
6. Run `npm run format` to format your code
7. Commit your changes with a descriptive message
8. Push to your fork
9. Open a Pull Request with:
   - Clear description of changes
   - Link to related issue (if any)
   - Screenshots/demos for UI changes
   - Test results showing all tests pass

## 🐛 Reporting Issues

When reporting issues, please include:

- Node.js version
- Vite version
- Plugin version
- Minimal reproduction code
- Error messages/stack traces
- Expected vs actual behavior

## 💡 Feature Requests

Feature requests are welcome! Please:

- Check existing issues first
- Provide use cases and examples
- Explain why this would benefit users
- Consider submitting a PR if you can implement it

## 🔒 Security

If you discover a security vulnerability, please email helge.sverre@gmail.com instead of using the issue tracker.

## 🚢 Release Process

Releases are managed through GitHub Actions:

1. Update version in `package.json`
2. Update `CHANGELOG.md` with release notes
3. Commit with message: `chore: release v{version}`
4. Create and push a tag: `git tag v{version} && git push origin v{version}`
5. GitHub Actions will automatically publish to npm

## 📚 Resources

- [Plugin Documentation](https://serveractions.dev)
- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)
- [Express.js Documentation](https://expressjs.com/)
- [Zod Documentation](https://zod.dev/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Playwright Documentation](https://playwright.dev/)

## ❓ Questions?

Feel free to open a discussion or reach out in issues if you have questions about contributing.

---

Thank you for contributing to Vite Server Actions! 🎉
