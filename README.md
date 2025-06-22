# ⚡ Vite Server Actions

[![npm version](https://img.shields.io/npm/v/vite-plugin-server-actions.svg?style=flat)](https://www.npmjs.com/package/vite-plugin-server-actions)
[![Downloads](https://img.shields.io/npm/dm/vite-plugin-server-actions.svg?style=flat)](https://www.npmjs.com/package/vite-plugin-server-actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🚧 **Experimental:** This is currently a proof of concept. Use at your own risk.

**Vite Server Actions** is a Vite plugin that enables you to create server-side functions and call them from your
client-side code as if they were local functions.

## ✨ Features

- 🔄 Automatic API endpoint creation for server functions (e.g. `POST /api/todos/addTodo`)
- 🔗 Seamless client-side proxies for easy usage (e.g. `import {addTodo} from './server/todos.server.js'`)
- 🛠 Support for both development and production environments ( `vite build` )
- 🚀 Zero-config setup for instant productivity

## 🚀 Quick Start

1. Install the plugin:

```bash
# Install using npm
npm install vite-plugin-server-actions

# Or using yarn
yarn add vite-plugin-server-actions
```

2. Add it to your `vite.config.js` file ([example](examples/todo-app/vite.config.js)):

```javascript
// vite.config.js
import { defineConfig } from "vite";

// Import the plugin
import serverActions from "vite-plugin-server-actions";

export default defineConfig({
  plugins: [
    // Add the plugin
    serverActions(),
  ],
});
```

2. Create a server action file (e.g., `todo.server.js`):

You can put it anywhere in your project, but it has to end with `.server.js`.

```javascript
// ex: src/actions/todo.server.js
import fs from "fs";
import path from "path";

const TODO_FILE_PATH = path.join(process.cwd(), "list-of-todos.json");

export async function deleteTodoById(id) {
  const data = fs.readFileSync(TODO_FILE_PATH, "utf-8");
  const todos = JSON.parse(data);
  const newTodos = todos.filter((todo) => todo.id !== id);
  fs.writeFileSync(TODO_FILE_PATH, JSON.stringify(newTodos, null, 2));
}

export async function saveTodoToJsonFile(todo) {
  const data = fs.readFileSync(TODO_FILE_PATH, "utf-8");
  const todos = JSON.parse(data);
  todos.push(todo);
  fs.writeFileSync(TODO_FILE_PATH, JSON.stringify(todos, null, 2));
}

export async function listTodos() {
  const data = fs.readFileSync(TODO_FILE_PATH, "utf-8");
  return JSON.parse(data);
}
```

4. Import and use your server actions in your client-side code:

```svelte
<!-- ex: src/App.svelte -->
<script>
  import { deleteTodoById, listTodos, saveTodoToJsonFile } from "./actions/todo.server.js";

  let todos = [];
  let newTodoText = "";

  async function fetchTodos() {
    todos = await listTodos();
  }

  async function addTodo() {
    await saveTodoToJsonFile({ id: Math.random(), text: newTodoText });
    newTodoText = "";
    await fetchTodos();
}

  async function removeTodo(id) {
    await deleteTodoById(id);
    await fetchTodos();
}

  fetchTodos();
</script>

<div>
  <h1>Todos</h1>
  <ul>
    {#each todos as todo}
    <li>
      {todo.text}
      <button on:click="{() => removeTodo(todo.id)}">Remove</button>
    </li>
    {/each}
  </ul>
  <input type="text" bind:value="{newTodoText}" />
  <button on:click="{addTodo}">Add Todo</button>
</div>
```

That's it! Your server actions are now ready to use. 🎉

## 📝 Examples

To see a real-world example of how to use Vite Server Actions, check out the TODO app example:

- [TODO App Example](examples/todo-app/README.md)

## 📚 How it works

**Vite Server Actions** creates an API endpoint for each server function you define. When you import a server action in
your client-side code, it returns a proxy function that sends a request to the server endpoint instead of executing the
function locally.

### Module Naming

To prevent collisions between files with the same name in different directories, the plugin generates unique module names based on the file path:

- `src/actions/auth.server.js` → Module name: `src_actions_auth`
- `src/admin/auth.server.js` → Module name: `src_admin_auth`

This ensures that server functions are accessible at unique endpoints like:

- `/api/src_actions_auth/login`
- `/api/src_admin_auth/login`

In _development_, the server actions run as a middleware in the Vite dev server.
While in _production_, it's bundled into a single file that can be run with Node.js.

## 🔧 Configuration

Vite Server Actions works out of the box, but you can customize it by passing options to the plugin:

```javascript
serverActions({
  apiPrefix: "/custom-api", // Custom API prefix (default: '/api')
  include: "**/*.server.js", // Include patterns (default: ['**/*.server.js'])
  exclude: ["**/node_modules/**"], // Exclude patterns (default: [])
});
```

## 🛠️ Configuration Options

| Option       | Type                                 | Default              | Description                                          |
| ------------ | ------------------------------------ | -------------------- | ---------------------------------------------------- |
| `apiPrefix`  | `string`                             | `"/api"`             | The URL prefix for server action endpoints           |
| `include`    | `string \| string[]`                 | `["**/*.server.js"]` | Glob patterns for files to process as server actions |
| `exclude`    | `string \| string[]`                 | `[]`                 | Glob patterns for files to exclude from processing   |
| `middleware` | `RequestHandler \| RequestHandler[]` | `[]`                 | Express middleware to run before server actions      |

### Examples

**Custom API prefix:**

```javascript
serverActions({
  apiPrefix: "/server",
});
// Server actions will be available at /server/moduleName/functionName
```

**Include only specific directories:**

```javascript
serverActions({
  include: ["src/actions/**/*.server.js", "src/api/**/*.server.js"],
});
```

**Exclude test files:**

```javascript
serverActions({
  exclude: ["**/*.test.server.js", "**/*.spec.server.js"],
});
```

## 🔍 Built-in Middleware

### Logging Middleware

Vite Server Actions includes a built-in logging middleware that provides detailed console output for debugging:

```javascript
import serverActions, { middleware } from "vite-plugin-server-actions";

export default defineConfig({
  plugins: [
    serverActions({
      middleware: middleware.logging,
    }),
  ],
});
```

The logging middleware displays:

- 🚀 Action trigger details (module, function, endpoint)
- 📦 Formatted request body with syntax highlighting
- ✅ Response time and data
- ❌ Error responses with status codes

Example output:

```
[2024-01-21T10:30:45.123Z] 🚀 Server Action Triggered
├─ Module: src_actions_todo
├─ Function: addTodo
├─ Method: POST
└─ Endpoint: /api/src_actions_todo/addTodo

📦 Request Body:
{
  text: 'Buy groceries',
  priority: 'high'
}

✅ Response sent in 25ms
📤 Response data:
{
  id: 1,
  text: 'Buy groceries',
  priority: 'high',
  completed: false
}
──────────────────────────────────────────────────
```

### Custom Middleware

You can add your own Express middleware for authentication, validation, etc:

```javascript
import serverActions from "vite-plugin-server-actions";

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Verify token...
  next();
};

// CORS middleware
const corsMiddleware = (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
};

export default defineConfig({
  plugins: [
    serverActions({
      middleware: [corsMiddleware, authMiddleware],
    }),
  ],
});
```

## TODO

This is a proof of concept, and things are still missing, such as:

- [x] Add configuration options
- [x] Add tests
- [ ] Allow customizing the HTTP method for each action (e.g. `GET`, `POST`, `PUT`, `DELETE`)
- [x] Make sure name collisions are handled correctly
- [ ] Make sure the actions are only available on the server when running in production mode.
- [ ] Add more examples (Vue, React, etc.)
- [ ] Publish to npm

## 🧑‍💻 Development Setup

To set up the project for development, follow these steps:

### Getting Started

```shell
# Clone the repository
git clone git@github.com:HelgeSverre/vite-plugin-server-actions.git
cd vite-plugin-server-actions

# Install dependencies
npm install
```

### Development Commands

```shell
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Check code quality with ESLint
npm run lint

# Fix auto-fixable lint issues
npm run lint:fix

# Check TypeScript types
npm run typecheck

# Format code with Prettier
npm run format

# Sort package.json
npm run sort

# Run the example app in development mode
npm run example:dev

# Build the example app
npm run example:build
```

### Testing

The project uses [Vitest](https://vitest.dev/) for testing. Tests are located in `src/index.test.js` and cover:

- Plugin initialization and configuration
- Server action file processing
- Error handling for malformed code
- Module name collision prevention
- Configuration options (apiPrefix, include/exclude)
- Client proxy generation

To write new tests, follow the existing patterns and ensure you mock external dependencies properly.

### Code Quality

The project enforces code quality through:

- **ESLint** - Modern ESLint configuration with sensible defaults
- **Prettier** - Code formatting (via `npm run format`)
- **TypeScript** - Type checking for better developer experience
- **Husky** - Git hooks for automatic quality checks
- **Lint-staged** - Run linters on staged files only

### Before Committing

Run all quality checks with a single command:

```shell
npm run check
```

This runs tests, linting, and type checking. These checks also run automatically:

- **On commit** - Lint-staged runs on changed files
- **On push** - All checks run to ensure code quality

## 📝 License

This project is [MIT](https://opensource.org/licenses/MIT) licensed.
