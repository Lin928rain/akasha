/**
 * Groq API 中转服务 - Deno Deploy
 *
 * 部署步骤：
 * 1. 访问 https://dash.deno.com 创建新项目
 * 2. 上传此文件
 * 3. 添加环境变量：GROQ_API_KEY=你的 API Key
 * 4. 将项目 URL 配置到 .env 的 AI_API_BASE_URL
 */

Deno.serve(async (req: Request) => {
  const { pathname, search } = new URL(req.url);
  return fetch(`https://api.groq.com/openai${pathname}${search}`, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
});
