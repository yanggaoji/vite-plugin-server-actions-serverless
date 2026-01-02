# Creating Custom Adapters for Serverless Platforms

This guide shows you how to create custom adapters for any serverless platform. The adapter pattern in Vite Server Actions is designed to be extensible and platform-agnostic.

## Overview

The `BaseAdapter` class provides a common interface that can be implemented for any serverless platform. You can create adapters for:

- **Azure Functions**
- **Google Cloud Functions**
- **Vercel Serverless Functions**
- **Netlify Functions**
- **Alibaba Cloud Function Compute**
- **Tencent Cloud SCF**
- **Any other serverless platform**

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Your Platform                       │
│                   (Request/Response)                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Custom Adapter       │
         │  - normalizeRequest()  │
         │  - createResponse()    │
         │  - handleRequest()     │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │    BaseAdapter         │
         │  - Route matching      │
         │  - Middleware chain    │
         │  - Common logic        │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │   Server Actions       │
         │  (Your business logic) │
         └────────────────────────┘
```

## Step 1: Extend BaseAdapter

Create a new adapter by extending the `BaseAdapter` class:

```javascript
import { BaseAdapter } from "vite-plugin-server-actions";

export class MyPlatformAdapter extends BaseAdapter {
  constructor() {
    super();
  }

  /**
   * Convert platform-specific request to normalized format
   */
  async normalizeRequest(platformRequest) {
    return {
      method: platformRequest.method || "GET",
      url: platformRequest.path || "/",
      path: platformRequest.path || "/",
      headers: this.normalizeHeaders(platformRequest.headers),
      body: await this.parseBody(platformRequest),
      query: platformRequest.queryStringParameters || {},
      rawRequest: platformRequest, // Keep original for platform-specific needs
    };
  }

  /**
   * Create a normalized response wrapper
   */
  createResponse() {
    const response = {
      statusCode: 200,
      headers: {},
      body: null,
    };

    const wrapper = {
      status(code) {
        response.statusCode = code;
        return wrapper;
      },
      json(data) {
        response.body = JSON.stringify(data);
        response.headers["Content-Type"] = "application/json";
        wrapper._finished = true;
      },
      end() {
        if (!response.body) {
          response.body = "";
        }
        wrapper._finished = true;
      },
      header(key, value) {
        response.headers[key] = value;
        return wrapper;
      },
      _getResponse() {
        return response;
      },
      _finished: false,
    };

    return wrapper;
  }

  /**
   * Handle the request and return platform-specific response
   */
  async handleRequest(platformRequest, context) {
    const req = await this.normalizeRequest(platformRequest);
    const res = this.createResponse();

    // Apply global middleware
    const handlers = [...(this.globalMiddleware || [])];

    // Match and add route handlers
    const routeHandlers = this.matchRoute(req.method, req.path);
    if (routeHandlers) {
      handlers.push(...routeHandlers);
    } else {
      return this.notFoundResponse();
    }

    // Execute handler chain
    await this.executeHandlers(req, res, handlers);

    // Convert to platform-specific response format
    return this.toPlatformResponse(res._getResponse());
  }

  // Helper methods
  normalizeHeaders(headers) {
    const normalized = {};
    for (const [key, value] of Object.entries(headers || {})) {
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
  }

  async parseBody(request) {
    // Platform-specific body parsing
    if (request.body) {
      try {
        return JSON.parse(request.body);
      } catch (e) {
        return request.body;
      }
    }
    return null;
  }

  notFoundResponse() {
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: true,
        status: 404,
        message: "Not found",
        code: "ROUTE_NOT_FOUND",
      }),
    };
  }

  toPlatformResponse(response) {
    // Convert normalized response to platform format
    return {
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.body,
    };
  }

  /**
   * Create platform-specific handler function
   */
  createHandler() {
    return async (request, context) => {
      return await this.handleRequest(request, context);
    };
  }
}
```

## Step 2: Platform-Specific Examples

### Azure Functions

```javascript
import { BaseAdapter } from "vite-plugin-server-actions";

export class AzureFunctionsAdapter extends BaseAdapter {
  async normalizeRequest(context) {
    const req = context.req;
    return {
      method: req.method,
      url: req.url,
      path: new URL(req.url).pathname,
      headers: req.headers,
      body: req.body,
      query: req.query,
      rawRequest: req,
    };
  }

  createResponse() {
    const response = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: null,
    };

    return {
      status(code) {
        response.status = code;
        return this;
      },
      json(data) {
        response.body = JSON.stringify(data);
        this._finished = true;
      },
      end() {
        if (!response.body) response.body = "";
        this._finished = true;
      },
      header(key, value) {
        response.headers[key] = value;
        return this;
      },
      _getResponse: () => response,
      _finished: false,
    };
  }

  async handleRequest(context) {
    const req = await this.normalizeRequest(context);
    const res = this.createResponse();

    const handlers = [...(this.globalMiddleware || [])];
    const routeHandlers = this.matchRoute(req.method, req.path);
    
    if (routeHandlers) {
      handlers.push(...routeHandlers);
      await this.executeHandlers(req, res, handlers);
    } else {
      res.status(404).json({ error: "Not found" });
    }

    return { res: res._getResponse() };
  }

  createHandler() {
    return async (context) => {
      const result = await this.handleRequest(context);
      context.res = result.res;
    };
  }
}

// Usage in Azure Functions
import { AzureFunctionsAdapter } from "./adapters/azure.js";
import * as serverActions from "./actions.js";

const adapter = new AzureFunctionsAdapter();

// Register routes
adapter.post("/api/todos/get", async (req, res) => {
  const result = await serverActions.actions_todo.getTodos(...req.body);
  res.json(result);
});

export default adapter.createHandler();
```

### Google Cloud Functions

```javascript
import { BaseAdapter } from "vite-plugin-server-actions";

export class GoogleCloudFunctionsAdapter extends BaseAdapter {
  async normalizeRequest(req) {
    return {
      method: req.method,
      url: req.url,
      path: req.path,
      headers: req.headers,
      body: req.body,
      query: req.query,
      rawRequest: req,
    };
  }

  createResponse(res) {
    // Wrap the Express-like response object
    const wrapper = {
      status(code) {
        res.status(code);
        return wrapper;
      },
      json(data) {
        res.json(data);
        wrapper._finished = true;
      },
      end() {
        res.end();
        wrapper._finished = true;
      },
      header(key, value) {
        res.set(key, value);
        return wrapper;
      },
      _finished: false,
    };
    return wrapper;
  }

  async handleRequest(req, res) {
    const normalizedReq = await this.normalizeRequest(req);
    const normalizedRes = this.createResponse(res);

    const handlers = [...(this.globalMiddleware || [])];
    const routeHandlers = this.matchRoute(normalizedReq.method, normalizedReq.path);
    
    if (routeHandlers) {
      handlers.push(...routeHandlers);
      await this.executeHandlers(normalizedReq, normalizedRes, handlers);
    } else {
      normalizedRes.status(404).json({ error: "Not found" });
    }
  }

  createHandler() {
    return async (req, res) => {
      return await this.handleRequest(req, res);
    };
  }
}

// Usage
export const handler = new GoogleCloudFunctionsAdapter().createHandler();
```

### Vercel Serverless Functions

```javascript
import { BaseAdapter } from "vite-plugin-server-actions";

export class VercelAdapter extends BaseAdapter {
  async normalizeRequest(req) {
    return {
      method: req.method,
      url: req.url,
      path: new URL(req.url, `http://${req.headers.host}`).pathname,
      headers: req.headers,
      body: req.body,
      query: req.query,
      rawRequest: req,
    };
  }

  createResponse(res) {
    return {
      status(code) {
        res.status(code);
        return this;
      },
      json(data) {
        res.json(data);
        this._finished = true;
      },
      end() {
        res.end();
        this._finished = true;
      },
      header(key, value) {
        res.setHeader(key, value);
        return this;
      },
      _finished: false,
    };
  }

  async handleRequest(req, res) {
    const normalizedReq = await this.normalizeRequest(req);
    const normalizedRes = this.createResponse(res);

    const handlers = [...(this.globalMiddleware || [])];
    const routeHandlers = this.matchRoute(normalizedReq.method, normalizedReq.path);
    
    if (routeHandlers) {
      handlers.push(...routeHandlers);
      await this.executeHandlers(normalizedReq, normalizedRes, handlers);
    } else {
      normalizedRes.status(404).json({ error: "Not found" });
    }
  }

  createHandler() {
    return async (req, res) => {
      return await this.handleRequest(req, res);
    };
  }
}
```

### Alibaba Cloud Function Compute

```javascript
import { BaseAdapter } from "vite-plugin-server-actions";

export class AliyunFCAdapter extends BaseAdapter {
  async normalizeRequest(req, context) {
    return {
      method: req.method,
      url: req.url,
      path: req.path,
      headers: req.headers,
      body: JSON.parse(req.body.toString()),
      query: req.queries,
      rawRequest: req,
      context,
    };
  }

  createResponse() {
    const response = {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: "",
    };

    return {
      status(code) {
        response.statusCode = code;
        return this;
      },
      json(data) {
        response.body = JSON.stringify(data);
        this._finished = true;
      },
      end() {
        this._finished = true;
      },
      header(key, value) {
        response.headers[key.toLowerCase()] = value;
        return this;
      },
      _getResponse: () => response,
      _finished: false,
    };
  }

  async handleRequest(req, resp, context) {
    const normalizedReq = await this.normalizeRequest(req, context);
    const normalizedRes = this.createResponse();

    const handlers = [...(this.globalMiddleware || [])];
    const routeHandlers = this.matchRoute(normalizedReq.method, normalizedReq.path);
    
    if (routeHandlers) {
      handlers.push(...routeHandlers);
      await this.executeHandlers(normalizedReq, normalizedRes, handlers);
    } else {
      normalizedRes.status(404).json({ error: "Not found" });
    }

    const response = normalizedRes._getResponse();
    resp.setStatusCode(response.statusCode);
    resp.setHeader("content-type", response.headers["content-type"]);
    resp.send(response.body);
  }

  createHandler() {
    return async (req, resp, context) => {
      return await this.handleRequest(req, resp, context);
    };
  }
}
```

## Step 3: Build Integration

To integrate your custom adapter into the build process, you have two options:

### Option 1: Use Adapter Directly (No Build Integration)

```javascript
// my-platform-handler.js
import { MyPlatformAdapter } from "./adapters/my-platform.js";
import * as serverActions from "./dist/actions.js";

const adapter = new MyPlatformAdapter();

// Register routes manually
Object.entries(serverActions).forEach(([moduleName, module]) => {
  Object.entries(module).forEach(([functionName, fn]) => {
    adapter.post(`/api/${moduleName}/${functionName}`, async (req, res) => {
      const result = await fn(...req.body);
      res.json(result);
    });
  });
});

export default adapter.createHandler();
```

### Option 2: Create Build Generator (Advanced)

Create a generator function similar to `generateLambdaHandler`:

```javascript
// src/my-platform-build.js
export function generateMyPlatformHandler(serverFunctions, options, validationCode) {
  return `
import { MyPlatformAdapter } from './adapters/my-platform.js';
import * as serverActions from './actions.js';

const adapter = new MyPlatformAdapter();
${validationCode.setup}
${validationCode.middlewareFactory}

// Register routes
${Array.from(serverFunctions.entries())
  .flatMap(([moduleName, { functions, filePath }]) =>
    functions.map((functionName) => {
      const routePath = options.routeTransform(filePath, functionName);
      return `
adapter.post('${options.apiPrefix}/${routePath}', async (req, res) => {
  try {
    const result = await serverActions.${moduleName}.${functionName}(...req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;
    })
  )
  .join("\n")}

export default adapter.createHandler();
`;
}
```

Then use it in your build configuration or manually.

## Best Practices

### 1. Error Handling

Always handle errors gracefully in your adapter:

```javascript
async handleRequest(platformRequest) {
  try {
    const req = await this.normalizeRequest(platformRequest);
    const res = this.createResponse();
    
    // ... handle request
    
    return res._getResponse();
  } catch (error) {
    console.error("Adapter error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: true,
        message: "Internal server error",
      }),
    };
  }
}
```

### 2. Request Body Parsing

Handle different body formats:

```javascript
async parseBody(request) {
  const contentType = request.headers["content-type"];
  
  if (!request.body) return null;
  
  if (contentType?.includes("application/json")) {
    return typeof request.body === "string"
      ? JSON.parse(request.body)
      : request.body;
  }
  
  return request.body;
}
```

### 3. Header Normalization

Normalize headers to lowercase for consistency:

```javascript
normalizeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers || {})) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}
```

### 4. Context Preservation

Keep platform-specific context for advanced use cases:

```javascript
async normalizeRequest(platformRequest, context) {
  return {
    method: platformRequest.method,
    url: platformRequest.url,
    // ... other fields
    platformContext: context, // Preserve for platform-specific needs
    rawRequest: platformRequest,
  };
}
```

## Testing Your Adapter

Create tests for your custom adapter:

```javascript
import { describe, it, expect } from "vitest";
import { MyPlatformAdapter } from "./adapters/my-platform.js";

describe("MyPlatformAdapter", () => {
  it("should normalize request correctly", async () => {
    const adapter = new MyPlatformAdapter();
    const platformRequest = {
      method: "POST",
      path: "/api/test",
      headers: { "Content-Type": "application/json" },
      body: '{"test": "data"}',
    };

    const normalized = await adapter.normalizeRequest(platformRequest);

    expect(normalized.method).toBe("POST");
    expect(normalized.path).toBe("/api/test");
    expect(normalized.body).toEqual({ test: "data" });
  });

  it("should handle routes correctly", async () => {
    const adapter = new MyPlatformAdapter();
    let called = false;

    adapter.post("/api/test", async (req, res) => {
      called = true;
      res.json({ success: true });
    });

    const request = {
      method: "POST",
      path: "/api/test",
      headers: {},
      body: "[]",
    };

    await adapter.handleRequest(request);
    expect(called).toBe(true);
  });
});
```

## Contributing Your Adapter

If you create an adapter for a popular platform, consider contributing it back to the project:

1. Add your adapter to `src/adapters/`
2. Export it from `src/adapters/index.js`
3. Add documentation to `docs/examples/`
4. Add tests to `tests/`
5. Submit a pull request

## Examples Repository

Find more adapter examples in the community repository:
https://github.com/vite-plugin-server-actions/community-adapters

## Support

If you need help creating a custom adapter:
- Open an issue on GitHub
- Check the examples in `src/adapters/`
- Review the `BaseAdapter` implementation

## Summary

The adapter pattern in Vite Server Actions is designed to be:
- **Extensible**: Easy to create adapters for any platform
- **Consistent**: All adapters share the same interface
- **Flexible**: Support platform-specific features while maintaining compatibility
- **Testable**: Easy to test and validate

You can create adapters for any serverless platform by extending `BaseAdapter` and implementing three key methods: `normalizeRequest()`, `createResponse()`, and `handleRequest()`.
