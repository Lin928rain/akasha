/**
 * Groq API 测试 - 添加正确的 User-Agent
 */

const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const API_KEY = process.env.AI_API_KEY || "";
const MODEL = process.env.AI_MODEL_ID || "";
const API_URL = "https://api.groq.com/openai/v1";

console.log("=".repeat(60));
console.log("Groq API 测试 - 带 User-Agent");
console.log("=".repeat(60));
console.log("Model:", MODEL);
console.log("API Key:", API_KEY.slice(0, 8) + "..." + API_KEY.slice(-4));
console.log("=".repeat(60));

async function testWithUserAgent() {
  console.log("\n[测试] 添加 User-Agent 头...\n");

  const body = {
    model: MODEL,
    messages: [
      { role: "user", "content": "你好，请用一句话介绍你自己" }
    ],
    max_tokens: 50,
  };

  const url = `${API_URL}/chat/completions`;

  // 尝试不同的 User-Agent
  const userAgents = [
    "ChatGPT-Web/1.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "node-fetch/1.0",
    undefined, // 不设置 User-Agent
  ];

  for (const userAgent of userAgents) {
    console.log(`User-Agent: ${userAgent || "(none)"}`);

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    };

    if (userAgent) {
      headers["User-Agent"] = userAgent;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      console.log(`  状态：${response.status} ${response.statusText}`);

      const text = await response.text();
      if (response.ok) {
        const data = JSON.parse(text);
        const content = data.choices?.[0]?.message?.content;
        console.log(`  回复：${content}`);
      } else {
        console.log(`  错误：${text.slice(0, 100)}`);
      }
    } catch (error) {
      console.log(`  异常：${error.message}`);
    }

    console.log();
  }
}

async function testWithoutCustomHeaders() {
  console.log("=".repeat(60));
  console.log("[测试] 最简请求（只设置必要的头）");
  console.log("=".repeat(60));

  const body = {
    model: MODEL,
    messages: [
      { role: "user", "content": "Hi" }
    ],
    max_tokens: 5,
  };

  const url = `${API_URL}/chat/completions`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    console.log("状态:", response.status, response.statusText);
    console.log("响应头:");
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    const text = await response.text();
    console.log("响应体:", text);

    if (response.ok) {
      const data = JSON.parse(text);
      console.log("\n成功！AI 回复:", data.choices?.[0]?.message?.content);
    }
  } catch (error) {
    console.error("错误:", error.message);
  }
}

async function main() {
  await testWithUserAgent();
  await testWithoutCustomHeaders();
}

main().catch(console.error);
