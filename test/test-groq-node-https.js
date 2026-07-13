/**
 * 使用 node:https 模块直接发送请求（更接近 Python 的 urllib）
 */

const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const API_KEY = process.env.AI_API_KEY || "";
const MODEL = process.env.AI_MODEL_ID || "";
const HOST = "api.groq.com";
const PATH = "/openai/v1/chat/completions";

console.log("=".repeat(60));
console.log("Groq API 测试 - 使用 node:https 模块");
console.log("=".repeat(60));
console.log("Model:", MODEL);
console.log("API Key:", API_KEY.slice(0, 8) + "..." + API_KEY.slice(-4));
console.log("=".repeat(60));

function sendRequest() {
  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "user", "content": "你好" }
    ],
    max_tokens: 10
  });

  const options = {
    hostname: HOST,
    port: 443,
    path: PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Length': Buffer.byteLength(body),
    }
  };

  console.log("\n发送请求:");
  console.log("Headers:", JSON.stringify(options.headers, null, 2));

  const req = https.request(options, (res) => {
    console.log(`\n状态码：${res.statusCode} ${res.statusMessage}`);
    console.log("响应头:");
    Object.entries(res.headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log("\n响应体:", data);

      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(data);
          console.log("\n成功！AI 回复:", parsed.choices?.[0]?.message?.content);
        } catch (e) {
          console.log("无法解析 JSON");
        }
      }
    });
  });

  req.on('error', (e) => {
    console.error("请求错误:", e.message);
  });

  req.write(body);
  req.end();
}

// 测试添加 User-Agent
function sendRequestWithUserAgent() {
  console.log("\n" + "=".repeat(60));
  console.log("发送请求 - 带 User-Agent");
  console.log("=".repeat(60));

  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "user", "content": "你好" }
    ],
    max_tokens: 10
  });

  const options = {
    hostname: HOST,
    port: 443,
    path: PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Length': Buffer.byteLength(body),
      'User-Agent': 'node-https/1.0'
    }
  };

  console.log("Headers:", JSON.stringify(options.headers, null, 2));

  const req = https.request(options, (res) => {
    console.log(`\n状态码：${res.statusCode} ${res.statusMessage}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log("响应体:", data);

      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(data);
          console.log("\n成功！AI 回复:", parsed.choices?.[0]?.message?.content);
        } catch (e) {
          console.log("无法解析 JSON");
        }
      }
    });
  });

  req.on('error', (e) => {
    console.error("请求错误:", e.message);
  });

  req.write(body);
  req.end();
}

// 运行测试
sendRequest();
setTimeout(() => {
  sendRequestWithUserAgent();
}, 1000);
