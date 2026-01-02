# Cloudflare Workers Deployment Example

This directory contains example deployment configurations for Cloudflare Workers.

## Prerequisites

- Cloudflare account (free or paid)
- Node.js 18+ installed
- Wrangler CLI

## Setup

1. Install Wrangler:
   ```bash
   npm install -g wrangler
   # or
   npm install --save-dev wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Configure your Vite app for Workers:
   ```javascript
   // vite.config.js
   export default defineConfig({
     plugins: [
       serverActions({
         serverless: {
           enabled: true,
           targets: ["workers"],
         },
       }),
     ],
   });
   ```

## Deployment

### Quick Deploy

```bash
# Build your app
npm run build

# Deploy to Cloudflare Workers
npx wrangler deploy
```

### Deploy to Specific Environment

```bash
# Deploy to production
npx wrangler deploy --env production

# Deploy to staging
npx wrangler deploy --env staging
```

## Configuration

### Environment Variables

**Non-sensitive variables** in `wrangler.toml`:
```toml
[vars]
API_URL = "https://api.example.com"
LOG_LEVEL = "info"
```

**Sensitive variables** (secrets):
```bash
wrangler secret put API_KEY
wrangler secret put DATABASE_URL
```

Access in code:
```javascript
// server/config.server.js
export async function getConfig(env) {
  return {
    apiUrl: env.API_URL,      // From wrangler.toml
    apiKey: env.API_KEY,       // From secret
  };
}
```

### Custom Domains

Add to `wrangler.toml`:
```toml
[[routes]]
pattern = "api.yourdomain.com/*"
zone_name = "yourdomain.com"
```

Then update DNS in Cloudflare dashboard.

### Multiple Environments

Create `wrangler.toml`:
```toml
name = "vite-server-actions"

[env.production]
name = "vite-server-actions-prod"
vars = { NODE_ENV = "production" }

[env.staging]
name = "vite-server-actions-staging"
vars = { NODE_ENV = "staging" }
```

Deploy:
```bash
wrangler deploy --env production
wrangler deploy --env staging
```

## Storage Options

### KV (Key-Value Storage)

1. Create KV namespace:
   ```bash
   wrangler kv:namespace create "MY_KV"
   ```

2. Add to `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "MY_KV"
   id = "your_kv_namespace_id"
   ```

3. Use in server actions:
   ```javascript
   // server/data.server.js
   export async function getData(key, env) {
     return await env.MY_KV.get(key);
   }
   
   export async function setData(key, value, env) {
     await env.MY_KV.put(key, value);
   }
   ```

### D1 (SQL Database)

1. Create D1 database:
   ```bash
   wrangler d1 create vite-server-actions-db
   ```

2. Add to `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "vite-server-actions-db"
   database_id = "your-database-id"
   ```

3. Use in server actions:
   ```javascript
   // server/users.server.js
   export async function getUsers(env) {
     const result = await env.DB.prepare(
       "SELECT * FROM users"
     ).all();
     return result.results;
   }
   ```

### R2 (Object Storage)

1. Create R2 bucket in Cloudflare dashboard

2. Add to `wrangler.toml`:
   ```toml
   [[r2_buckets]]
   binding = "MY_BUCKET"
   bucket_name = "your-bucket-name"
   ```

3. Use in server actions:
   ```javascript
   // server/files.server.js
   export async function uploadFile(filename, data, env) {
     await env.MY_BUCKET.put(filename, data);
     return { success: true };
   }
   ```

## Local Development

Run locally with Wrangler:

```bash
# Start dev server
npx wrangler dev

# With specific port
npx wrangler dev --port 8787

# With live reload
npx wrangler dev --live-reload
```

## Testing

### Unit Tests

Test your server actions locally:

```javascript
// tests/actions.test.js
import { describe, it, expect } from 'vitest';
import { getTodos } from '../src/server/todos.server.js';

describe('Server Actions', () => {
  it('should get todos', async () => {
    const todos = await getTodos('user123');
    expect(Array.isArray(todos)).toBe(true);
  });
});
```

### Integration Tests

Test the deployed Worker:

```bash
curl https://your-worker.workers.dev/api/todos/get \
  -X POST \
  -H "Content-Type: application/json" \
  -d '["user123"]'
```

## Monitoring

### View Logs

Real-time logs:
```bash
wrangler tail
```

Filter by status:
```bash
wrangler tail --status error
```

### Analytics

View in Cloudflare dashboard:
- Workers > Your Worker > Metrics
- Shows requests, errors, CPU time, bandwidth

### Custom Logging

Add logging to server actions:
```javascript
export async function myAction(data) {
  console.log('Action called:', data);
  try {
    const result = await processData(data);
    console.log('Action succeeded');
    return result;
  } catch (error) {
    console.error('Action failed:', error);
    throw error;
  }
}
```

## Limits and Pricing

### Free Plan
- 100,000 requests/day
- 10ms CPU time per request
- No charge

### Paid Plans
- Unlimited requests ($0.50 per million)
- 30s CPU time per request (50ms standard)
- KV operations included

### Resource Limits
- Request size: 100MB (Enterprise), smaller on other plans
- Response size: No limit (streaming supported)
- Memory: 128MB per request
- Execution time: 30s max (50ms CPU on free)

## Optimization Tips

### 1. Minimize Bundle Size

Only include necessary files:
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['large-unused-dep'],
    },
  },
});
```

### 2. Use Edge Cache

Cache responses at the edge:
```javascript
export async function getCachedData() {
  const cacheKey = 'data-v1';
  const cached = await caches.default.match(cacheKey);
  
  if (cached) {
    return cached.json();
  }
  
  const data = await fetchData();
  const response = new Response(JSON.stringify(data));
  response.headers.set('Cache-Control', 'max-age=3600');
  
  await caches.default.put(cacheKey, response.clone());
  return data;
}
```

### 3. Optimize Database Queries

Use prepared statements and indexes:
```javascript
// Prepare statement once
const stmt = env.DB.prepare("SELECT * FROM users WHERE id = ?");

export async function getUser(id, env) {
  return await stmt.bind(id).first();
}
```

## Troubleshooting

### CPU Time Exceeded

If you hit CPU time limits:
1. Optimize heavy computations
2. Use async operations (don't count toward CPU time)
3. Upgrade to paid plan for more CPU time
4. Move heavy processing to scheduled workers

### Module Not Found

Ensure all files are in dist/:
```bash
ls -la dist/
# Should include:
# - workers.js
# - actions.js
# - adapters/
```

### CORS Issues

Workers automatically handle CORS if configured in `wrangler.toml`. For custom handling:

```javascript
// In your server action or middleware
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
```

## Migration from Express

1. Update Vite config:
   ```javascript
   serverless: {
     enabled: true,
     targets: ["workers"]
   }
   ```

2. Build and deploy:
   ```bash
   npm run build
   wrangler deploy
   ```

3. Update client endpoints to Workers URL

4. No code changes needed in server actions!

## Advanced Usage

### Custom Workers Handler

For more control, create a custom handler:

```javascript
// workers-custom.js
import { WorkersAdapter } from './adapters/workers.js';
import * as actions from './actions.js';

const adapter = new WorkersAdapter();

// Custom middleware
adapter.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Custom routes
adapter.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Register server actions
Object.entries(actions).forEach(([module, functions]) => {
  Object.entries(functions).forEach(([name, fn]) => {
    adapter.post(`/api/${module}/${name}`, async (req, res) => {
      const result = await fn(...req.body);
      res.json(result);
    });
  });
});

export default adapter.createHandler();
```

## Resources

- [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [KV Storage](https://developers.cloudflare.com/kv/)
- [R2 Storage](https://developers.cloudflare.com/r2/)
