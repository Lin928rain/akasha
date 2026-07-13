# Deno Deploy 中转服务部署指南

## 功能

这个中转服务可以帮你绕过 VPN/网络限制，提供以下 API：

- `POST /chat/completions` - 聊天补全 API（兼容 OpenAI 格式）
- `POST /generate-sentence` - AI 造句 API
- `GET /health` - 健康检查

## 部署步骤

### 1. 访问 Deno Deploy

打开 https://dash.deno.com 并登录（使用 GitHub 账号）

### 2. 创建新项目

1. 点击 "New Project"
2. 选择 "Deploy from file"（或者直接拖拽上传）
3. 上传 `deno-deploy-proxy.ts` 文件
4. 给项目起个名字，比如 `groq-proxy`

### 3. 配置环境变量

在项目设置中，添加以下环境变量：

- **GROQ_API_KEY**: `your-groq-api-key`
- **ALLOWED_ORIGINS**: `*`（或者指定你的域名，多个用逗号分隔）

### 4. 获取项目 URL

部署成功后，你会得到一个类似这样的 URL：
```
https://groq-proxy-yourname.deno.dev
```

### 5. 更新你的应用配置

修改 `.env` 文件中的 AI API 配置：

```env
# 使用 Deno Deploy 中转
AI_API_BASE_URL=https://groq-proxy-yourname.deno.dev
AI_MODEL_ID=openai/gpt-oss-120b
AI_API_KEY=your-groq-api-key
```

**注意**：这里的 `AI_API_KEY` 实际上不会被使用，因为中转服务已经从环境变量读取了 Key，但为了保持格式一致，可以保留。

## 测试

部署后，可以用以下命令测试：

```bash
# 健康检查
curl https://groq-proxy-yourname.deno.dev/health

# 测试聊天 API
curl -X POST https://groq-proxy-yourname.deno.dev/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-oss-120b",
    "messages": [{"role": "user", "content": "你好"}],
    "max_tokens": 50
  }'

# 测试造句 API
curl -X POST https://groq-proxy-yourname.deno.dev/generate-sentence \
  -H "Content-Type: application/json" \
  -d '{"word": "coincidence", "language": "zh"}'
```

## 本地测试（可选）

如果你有 Deno 环境，可以本地测试：

```bash
# 设置环境变量
export GROQ_API_KEY="your-groq-api-key"

# 运行服务
deno run --allow-net --allow-env test/deno-deploy-proxy.ts
```

服务会在 localhost:8000 启动。

## 费用

Deno Deploy 免费额度：
- 每月 100,000 次请求
- 对于学习应用来说应该足够了

## 安全建议

如果你要公开部署，建议：

1. 设置 `ALLOWED_ORIGINS` 为你的具体域名，而不是 `*`
2. 考虑添加请求速率限制
3. 定期检查日志
