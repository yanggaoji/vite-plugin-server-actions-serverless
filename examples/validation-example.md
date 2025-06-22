# Validation and OpenAPI Features

This example demonstrates the new validation and OpenAPI features in vite-plugin-server-actions.

## Configuration

```javascript
// vite.config.js
import { defineConfig } from "vite";
import serverActions, { middleware } from "vite-plugin-server-actions";

export default defineConfig({
  plugins: [
    serverActions({
      validation: {
        enabled: true,                    // Enable validation
        adapter: "zod",                   // Use Zod adapter (default)
        generateOpenAPI: true,            // Generate OpenAPI spec
        swaggerUI: true,                  // Enable Swagger UI in development
        openAPIOptions: {
          info: {
            title: "My API",
            version: "1.0.0",
            description: "API with auto-generated documentation",
          },
          docsPath: "/api/docs",          // Swagger UI endpoint
          specPath: "/api/openapi.json",  // OpenAPI spec endpoint
        },
      },
      middleware: [
        middleware.logging,               // Optional: Add logging middleware
      ],
    }),
  ],
});
```

## Server Functions with Validation

```javascript
// actions/user.server.js
import { z } from "zod";

// Define validation schemas
const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email format"),
  age: z.number().int().min(0).max(120).optional(),
  role: z.enum(["user", "admin"]).default("user"),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  age: z.number().int().min(0).max(120).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

const UserIdSchema = z.number().int().positive();

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email address
 * @param {number} [userData.age] - User's age
 * @param {'user'|'admin'} [userData.role='user'] - User's role
 * @returns {Promise<Object>} The created user
 */
export async function createUser(userData) {
  // Validation happens automatically via middleware
  // userData is guaranteed to be valid here
  
  const user = {
    id: Date.now(),
    ...userData,
    createdAt: new Date().toISOString(),
  };
  
  // Save to database...
  return user;
}

/**
 * Update a user
 * @param {number} id - User ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} The updated user
 */
export async function updateUser(id, updates) {
  // Both id and updates are validated
  // Implementation...
}

/**
 * Delete a user
 * @param {number} id - User ID to delete
 * @returns {Promise<void>}
 */
export async function deleteUser(id) {
  // id is validated as positive integer
  // Implementation...
}

// Attach schemas to functions
createUser.schema = CreateUserSchema;
updateUser.schema = z.tuple([UserIdSchema, UpdateUserSchema]);
deleteUser.schema = z.tuple([UserIdSchema]);
```

## Client Usage

```javascript
// Client-side code remains the same
import { createUser, updateUser } from "./actions/user.server.js";

try {
  const user = await createUser({
    name: "John Doe",
    email: "john@example.com",
    age: 30,
  });
  console.log("User created:", user);
} catch (error) {
  // Validation errors are automatically handled
  console.error("Validation failed:", error.details);
}
```

## Features

### 🔒 Automatic Validation
- Request validation using Zod schemas
- Detailed error messages with field-level information
- Type-safe validation with TypeScript support

### 📚 Auto-Generated Documentation
- OpenAPI 3.0 specification generation
- Interactive Swagger UI in development
- Schema-driven parameter documentation

### 🔧 Flexible Configuration
- Pluggable validation adapters
- Customizable OpenAPI generation
- Development vs production modes

### 🚀 Developer Experience
- Zero-config validation with sensible defaults
- Detailed validation error reporting
- Hot-reload compatible

## Available Endpoints

When running in development mode with validation enabled:

- `GET /api/openapi.json` - OpenAPI specification
- `GET /api/docs` - Swagger UI documentation
- `POST /api/[module]/[function]` - Server action endpoints

## Error Handling

Validation errors return structured responses:

```json
{
  "error": "Validation failed",
  "details": "Validation error details",
  "validationErrors": [
    {
      "path": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ]
}
```

## Advanced Usage

### Custom Validation Adapter

```javascript
import { ValidationAdapter } from "vite-plugin-server-actions";

class CustomAdapter extends ValidationAdapter {
  async validate(schema, data) {
    // Implement custom validation logic
    return { success: true, data };
  }
  
  toOpenAPISchema(schema) {
    // Convert to OpenAPI schema
    return { type: "object" };
  }
}

// Use in configuration
serverActions({
  validation: {
    enabled: true,
    adapter: new CustomAdapter(),
  },
})
```

### Programmatic Schema Registration

```javascript
import { defaultSchemaDiscovery } from "vite-plugin-server-actions";

// Register schemas programmatically
defaultSchemaDiscovery.registerSchema("users", "createUser", CreateUserSchema);
```