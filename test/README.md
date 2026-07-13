# AI API 测试脚本

## 测试脚本说明

### 1. test-ai-api.js
直接调用 AI API（跳过服务器代理），使用 `.env` 文件中的配置。

```bash
node test/test-ai-api.js
```

### 2. test-server-proxy.js
通过本地服务器代理调用 AI API，测试服务器端的代理逻辑。

```bash
# 确保服务器正在运行
node test/test-server-proxy.js
```

### 3. test-ai-debug.js
详细调试测试，打印所有请求和响应细节。

```bash
node test/test-ai-debug.js
```

### 4. test-groq-models.js
测试 Groq API 的模型列表和标准模型调用。

```bash
node test/test-groq-models.js
```

### 5. test-api-key.js
检查 API Key 格式和测试不同的 URL 格式。

```bash
node test/test-api-key.js
```

### 6. test-custom-config.js (推荐)
**交互式测试脚本** - 可以输入你在聊天测试软件中使用的实际配置进行测试。

```bash
node test/test-custom-config.js
```

### 7. test-groq-full.js
完整的 Groq API 测试，测试不同的请求头格式。

```bash
node test/test-groq-full.js
```

### 8. test-groq-with-useragent.js
测试添加不同 User-Agent 的请求。

```bash
node test/test-groq-with-useragent.js
```

### 9. test-groq-node-https.js
使用 node:https 模块发送请求（更接近底层）。

```bash
node test/test-groq-node-https.js
```

### 10. test-groq-official-models.js
测试 Groq 官方模型列表。

```bash
node test/test-groq-official-models.js
```

### 11. check-env-key.js
检查 .env 文件中的 API Key 是否有隐藏字符。

```bash
node test/check-env-key.js
```

### 12. deno-deploy-proxy.ts
**Deno Deploy 中转服务代码** - 部署到 Deno Deploy 以绕过 VPN/网络限制。

参见 [DEPLOY.md](./DEPLOY.md) 了解部署说明。

## 排查步骤

### 如果 Groq API 返回 403 Forbidden

1. **检查是否是 VPN 问题**
   - 关闭系统代理和软件代理，看看是否能正常工作
   - 如果是，使用 Deno Deploy 中转服务

2. **使用 Deno Deploy 中转**
   - 部署 `deno-deploy-proxy.ts` 到 https://dash.deno.com
   - 配置环境变量 `GROQ_API_KEY`
   - 更新 `.env` 文件中的 `AI_API_BASE_URL` 为你的 Deno Deploy URL

### 快速部署指南

```bash
# 查看部署说明
cat test/DEPLOY.md
```

## 当前问题诊断

根据测试结果：
- Python urllib 测试曾成功（200）
- 所有 Node.js 测试返回 403
- 后续 Python 测试也返回 403
- 错误码：1010（Cloudflare 封锁）

**可能原因**：
1. 短时间内过多请求，导致 Cloudflare 临时限制
2. VPN/代理配置问题，导致 IP 被识别

**建议解决方案**：使用 Deno Deploy 中转服务
