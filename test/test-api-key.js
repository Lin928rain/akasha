/**
 * 测试 API Key 格式和有效性
 */

const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const API_KEY = process.env.AI_API_KEY || "";

console.log("=".repeat(60));
console.log("API Key 格式检查");
console.log("=".repeat(60));
console.log("Key 长度:", API_KEY.length);
console.log("Key 前缀:", API_KEY.slice(0, 10));
console.log("Key 完整:", API_KEY);

// 检查 Key 的格式
const gskPattern = /^gsk_[A-Za-z0-9]+$/;
console.log("\n格式检查:");
console.log("  符合 gsk_ 格式:", gskPattern.test(API_KEY));

// 测试不同的 API URL 格式
async function testUrlFormats() {
  console.log("\n" + "=".repeat(60));
  console.log("测试不同的 URL 格式");
  console.log("=".repeat(60));

  const urlFormats = [
    "https://api.groq.com/openai/v1/chat/completions",
    "https://api.groq.com/v1/chat/completions",
    "https://console.groq.com/openai/v1/chat/completions",
  ];

  const body = {
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "You are a helper." },
      { role: "user", content: "Hi" },
    ],
    max_tokens: 5,
  };

  for (const url of urlFormats) {
    console.log(`\n测试 URL: ${url}`);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
      });
      console.log(`  状态：${response.status} ${response.statusText}`);
      const text = await response.text();
      if (!response.ok) {
        console.log(`  错误：${text}`);
      }
    } catch (error) {
      console.log(`  异常：${error.message}`);
    }
  }
}

async function main() {
  await testUrlFormats();
}

main().catch(console.error);
