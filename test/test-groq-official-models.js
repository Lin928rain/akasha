/**
 * 测试 Groq 官方可用模型
 *
 * 根据 Groq 官方文档，可用的模型包括：
 * - llama-3.1-8b-instant
 * - llama-3.1-70b-versatile
 * - llama-3.2-11b-vision-preview
 * - llama-3.2-3b-preview
 * - mixtral-8x7b-32768
 * - gemma-7b-it
 * - gemma2-9b-it
 */

const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const GROQ_API_KEY = process.env.AI_API_KEY || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1";

// Groq 官方可用模型列表
const GROQ_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.1-70b-versatile",
  "llama-3.2-11b-vision-preview",
  "llama-3.2-3b-preview",
  "mixtral-8x7b-32768",
  "gemma-7b-it",
  "gemma2-9b-it",
];

async function testGroqModels() {
  console.log("=".repeat(60));
  console.log("测试 Groq 官方模型列表");
  console.log("=".repeat(60));
  console.log("API Key:", `${GROQ_API_KEY.slice(0, 8)}...${GROQ_API_KEY.slice(-4)}`);
  console.log();

  for (const model of GROQ_MODELS) {
    console.log(`测试模型：${model}`);

    try {
      const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "user", content: "Say hi in one word" },
          ],
          max_tokens: 10,
        }),
      });

      console.log(`  状态：${response.status} ${response.statusText}`);

      const text = await response.text();
      if (response.ok) {
        const data = JSON.parse(text);
        console.log(`  响应：${data.choices?.[0]?.message?.content}`);
      } else {
        console.log(`  错误：${text}`);
      }
    } catch (error) {
      console.log(`  异常：${error.message}`);
    }

    // 等待一下，避免速率限制
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// 也测试一下用户当前的模型
async function testCurrentModel() {
  console.log("\n" + "=".repeat(60));
  console.log("测试当前配置的模型");
  console.log("=".repeat(60));

  const currentModel = process.env.AI_MODEL_ID || "openai/gpt-oss-120b";
  console.log(`当前模型：${currentModel}`);

  try {
    const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: currentModel,
        messages: [
          { role: "user", content: "Say hi" },
        ],
        max_tokens: 10,
      }),
    });

    console.log(`  状态：${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`  响应：${text}`);
  } catch (error) {
    console.log(`  异常：${error.message}`);
  }
}

async function main() {
  await testGroqModels();
  await testCurrentModel();
}

main().catch(console.error);
