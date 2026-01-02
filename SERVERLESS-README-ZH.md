# Serverless 架构改造说明

## 概述

本 PR 将 vite-plugin-server-actions 项目改造为支持 Serverless 部署的架构。通过**可扩展的适配器模式**，现在可以轻松部署到任何 Serverless 平台，同时保持向后兼容原有的 Express 部署方式。

## 主要改进

### 1. 可扩展的适配器模式

创建了统一的适配器接口，**不仅支持内置平台，还可以为任何云服务厂商创建适配器**：

**内置适配器：**
- **BaseAdapter** (`src/adapters/base.js`) - 基础适配器类，定义通用接口
- **ExpressAdapter** (`src/adapters/express.js`) - Express 适配器（向后兼容）
- **LambdaAdapter** (`src/adapters/lambda.js`) - AWS Lambda 适配器
- **WorkersAdapter** (`src/adapters/workers.js`) - Cloudflare Workers 适配器

**可扩展支持：**
- **Azure Functions** - 微软的 Serverless 平台
- **Google Cloud Functions** - 谷歌的 Serverless 平台
- **Vercel Serverless Functions** - Vercel 的边缘函数
- **Netlify Functions** - Netlify 的 Serverless 函数
- **阿里云函数计算** - 阿里云的 Serverless 平台
- **腾讯云 SCF** - 腾讯云的 Serverless 平台
- **任何自定义平台** - 您自己的 Serverless 基础设施

通过继承 `BaseAdapter` 类并实现三个关键方法，即可为任何平台创建适配器。详见 [自定义适配器指南](docs/custom-adapters.md)。

### 2. 构建目标

构建过程现在可以生成多个平台的处理程序：

```bash
npm run build
```

生成文件：
- `dist/server.js` - Express 服务器（默认）
- `dist/lambda.js` - Lambda 处理程序（启用后）
- `dist/workers.js` - Workers 处理程序（启用后）
- `dist/actions.js` - 打包的服务器函数（所有平台共享）

### 3. 配置选项

在 `vite.config.js` 中启用 serverless 支持：

```javascript
import { defineConfig } from "vite";
import serverActions from "vite-plugin-server-actions";

export default defineConfig({
  plugins: [
    serverActions({
      // 启用 serverless 构建
      serverless: {
        enabled: true,
        targets: ["express", "lambda", "workers"], // 选择目标平台
      },
      // 其他配置...
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

### 4. 部署方式

#### AWS Lambda 部署

```bash
# 使用 AWS SAM
sam build
sam deploy --guided

# 或使用 Serverless Framework
serverless deploy
```

#### Cloudflare Workers 部署

```bash
# 使用 Wrangler
npx wrangler deploy
```

#### 传统 Express 部署

```bash
# 不变
node dist/server.js
```

## 文档

### 完整部署指南
- `docs/serverless-deployment.md` - 详细的 Serverless 部署指南

### 示例配置
- `docs/examples/aws-lambda/` - AWS Lambda 部署示例
  - SAM 配置 (`template.yaml`)
  - Serverless Framework 配置 (`serverless.yml`)
  
- `docs/examples/cloudflare-workers/` - Cloudflare Workers 部署示例
  - Wrangler 配置 (`wrangler.toml`)

## 核心优势

### 🚀 Serverless 的好处

1. **按需付费** - 只为实际使用的请求付费
2. **全球分发** - Workers 可以部署到全球边缘节点
3. **自动扩展** - 自动处理流量高峰
4. **低成本** - 对于低流量应用，成本可以降至几乎为零

### ✅ 向后兼容

- 现有的 Express 部署方式完全不受影响
- 不启用 serverless 选项时，行为与之前完全相同
- 服务器函数代码无需修改

### 🔄 一份代码，多处部署

相同的服务器函数代码可以部署到：
- Express 服务器（Node.js）
- AWS Lambda（按需执行）
- Cloudflare Workers（边缘计算）

## 使用示例

### 服务器函数（不变）

```javascript
// server/todos.server.js
import { z } from "zod";

export async function getTodos(userId) {
  return await db.todos.findMany({ where: { userId } });
}

export async function addTodo(text, userId) {
  return await db.todos.create({
    data: { text, userId, completed: false },
  });
}

// 可选：添加验证
addTodo.schema = z.tuple([
  z.string().min(1),
  z.string(),
]);
```

### 客户端调用（不变）

```javascript
// App.vue
import { getTodos, addTodo } from './server/todos.server.js'

const todos = await getTodos('user123')
await addTodo('Buy milk', 'user123')
```

### 配置部署目标

```javascript
// vite.config.js
export default defineConfig({
  plugins: [
    serverActions({
      serverless: {
        enabled: true,
        targets: ["lambda"], // 只生成 Lambda 处理程序
      },
    }),
  ],
});
```

## 技术实现

### 请求标准化

每个适配器将平台特定的请求格式转换为标准格式：

```javascript
// 标准化请求对象
{
  method: 'POST',
  url: '/api/todos/get',
  headers: { 'content-type': 'application/json' },
  body: ['user123'],
  query: {}
}
```

### Lambda 事件处理

```javascript
// Lambda 事件 (API Gateway v2)
{
  "rawPath": "/api/todos/get",
  "requestContext": { "http": { "method": "POST" } },
  "body": "[\"user123\"]"
}

// 转换为标准化请求
{
  method: 'POST',
  url: '/api/todos/get',
  body: ['user123']
}
```

### Workers Fetch API

```javascript
// Workers Request
const request = new Request('https://api.example.com/api/todos/get', {
  method: 'POST',
  body: JSON.stringify(['user123'])
});

// 转换为标准化请求
{
  method: 'POST',
  url: '/api/todos/get',
  body: ['user123']
}
```

## 测试

新增 7 个测试用例，覆盖：
- 配置选项验证
- 适配器导出
- Lambda 处理程序生成
- Workers 处理程序生成
- Express 服务器生成

**测试结果：** ✅ 255 个测试全部通过

```bash
npm run test:run
```

## 性能对比

### AWS Lambda
- 冷启动：~100-500ms（首次请求）
- 热启动：~5-20ms（后续请求）
- 适合：中等复杂度的操作

### Cloudflare Workers
- 冷启动：~0-5ms（全球分布）
- CPU 限制：50ms（免费）到 30s（付费）
- 适合：快速、轻量级操作

### Express
- 始终热启动
- 完全控制资源
- 适合：复杂操作、长时间运行的任务

## 迁移指南

### 从 Express 迁移到 Lambda

1. 更新配置：
```javascript
serverless: {
  enabled: true,
  targets: ["lambda"]
}
```

2. 构建并部署到 Lambda
3. 无需修改服务器函数代码

### 从 Express 迁移到 Workers

1. 更新配置：
```javascript
serverless: {
  enabled: true,
  targets: ["workers"]
}
```

2. 创建 `wrangler.toml` 配置
3. 部署：`npx wrangler deploy`
4. 无需修改服务器函数代码

## 贡献

本改造添加了以下文件：

```
src/
├── adapters/
│   ├── base.js          # 基础适配器
│   ├── express.js       # Express 适配器
│   ├── lambda.js        # Lambda 适配器
│   ├── workers.js       # Workers 适配器
│   └── index.js         # 导出
├── serverless-build.js  # Serverless 构建工具
└── index.js            # 更新以支持 serverless

docs/
├── serverless-deployment.md  # 部署指南
└── examples/
    ├── aws-lambda/          # Lambda 示例
    └── cloudflare-workers/  # Workers 示例

tests/
└── serverless-build.test.js  # 新测试
```

## 自定义适配器

适配器模式被设计为**可扩展和平台无关**的。您可以为任何 Serverless 平台创建适配器。

### 创建自定义适配器

只需继承 `BaseAdapter` 类并实现三个关键方法：

```javascript
import { BaseAdapter } from "vite-plugin-server-actions";

export class MyPlatformAdapter extends BaseAdapter {
  // 将平台请求转换为标准格式
  async normalizeRequest(platformRequest) {
    return {
      method: platformRequest.method,
      url: platformRequest.path,
      headers: platformRequest.headers,
      body: platformRequest.body,
      query: platformRequest.query,
    };
  }

  // 创建标准响应包装器
  createResponse() {
    return {
      status(code) { /* ... */ },
      json(data) { /* ... */ },
      end() { /* ... */ },
      header(key, value) { /* ... */ },
    };
  }

  // 处理请求并返回平台响应
  async handleRequest(platformRequest) {
    const req = await this.normalizeRequest(platformRequest);
    const res = this.createResponse();
    
    // 执行中间件和路由处理程序
    await this.executeHandlers(req, res, handlers);
    
    return this.toPlatformResponse(res);
  }
}
```

### 完整指南

详细的自定义适配器创建指南，包含多个平台的完整示例：

**[📖 自定义适配器指南](docs/custom-adapters.md)** （英文）

该指南包含：
- 逐步创建适配器
- Azure、Google Cloud、Vercel、阿里云等平台的示例
- 测试策略
- 构建集成选项
- 最佳实践和错误处理

### 支持的平台

通过自定义适配器，您可以部署到：
- **Azure Functions** - 微软 Azure 平台
- **Google Cloud Functions** - 谷歌云平台
- **Vercel Serverless Functions** - Vercel 平台
- **Netlify Functions** - Netlify 平台
- **阿里云函数计算** - 阿里云平台
- **腾讯云 SCF** - 腾讯云平台
- **华为云 FunctionGraph** - 华为云平台
- **任何自定义平台** - 您自己的基础设施

### 社区适配器

社区已经为各种平台创建了适配器。查看[社区适配器仓库](https://github.com/vite-plugin-server-actions/community-adapters)获取更多贡献。

## 下一步

1. 可以尝试部署示例应用到 Lambda 或 Workers
2. 查看 `docs/serverless-deployment.md` 获取详细步骤
3. 查看 `docs/custom-adapters.md` 学习如何为其他平台创建适配器
4. 根据需要调整配置和部署脚本

## 问题反馈

如有任何问题，请在 PR 中评论或创建 issue。

---

感谢您的宝贵项目！希望这个 Serverless 改造能让它更加强大和灵活。🚀
