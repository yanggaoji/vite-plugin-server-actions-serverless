# Contributing to Vite Server Actions

Thank you for your interest in contributing to Vite Server Actions! This document provides guidelines and instructions for contributing to the project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
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
├── src/                  # Plugin source code
│   ├── index.js         # Main plugin implementation
│   ├── validation.js    # Validation middleware
│   ├── openapi.js       # OpenAPI generation
│   └── build-utils.js   # Production build utilities
├── tests/               # Test files
│   ├── index.test.js    # Unit tests
│   ├── e2e/            # End-to-end tests
│   └── production-build.test.js
├── examples/            # Example applications
│   └── svelte-todo-app/       # Svelte todo example
└── docs/               # Documentation

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
# Check code with ESLint
npm run lint

# Fix auto-fixable lint issues
npm run lint:fix

# Check TypeScript types
npm run typecheck

# Format code with Prettier
npm run format

# Run all checks (tests, lint, typecheck)
npm run check
```

### Working with Examples

```bash
# Run the example app in development
npm run example:svelte:dev

# Build the example app
npm run example:svelte:build

# Test production build
cd examples/svelte-todo-app && npm run build && node dist/server.js
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

E2E tests use Playwright and test the example applications:

```javascript
import { test, expect } from "@playwright/test";

test("user can add todo", async ({ page }) => {
  await page.goto("/");
  await page.fill('input[type="text"]', "New todo");
  await page.click('button:has-text("Add")');

  await expect(page.locator("li")).toContainText("New todo");
});
```

## 📝 Coding Standards

### JavaScript Style

- Use ES modules (`import`/`export`)
- Use `async`/`await` over promises
- Prefer `const` over `let`
- Use meaningful variable names
- Add JSDoc comments for public APIs

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
6. Commit your changes with a descriptive message
7. Push to your fork
8. Open a Pull Request with:
   - Clear description of changes
   - Link to related issue (if any)
   - Screenshots/demos for UI changes

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

## 📚 Resources

- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)
- [Express.js Documentation](https://expressjs.com/)
- [Zod Documentation](https://zod.dev/)
- [OpenAPI Specification](https://swagger.io/specification/)

## ❓ Questions?

Feel free to open a discussion or reach out in issues if you have questions about contributing.

---

Thank you for contributing to Vite Server Actions! 🎉
