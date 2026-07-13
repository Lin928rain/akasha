/**
 * 服务器 AI 代理 API 测试脚本
 * 测试通过本地服务器代理调用 AI API
 */

const dotenv = require("dotenv");
const path = require("path");

// 加载 .env 文件
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SERVER_API_URL = process.env.VITE_API_URL || "http://localhost:8787";

console.log("=".repeat(60));
console.log("服务器 AI 代理 API 测试");
console.log("=".repeat(60));
console.log("服务器地址:", SERVER_API_URL);
console.log("=".repeat(60));

async function testServerProxy() {
  console.log("\n[测试] 通过服务器代理调用 AI API...\n");

  const word = "coincidence";
  const language = "zh";

  const url = `${SERVER_API_URL}/api/ai/generate-sentence`;

  console.log("请求 URL:", url);
  console.log("请求体:", JSON.stringify({ word, language }, null, 2));
  console.log();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word, language }),
    });

    console.log("响应状态:", response.status);
    console.log("响应头:", JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    const text = await response.text();
    console.log("原始响应:", text.slice(0, 500) + (text.length > 500 ? "..." : ""));

    if (response.ok) {
      const data = JSON.parse(text);
      console.log("\n造句结果:");
      console.log("  sentence:", data.sentence);
      console.log("  translation:", data.translation);
    } else {
      console.log("\n错误:", text);
    }
  } catch (error) {
    console.error("请求失败:", error);
  }
}

async function main() {
  await testServerProxy();
}

main().catch(console.error);
