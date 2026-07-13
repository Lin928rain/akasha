/**
 * Groq API 模型列表测试
 * 获取可用的模型列表
 */

const dotenv = require("dotenv");
const path = require("path");

// 加载 .env 文件
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const GROQ_API_KEY = process.env.AI_API_KEY || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1";

console.log("=".repeat(60));
console.log("Groq API 模型列表测试");
console.log("=".repeat(60));

async function testModelsEndpoint() {
  console.log("\n[测试] 获取模型列表...\n");

  try {
    const response = await fetch(`${GROQ_API_URL}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
    });

    console.log("状态码:", response.status, response.statusText);

    const data = await response.json();
    console.log("响应:", JSON.stringify(data, null, 2));

    if (response.ok && data.data) {
      console.log("\n可用模型列表:");
      data.data.forEach(model => {
        console.log(`  - ${model.id}`);
      });
    }
  } catch (error) {
    console.error("请求失败:", error.message);
  }
}

async function testStandardModel() {
  console.log("\n" + "=".repeat(60));
  console.log("测试标准模型 (llama-3.1-8b-instant)");
  console.log("=".repeat(60));

  try {
    const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello in one word." },
        ],
        max_tokens: 10,
      }),
    });

    console.log("状态码:", response.status, response.statusText);

    const text = await response.text();
    if (response.ok) {
      const data = JSON.parse(text);
      console.log("响应内容:", data.choices?.[0]?.message?.content);
    } else {
      console.log("错误:", text);
    }
  } catch (error) {
    console.error("请求失败:", error.message);
  }
}

async function main() {
  await testModelsEndpoint();
  await testStandardModel();
}

main().catch(console.error);
