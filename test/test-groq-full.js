/**
 * Groq API 完整测试 - 模拟聊天软件的请求
 */

const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const GROQ_API_KEY = process.env.AI_API_KEY || "";
const GROQ_MODEL_ID = process.env.AI_MODEL_ID || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1";

console.log("=".repeat(60));
console.log("Groq API 完整测试");
console.log("=".repeat(60));
console.log("API URL:", GROQ_API_URL);
console.log("Model:", GROQ_MODEL_ID);
console.log("API Key:", GROQ_API_KEY ? `${GROQ_API_KEY.slice(0, 8)}...${GROQ_API_KEY.slice(-4)}` : "(empty)");
console.log("=".repeat(60));

async function testSimpleRequest() {
  console.log("\n[测试 1] 最简单的请求");

  const body = {
    model: GROQ_MODEL_ID,
    messages: [
      { role: "user", content: "Hi" },
    ],
    max_tokens: 5,
  };

  console.log("Body:", JSON.stringify(body));

  try {
    const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        // 添加 User-Agent，有些 API 会检查这个
        "User-Agent": "node-fetch/1.0",
      },
      body: JSON.stringify(body),
    });

    console.log("状态:", response.status, response.statusText);
    const text = await response.text();
    console.log("响应:", text);
  } catch (error) {
    console.error("错误:", error.message);
  }
}

async function testWithCreateMessageFirst() {
  console.log("\n" + "=".repeat(60));
  console.log("[测试 2] 先创建 messages 数组（模拟某些 SDK 的行为）");

  // 有些 SDK 会先创建消息对象
  const messages = [];
  messages.push({ role: "system", content: "You are helpful." });
  messages.push({ role: "user", content: "Hello" });

  const body = {
    model: GROQ_MODEL_ID,
    messages: messages,
    max_tokens: 10,
    stream: false,
  };

  console.log("Body:", JSON.stringify(body, null, 2));

  try {
    const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    console.log("状态:", response.status, response.statusText);
    const text = await response.text();
    console.log("响应:", text);
  } catch (error) {
    console.error("错误:", error.message);
  }
}

async function testDifferentContentTypes() {
  console.log("\n" + "=".repeat(60));
  console.log("[测试 3] 测试不同的 Content-Type");

  const body = {
    model: GROQ_MODEL_ID,
    messages: [{ role: "user", content: "Hi" }],
    max_tokens: 5,
  };

  const contentTypes = [
    "application/json",
    "application/json; charset=utf-8",
  ];

  for (const contentType of contentTypes) {
    console.log(`\nContent-Type: ${contentType}`);
    try {
      const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": contentType,
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(body),
      });
      console.log("  状态:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.log("  错误:", text);
      }
    } catch (error) {
      console.log("  错误:", error.message);
    }
  }
}

async function testAuthHeaderFormats() {
  console.log("\n" + "=".repeat(60));
  console.log("[测试 4] 测试不同的 Auth Header 格式");

  const body = {
    model: GROQ_MODEL_ID,
    messages: [{ role: "user", content: "Hi" }],
    max_tokens: 5,
  };

  const authFormats = [
    `Bearer ${GROQ_API_KEY}`,
    `bearer ${GROQ_API_KEY}`,
    `Bearer ${GROQ_API_KEY.trim()}`,
  ];

  for (const auth of authFormats) {
    console.log(`\nAuthorization: ${auth.slice(0, 20)}...`);
    try {
      const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": auth,
        },
        body: JSON.stringify(body),
      });
      console.log("  状态:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.log("  错误:", text);
      }
    } catch (error) {
      console.log("  错误:", error.message);
    }
  }
}

async function main() {
  await testSimpleRequest();
  await testWithCreateMessageFirst();
  await testDifferentContentTypes();
  await testAuthHeaderFormats();
}

main().catch(console.error);
