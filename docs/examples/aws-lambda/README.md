# AWS Lambda Deployment Example

This directory contains example deployment configurations for AWS Lambda.

## Prerequisites

- AWS Account
- AWS CLI configured
- Node.js 18+ installed

## Deployment Options

### Option 1: AWS SAM (Recommended)

1. Install SAM CLI:
   ```bash
   # macOS
   brew install aws-sam-cli
   
   # Linux/Windows: See https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
   ```

2. Build your Vite app with Lambda target:
   ```javascript
   // vite.config.js
   export default defineConfig({
     plugins: [
       serverActions({
         serverless: {
           enabled: true,
           targets: ["lambda"],
         },
       }),
     ],
   });
   ```

3. Build:
   ```bash
   npm run build
   ```

4. Deploy:
   ```bash
   sam build
   sam deploy --guided
   ```

### Option 2: Serverless Framework

1. Install Serverless Framework:
   ```bash
   npm install -g serverless
   ```

2. Build your Vite app:
   ```bash
   npm run build
   ```

3. Deploy:
   ```bash
   serverless deploy
   ```

4. Local testing:
   ```bash
   npm install --save-dev serverless-offline
   serverless offline
   ```

## Configuration

### Environment Variables

Set environment variables in your deployment configuration:

**SAM (template.yaml):**
```yaml
Environment:
  Variables:
    DATABASE_URL: your-database-url
    API_KEY: your-api-key
```

**Serverless (serverless.yml):**
```yaml
provider:
  environment:
    DATABASE_URL: ${env:DATABASE_URL}
    API_KEY: ${env:API_KEY}
```

### Memory and Timeout

Adjust based on your needs:

**SAM:**
```yaml
MemorySize: 512  # MB
Timeout: 30      # seconds
```

**Serverless:**
```yaml
provider:
  memorySize: 512
  timeout: 30
```

## Testing

Test your Lambda locally:

**SAM:**
```bash
sam local start-api
curl http://localhost:3000/api/your-endpoint
```

**Serverless:**
```bash
serverless offline
curl http://localhost:3000/api/your-endpoint
```

## Monitoring

View logs:

**SAM:**
```bash
sam logs -n ServerActionsFunction --tail
```

**Serverless:**
```bash
serverless logs -f api --tail
```

**AWS CloudWatch:**
Navigate to CloudWatch Logs in AWS Console to view detailed logs.

## Cost Optimization

- **Memory**: Start with 512MB, adjust based on usage
- **Timeout**: Set to minimum required for your longest action
- **Reserved Concurrency**: Set limits to control costs
- **Provisioned Concurrency**: For reduced cold starts (additional cost)

## Troubleshooting

### Cold Start Issues

If cold starts are too slow:
1. Enable Provisioned Concurrency
2. Keep Lambda warm with scheduled pings
3. Optimize bundle size

### Memory Issues

If Lambda runs out of memory:
1. Increase MemorySize in configuration
2. Optimize server actions to use less memory
3. Use streaming for large responses

### Timeout Issues

If requests timeout:
1. Increase Timeout in configuration
2. Optimize slow server actions
3. Consider async processing for long tasks
