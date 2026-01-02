# Serverless Deployment Guide

This guide explains how to deploy your Vite Server Actions application to serverless platforms.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [AWS Lambda Deployment](#aws-lambda-deployment)
- [Cloudflare Workers Deployment](#cloudflare-workers-deployment)
- [Traditional Express Deployment](#traditional-express-deployment)
- [Multi-Target Builds](#multi-target-builds)
- [Custom Adapters](#custom-adapters)

## Overview

Vite Server Actions supports serverless deployment through an **extensible adapter pattern**. Built-in adapters include:

- **Express** - Traditional Node.js server (default)
- **AWS Lambda** - Serverless functions on AWS
- **Cloudflare Workers** - Edge computing platform

**The adapter pattern is designed to be platform-agnostic.** You can create custom adapters for any serverless platform:
- Azure Functions
- Google Cloud Functions  
- Vercel Serverless Functions
- Netlify Functions
- Alibaba Cloud Function Compute
- Tencent Cloud SCF
- Any other platform

See the [Custom Adapters Guide](custom-adapters.md) for detailed instructions on creating adapters for other platforms.

All adapters share the same server action code, making it easy to switch between deployment platforms.

## Configuration

Enable serverless builds in your `vite.config.js`:

```javascript
import { defineConfig } from "vite";
import serverActions from "vite-plugin-server-actions";

export default defineConfig({
  plugins: [
    serverActions({
      // Enable serverless builds
      serverless: {
        enabled: true,
        targets: ["express", "lambda", "workers"], // Choose your targets
      },
      // Your other configuration...
      validation: {
        enabled: true,
      },
      openAPI: {
        enabled: true,
      },
    }),
  ],
});
```

### Configuration Options

| Option                  | Type       | Default                              | Description                           |
| ----------------------- | ---------- | ------------------------------------ | ------------------------------------- |
| `serverless.enabled`    | `boolean`  | `false`                              | Enable serverless build targets       |
| `serverless.targets`    | `string[]` | `["express", "lambda", "workers"]`   | Platforms to generate handlers for    |

## AWS Lambda Deployment

### 1. Build Your Application

```bash
npm run build
```

This generates:
- `dist/lambda.js` - Lambda handler
- `dist/actions.js` - Bundled server functions
- `dist/adapters/` - Required adapter files
- `dist/openapi.json` - API documentation (if enabled)

### 2. Lambda Handler

The generated `lambda.js` exports a standard Lambda handler:

```javascript
// dist/lambda.js (generated)
import { LambdaAdapter } from './adapters/lambda.js';
import * as serverActions from './actions.js';

const adapter = new LambdaAdapter();

// Routes are automatically registered
adapter.post('/api/todos/get', async (req, res) => {
  const result = await serverActions.actions_todo.getTodos(...req.body);
  res.json(result);
});

export const handler = adapter.createHandler();
```

### 3. Deploy with AWS SAM

Create `template.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  ServerActionsFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: lambda.handler
      Runtime: nodejs18.x
      CodeUri: dist/
      Events:
        ApiEvent:
          Type: HttpApi
          Properties:
            Path: /{proxy+}
            Method: ANY
```

Deploy:

```bash
sam build
sam deploy --guided
```

### 4. Deploy with Serverless Framework

Create `serverless.yml`:

```yaml
service: vite-server-actions

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1

functions:
  api:
    handler: lambda.handler
    events:
      - httpApi:
          path: /{proxy+}
          method: ANY

package:
  patterns:
    - dist/**
    - '!dist/server.js'
    - '!dist/workers.js'
```

Deploy:

```bash
serverless deploy
```

### 5. Lambda Configuration

The Lambda adapter supports both API Gateway v1 and v2 event formats:

```javascript
// API Gateway v2 event
{
  "rawPath": "/api/todos/get",
  "requestContext": {
    "http": {
      "method": "POST"
    }
  },
  "headers": {
    "content-type": "application/json"
  },
  "body": "[\"user123\"]"
}
```

## Cloudflare Workers Deployment

### 1. Build Your Application

```bash
npm run build
```

This generates:
- `dist/workers.js` - Workers handler
- `dist/actions.js` - Bundled server functions
- `dist/adapters/` - Required adapter files

### 2. Workers Handler

The generated `workers.js` exports a Fetch API handler:

```javascript
// dist/workers.js (generated)
import { WorkersAdapter } from './adapters/workers.js';
import * as serverActions from './actions.js';

const adapter = new WorkersAdapter();

// Routes are automatically registered
adapter.post('/api/todos/get', async (req, res) => {
  const result = await serverActions.actions_todo.getTodos(...req.body);
  res.json(result);
});

export default adapter.createHandler();
```

### 3. Deploy with Wrangler

Create `wrangler.toml`:

```toml
name = "vite-server-actions"
main = "dist/workers.js"
compatibility_date = "2024-01-01"
node_compat = true

[build]
command = "npm run build"

[build.upload]
format = "modules"
dir = "dist"
main = "./workers.js"
```

Deploy:

```bash
npx wrangler deploy
```

### 4. Workers Configuration

The Workers adapter uses the standard Fetch API:

```javascript
// Cloudflare Workers environment
export default {
  fetch: async (request, env, ctx) => {
    // Your server actions are handled here
    return adapter.handleRequest(request);
  }
}
```

## Traditional Express Deployment

For traditional Node.js hosting:

```bash
npm run build
node dist/server.js
```

The Express server runs on port 3000 by default (configurable via `PORT` environment variable).

## Multi-Target Builds

You can generate handlers for multiple platforms in a single build:

```javascript
export default defineConfig({
  plugins: [
    serverActions({
      serverless: {
        enabled: true,
        targets: ["express", "lambda", "workers"],
      },
    }),
  ],
});
```

This generates:
- `dist/server.js` - Express server
- `dist/lambda.js` - Lambda handler
- `dist/workers.js` - Workers handler
- `dist/actions.js` - Shared server functions
- `dist/adapters/` - Platform adapters

Each handler imports the same `actions.js` file, ensuring consistent behavior across platforms.

## Environment Variables

All platforms support environment variables for configuration:

```javascript
// server/config.server.js
export async function getConfig() {
  return {
    apiKey: process.env.API_KEY,
    dbUrl: process.env.DATABASE_URL,
  };
}
```

Set environment variables according to your platform:

- **Lambda**: AWS Lambda environment variables
- **Workers**: Cloudflare environment variables or secrets
- **Express**: `.env` file or system environment

## Validation and OpenAPI

Validation and OpenAPI documentation work identically across all platforms:

```javascript
// server/todos.server.js
import { z } from "zod";

export async function addTodo(todo) {
  // Validation happens automatically
  return db.todos.create(todo);
}

addTodo.schema = z.tuple([
  z.object({
    text: z.string().min(1),
    userId: z.string(),
  }),
]);
```

- Lambda: OpenAPI spec available at `/api/openapi.json`
- Workers: OpenAPI spec available at `/api/openapi.json`
- Express: OpenAPI spec + Swagger UI available

## Performance Considerations

### Lambda

- Cold start: ~100-500ms (first request)
- Warm start: ~5-20ms (subsequent requests)
- Memory: Configure based on your needs (128MB-10GB)
- Timeout: Configure based on longest action (max 15 minutes)

### Cloudflare Workers

- Cold start: ~0-5ms (globally distributed)
- CPU time limit: 50ms-30s depending on plan
- Memory: 128MB default
- Best for: Fast, lightweight operations

### Express

- Always warm
- Full control over resources
- Best for: Complex operations, long-running tasks

## Limitations

### Lambda Limitations

- Max request/response size: 6MB (API Gateway v2) or 10MB (ALB)
- Max execution time: 15 minutes
- No WebSocket support in this implementation

### Workers Limitations

- Max request size: 100MB (Enterprise), smaller on other plans
- Max execution time: 30s (50ms CPU time on free plan)
- No file system access
- Limited Node.js compatibility

## Troubleshooting

### "Module not found" errors

Ensure all adapter files are included in your deployment:

```
dist/
├── actions.js
├── lambda.js (or workers.js, server.js)
├── adapters/
│   ├── base.js
│   ├── lambda.js (or workers.js)
└── openapi.json (if enabled)
```

### Lambda timeout errors

Increase timeout in your Lambda configuration:

```yaml
# template.yaml
Timeout: 30  # seconds
```

### Workers CPU exceeded errors

Optimize your server actions or upgrade to a paid plan for more CPU time.

## Example Projects

See the `examples/` directory for complete examples:

- `examples/serverless-lambda/` - AWS Lambda deployment
- `examples/serverless-workers/` - Cloudflare Workers deployment
- `examples/svelte-todo-app/` - Traditional Express deployment

## Advanced Usage

### Custom Adapters

You can create custom adapters for other platforms:

```javascript
import { BaseAdapter } from "vite-plugin-server-actions";

class MyCustomAdapter extends BaseAdapter {
  async normalizeRequest(platformRequest) {
    // Convert platform request to normalized format
    return {
      method: platformRequest.method,
      url: platformRequest.path,
      headers: platformRequest.headers,
      body: platformRequest.body,
      query: platformRequest.query,
    };
  }

  createResponse() {
    // Return response wrapper
    return {
      status(code) { /* ... */ },
      json(data) { /* ... */ },
      end() { /* ... */ },
      header(key, value) { /* ... */ },
    };
  }
}
```

### Manual Handler Creation

For full control, create handlers manually:

```javascript
import { LambdaAdapter } from "vite-plugin-server-actions";
import * as actions from "./actions.js";

const adapter = new LambdaAdapter();

// Custom middleware
adapter.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Register routes manually
adapter.post("/api/custom", async (req, res) => {
  res.json({ message: "Custom route" });
});

export const handler = adapter.createHandler();
```

## Migration Guide

### From Express to Lambda

1. Enable serverless in config:
   ```javascript
   serverless: {
     enabled: true,
     targets: ["lambda"]
   }
   ```

2. Build and deploy to Lambda

3. Update client to use Lambda URL

### From Express to Workers

1. Enable serverless in config:
   ```javascript
   serverless: {
     enabled: true,
     targets: ["workers"]
   }
   ```

2. Create `wrangler.toml`

3. Deploy with Wrangler

4. Update client to use Workers URL

No code changes required in your server actions!

## Custom Adapters

The adapter pattern is designed to be **extensible and platform-agnostic**. You can create adapters for any serverless platform.

### Supported Platforms

While the plugin includes built-in adapters for Express, Lambda, and Workers, the `BaseAdapter` class can be extended to support any platform:

- **Azure Functions** - Microsoft's serverless platform
- **Google Cloud Functions** - Google's serverless platform
- **Vercel Serverless Functions** - Vercel's edge functions
- **Netlify Functions** - Netlify's serverless functions
- **Alibaba Cloud Function Compute** - Alibaba's serverless platform
- **Tencent Cloud SCF** - Tencent's serverless platform
- **Any custom platform** - Your own serverless infrastructure

### Creating Custom Adapters

To create an adapter for any platform, extend the `BaseAdapter` class and implement three key methods:

```javascript
import { BaseAdapter } from "vite-plugin-server-actions";

export class MyPlatformAdapter extends BaseAdapter {
  // Convert platform request to normalized format
  async normalizeRequest(platformRequest) {
    return {
      method: platformRequest.method,
      url: platformRequest.path,
      headers: platformRequest.headers,
      body: platformRequest.body,
      query: platformRequest.query,
    };
  }

  // Create normalized response wrapper
  createResponse() {
    return {
      status(code) { /* ... */ },
      json(data) { /* ... */ },
      end() { /* ... */ },
      header(key, value) { /* ... */ },
    };
  }

  // Handle request and return platform response
  async handleRequest(platformRequest) {
    const req = await this.normalizeRequest(platformRequest);
    const res = this.createResponse();
    
    // Execute middleware and route handlers
    await this.executeHandlers(req, res, handlers);
    
    return this.toPlatformResponse(res);
  }
}
```

### Complete Guide

For detailed instructions, examples, and best practices for creating custom adapters, see:

**[📖 Custom Adapters Guide](custom-adapters.md)**

This guide includes:
- Step-by-step adapter creation
- Examples for Azure, Google Cloud, Vercel, Alibaba Cloud, and more
- Testing strategies
- Build integration options
- Best practices and error handling

### Using Community Adapters

The community has created adapters for various platforms. Check the [community adapters repository](https://github.com/vite-plugin-server-actions/community-adapters) for contributions.
