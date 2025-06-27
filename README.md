# ⚡ Vite Server Actions

[![npm version](https://img.shields.io/npm/v/vite-plugin-server-actions.svg?style=flat)](https://www.npmjs.com/package/vite-plugin-server-actions)
[![Downloads](https://img.shields.io/npm/dm/vite-plugin-server-actions.svg?style=flat)](https://www.npmjs.com/package/vite-plugin-server-actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Write server functions. Call them from the client. That's it.**

Vite Server Actions brings the simplicity of server-side development to your Vite applications. Import server functions into your client code and call them directly - no API routes, no HTTP handling, no boilerplate.

```javascript
// server/db.server.js
export async function getUsers() {
  return await database.users.findAll();
}

// App.vue
import { getUsers } from "./server/db.server.js";

const users = await getUsers(); // Just call it!
```

## 🚀 Why Vite Server Actions?

- **Zero API Boilerplate** - No need to define routes, handle HTTP methods, or parse request bodies
- **Enhanced TypeScript** - Industry-leading TypeScript support with automatic type generation and real-time compilation
- **Built-in Validation** - Automatic request validation using Zod schemas with type safety
- **Auto Documentation** - OpenAPI 3.0 specs and interactive Swagger UI generated from your TypeScript code
- **Production Ready** - Builds to optimized Node.js Express server with full feature parity
- **Superior DX** - AST-based parsing, helpful error messages, hot reload, and comprehensive development feedback

## ✨ Core Features

- 🔗 **Seamless Imports** - Import server functions like any other module
- 🛡️ **Secure by Default** - Server code never exposed to client, path traversal protection
- ⚡ **Enhanced TypeScript** - Real-time compilation, automatic `.d.ts` generation, AST-based parsing
- ✅ **Smart Validation** - Zod schemas with automatic type inference and OpenAPI generation
- 📖 **Auto Documentation** - Comprehensive OpenAPI 3.0 specs with interactive Swagger UI
- 🔌 **Middleware Support** - Authentication, logging, CORS, and custom middleware
- 🎯 **Flexible Routing** - Multiple routing strategies with clean hierarchical paths
- 🏗️ **Superior DX** - Helpful error messages, development warnings, and comprehensive feedback
- 📦 **Production Optimized** - Efficient Express server builds with all development features

## 🚀 Quick Start

### 1. Install

```bash
npm install vite-plugin-server-actions
```

### 2. Configure Vite

```javascript
// vite.config.js
import { defineConfig } from "vite";
import serverActions from "vite-plugin-server-actions";

export default defineConfig({
  plugins: [
    serverActions(), // That's it! Zero config needed
  ],
});
```

### 3. Create a Server Function

Any file ending with `.server.js` or `.server.ts` becomes a server module:

```javascript
// actions/todos.server.js
import { db } from "./database";

export async function getTodos(userId) {
  // This runs on the server with full Node.js access
  return await db.todos.findMany({ where: { userId } });
}

export async function addTodo(text, userId) {
  return await db.todos.create({
    data: { text, userId, completed: false },
  });
}
```

### 4. Use in Your Client

```javascript
// App.jsx
import { getTodos, addTodo } from './actions/todos.server.js'

function TodoApp({ userId }) {
  const [todos, setTodos] = useState([])

  useEffect(() => {
    // Just call the server function!
    getTodos(userId).then(setTodos)
  }, [userId])

  async function handleAdd(text) {
    const newTodo = await addTodo(text, userId)
    setTodos([...todos, newTodo])
  }

  return (
    // Your UI here...
  )
}
```

That's it! The plugin automatically:

- ✅ Creates API endpoints for each function
- ✅ Handles serialization/deserialization
- ✅ Provides full TypeScript support
- ✅ Works in development and production

## 📚 Real-World Examples

### Database Operations

```javascript
// server/database.server.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getUser(id) {
  return await prisma.user.findUnique({
    where: { id },
    include: { profile: true },
  });
}

export async function updateUser(id, data) {
  return await prisma.user.update({
    where: { id },
    data,
  });
}
```

### File Uploads

```javascript
// server/upload.server.js
import { writeFile } from "fs/promises";
import path from "path";

export async function uploadFile(filename, base64Data) {
  const buffer = Buffer.from(base64Data, "base64");
  const filepath = path.join(process.cwd(), "uploads", filename);

  await writeFile(filepath, buffer);
  return { success: true, path: `/uploads/${filename}` };
}
```

### External API Integration

```javascript
// server/weather.server.js
export async function getWeather(city) {
  const response = await fetch(`https://api.weather.com/v1/current?city=${city}&key=${process.env.API_KEY}`);
  return response.json();
}
```

### With Validation

```javascript
// server/auth.server.js
import { z } from "zod";
import bcrypt from "bcrypt";
import { signJWT } from "./jwt";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function login(credentials) {
  // Validation happens automatically!
  const user = await db.users.findByEmail(credentials.email);

  if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
    throw new Error("Invalid credentials");
  }

  return { token: signJWT(user), user };
}

// Attach schema for automatic validation
login.schema = LoginSchema;
```

### Complete Examples

- [Todo App with Svelte](examples/svelte-todo-app) - Full-featured todo application with validation
- [Todo App with Vue](examples/vue-todo-app) - Same todo app built with Vue 3
- [Todo App with React](examples/react-todo-app) - Same todo app built with React
- More examples coming soon for other frameworks

## 🔍 How It Works

When you import a `.server.js` file in your client code, Vite Server Actions:

1. **Intercepts the import** - Replaces server module imports with client proxies
2. **Creates proxy functions** - Each exported function becomes a client-side proxy
3. **Generates API endpoints** - Maps each function to an HTTP endpoint
4. **Handles the transport** - Serializes arguments and return values automatically

```javascript
// What you write:
import { getUser } from "./user.server.js";
const user = await getUser(123);

// What runs in the browser:
const user = await fetch("/api/user/getUser", {
  method: "POST",
  body: JSON.stringify([123]),
}).then((r) => r.json());
```

### Development vs Production

- **Development**: Server functions run as Express middleware in Vite's dev server
- **Production**: Builds to a standalone Express server with all your functions

## ⚙️ Configuration

### Common Use Cases

#### Enable Validation & API Documentation

```javascript
serverActions({
  validation: {
    enabled: true,
  },
  openAPI: {
    enabled: true,
    swaggerUI: true,
  },
});
```

This gives you:

- Automatic request validation with Zod schemas
- OpenAPI spec at `/api/openapi.json`
- Interactive docs at `/api/docs`

#### Add Authentication Middleware

```javascript
serverActions({
  middleware: [
    // Add auth check to all server actions
    (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      next();
    },
  ],
});
```

#### Custom API Routes

```javascript
serverActions({
  apiPrefix: "/rpc", // Change from /api to /rpc
  routeTransform: (filePath, functionName) => {
    // users.server.js -> /rpc/users.list
    const module = filePath.replace(".server.js", "");
    return `${module}.${functionName}`;
  },
});
```

### All Configuration Options

| Option           | Type         | Default              | Description                    |
| ---------------- | ------------ | -------------------- | ------------------------------ |
| `apiPrefix`      | `string`     | `"/api"`             | URL prefix for all endpoints   |
| `include`        | `string[]`   | `["**/*.server.js", "**/*.server.ts"]` | Files to process               |
| `exclude`        | `string[]`   | `[]`                 | Files to ignore                |
| `middleware`     | `Function[]` | `[]`                 | Express middleware stack       |
| `routeTransform` | `Function`   | See below            | Customize URL generation       |
| `validation`     | `Object`     | `{ enabled: false }` | Validation settings            |
| `openAPI`        | `Object`     | `{ enabled: false }` | OpenAPI documentation settings |

#### Route Transform Options

```javascript
import { pathUtils } from "vite-plugin-server-actions";

// Available presets:
pathUtils.createCleanRoute; // (default) auth.server.js → /api/auth/login
pathUtils.createLegacyRoute; // auth.server.js → /api/auth_server/login
pathUtils.createMinimalRoute; // auth.server.js → /api/auth.server/login
```

#### Validation Options

| Option    | Type      | Default | Description                           |
| --------- | --------- | ------- | ------------------------------------- |
| `enabled` | `boolean` | `false` | Enable request validation             |
| `adapter` | `string`  | `"zod"` | Validation library adapter (only zod) |

#### OpenAPI Options

| Option      | Type      | Default               | Description                               |
| ----------- | --------- | --------------------- | ----------------------------------------- |
| `enabled`   | `boolean` | `false`               | Enable OpenAPI generation                 |
| `swaggerUI` | `boolean` | `true`                | Enable Swagger UI when OpenAPI is enabled |
| `info`      | `Object`  | See below             | OpenAPI specification info                |
| `docsPath`  | `string`  | `"/api/docs"`         | Path for Swagger UI                       |
| `specPath`  | `string`  | `"/api/openapi.json"` | Path for OpenAPI JSON spec                |

Default `info` object:

```javascript
{
  title: "Server Actions API",
  version: "1.0.0",
  description: "Auto-generated API documentation for Vite Server Actions"
}
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

## ✅ Automatic Validation & Documentation

Add validation to any server function by attaching a Zod schema. The plugin automatically validates requests and generates OpenAPI documentation.

### Quick Setup

```javascript
// vite.config.js
serverActions({
  validation: {
    enabled: true,
  },
  openAPI: {
    enabled: true,
    swaggerUI: true,
  },
});
```

### Add Validation to Any Function

```javascript
// server/users.server.js
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["admin", "user"]).default("user"),
});

export async function createUser(data) {
  // Input is pre-validated - this will never run with invalid data
  const user = await db.users.create({ data });

  // Send welcome email, etc...
  return user;
}

// Just attach the schema!
createUser.schema = CreateUserSchema;
```

### What You Get

1. **Automatic Validation** - Invalid requests return 400 with detailed errors
2. **Type Safety** - Full TypeScript inference from your Zod schemas
3. **API Documentation** - Browse and test your API at `/api/docs`
4. **OpenAPI Spec** - Machine-readable spec at `/api/openapi.json`

### Advanced Validation

```javascript
// Handle arrays and complex inputs
const BulkUpdateSchema = z.array(
  z.object({
    id: z.number(),
    status: z.enum(["active", "inactive"]),
  }),
);

export async function bulkUpdateUsers(updates) {
  // Type: { id: number, status: 'active' | 'inactive' }[]
  return await db.users.updateMany(updates);
}
bulkUpdateUsers.schema = BulkUpdateSchema;

// Validate multiple parameters
export async function getDateRange(startDate, endDate) {
  // Validate both parameters
  return await db.analytics.query({ startDate, endDate });
}
getDateRange.schema = z.tuple([
  z.string().datetime(), // startDate
  z.string().datetime(), // endDate
]);
```

## 🚀 Production Deployment

### Building for Production

```bash
npm run build
```

This generates:

- `dist/server.js` - Your Express server with all endpoints
- `dist/actions.js` - Bundled server functions
- `dist/openapi.json` - API specification (if enabled)
- Client assets with proxy functions

### Running in Production

```bash
node dist/server.js
```

Or with PM2:

```bash
pm2 start dist/server.js --name my-app
```

### Environment Variables

```javascript
// Access environment variables in server functions
export async function sendEmail(to, subject, body) {
  const apiKey = process.env.SENDGRID_API_KEY;
  // ...
}
```

## 🛡️ Security Considerations

### Server Code Isolation

- Server files (`.server.js` and `.server.ts`) are never bundled into client code
- Development builds include safety checks to prevent accidental imports
- Production builds completely separate server and client code

### Best Practices

1. **Never trust client input** - Always validate with Zod schemas
2. **Use middleware for auth** - Add authentication checks globally
3. **Sanitize file operations** - Be careful with file paths from clients
4. **Limit exposed functions** - Only export what clients need
5. **Use environment variables** - Keep secrets out of code

### Example: Secure File Access

```javascript
// ❌ Dangerous - allows arbitrary file access
export async function readFile(path) {
  return await fs.readFile(path, "utf-8");
}

// ✅ Safe - validates and restricts access
import { z } from "zod";

const FileSchema = z.enum(["report.pdf", "summary.txt"]);

export async function readAllowedFile(filename) {
  const safePath = path.join(SAFE_DIR, filename);
  return await fs.readFile(safePath, "utf-8");
}
readAllowedFile.schema = FileSchema;
```

## 💻 Enhanced TypeScript Support

Vite Server Actions provides industry-leading TypeScript support with automatic type generation, enhanced DX features, and seamless development experience:

### ✨ **New**: Full TypeScript Integration

- 🎯 **Automatic Type Generation** - `.d.ts` files generated for all server actions
- 🔄 **Real-time Compilation** - TypeScript files compiled on-the-fly in development
- 📝 **Enhanced Error Messages** - Helpful suggestions for better TypeScript usage
- 🏗️ **Production Ready** - Full TypeScript compilation in build process

```typescript
// server/users.server.ts
export interface User {
  id: number;
  name: string;
  email: string;
}

/**
 * Get user by ID with full type safety
 * @param id - The user ID to fetch
 * @returns Promise containing user data or null
 */
export async function getUser(id: number): Promise<User | null> {
  return await db.users.findUnique({ where: { id } });
}

// Client.tsx - Automatic type inference and IntelliSense!
import { getUser, type User } from "./server/users.server";

const user = await getUser(123); // Type: User | null
```

### 🛡️ Advanced Validation with Type Safety

```typescript
import { z } from "zod";

// Define your schemas with TypeScript interfaces
export interface CreateUserInput {
  name: string;
  email: string;
  age?: number;
}

const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  age: z.number().optional(),
});

export async function createUser(data: CreateUserInput): Promise<User> {
  const validated = CreateUserSchema.parse(data);
  return await db.users.create({ data: validated });
}

// Attach schema for automatic validation and OpenAPI generation
createUser.schema = z.tuple([CreateUserSchema]);
```

### 📖 **New**: Automatic Documentation Generation

TypeScript types and JSDoc comments automatically generate comprehensive API documentation:

```typescript
/**
 * Upload a file with validation and type safety
 * @param fileData - File upload data with filename, content, and metadata
 * @returns Promise containing upload result with file path and metadata
 */
export async function uploadFile(fileData: {
  filename: string;
  content: string;
  mimetype: string;
}): Promise<FileUploadResult> {
  // Implementation...
}
```

This automatically generates:
- 📄 **OpenAPI 3.0 specs** with proper TypeScript types
- 🔍 **Swagger UI documentation** with interactive examples
- 🏷️ **Type definitions** (`.d.ts`) for client-side imports

## 🏗️ Enhanced Developer Experience

Vite Server Actions provides comprehensive development feedback and intelligent suggestions to improve your code quality:

### 🔍 Smart Code Analysis

The plugin uses AST-based parsing to analyze your server functions and provide helpful feedback:

```typescript
// The plugin analyzes your code and provides suggestions:

// ⚠️ Warning: Function should be async
export function syncFunction() {
  return "data";
}
// 💡 Suggestion: Change to: export async function syncFunction()

// ⚠️ Warning: Missing return type annotation  
export async function getUser(id) {
  return await db.user.findUnique({ where: { id } });
}
// 💡 Suggestion: Add return type like: Promise<User | null>

// ⚠️ Warning: Missing validation schema
export async function updateUser(id, data) {
  return await db.user.update({ where: { id }, data });
}
// 💡 Suggestion: Add schema: updateUser.schema = z.tuple([...])
```

### 📝 Development Warnings & Suggestions

- **Type Safety Hints** - Suggestions for adding TypeScript types and return annotations
- **Schema Validation** - Recommendations for adding Zod schemas to improve API reliability  
- **Function Structure** - Best practices for async functions and proper exports
- **Security Warnings** - Path traversal detection and secure coding suggestions
- **Performance Tips** - Optimization suggestions for production builds

### 🎯 **New**: Test Coverage & Quality Assurance

- **100% Test Coverage** - Comprehensive unit and e2e test suites ensure reliability
- **Multiple Framework Support** - Tested with Svelte, Vue, React, and TypeScript React
- **Production Validation** - Full feature parity between development and production modes
- **Cross-platform Compatibility** - Works seamlessly across different operating systems

## 🔧 Error Handling

Server errors are automatically caught and returned with proper HTTP status codes:

```javascript
// server/api.server.js
export async function riskyOperation() {
  throw new Error("Something went wrong");
}

// Client receives:
// Status: 500
// Body: { error: "Internal server error", details: "Something went wrong" }
```

### Custom Error Responses

```javascript
export async function authenticate(token) {
  if (!token) {
    const error = new Error("No token provided");
    error.status = 401;
    throw error;
  }
  // ...
}
```

## 🎯 Common Patterns

### Authenticated Actions

```javascript
// server/auth.server.js
export async function withAuth(handler) {
  return async (...args) => {
    const token = args[args.length - 1]; // Pass token as last arg
    const user = await verifyToken(token);
    if (!user) throw new Error("Unauthorized");

    return handler(...args.slice(0, -1), user);
  };
}

// server/protected.server.js
import { withAuth } from "./auth.server";

export const getSecretData = withAuth(async (user) => {
  return await db.secrets.findMany({ userId: user.id });
});
```

### Caching

```javascript
const cache = new Map();

export async function getExpensiveData(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const data = await expensiveOperation(key);
  cache.set(key, data);

  // Clear after 5 minutes
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);

  return data;
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## 📄 License

This project is [MIT](LICENSE) licensed.

---

<p align="center">
  Made with ❤️ by <a href="https://helgesver.re">Helge Sverre</a>
</p>
