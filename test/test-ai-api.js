/**
 * AI API 测试脚本
 * 测试直接调用 AI API（跳过服务器代理）
 */

const dotenv = require("dotenv");
const path = require("path");

// 加载 .env 文件
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const AI_API_BASE_URL = process.env.AI_API_BASE_URL || "";
const AI_MODEL_ID = process.env.AI_MODEL_ID || "";
const AI_API_KEY = process.env.AI_API_KEY || "";

console.log("=".repeat(60));
console.log("AI API 直接调用测试");
console.log("=".repeat(60));
console.log("API Base URL:", AI_API_BASE_URL);
console.log("Model ID:", AI_MODEL_ID);
console.log("API Key:", AI_API_KEY ? `${AI_API_KEY.slice(0, 8)}...` : "(empty)");
console.log("=".repeat(60));

async function testChatCompletions() {
  console.log("\n[测试] 直接调用 AI API 生成造句...\n");

  const isChinese = true;
  const word = "coincidence";

  const systemPrompt = isChinese
    ? '你是一个语言学习助手。请根据提供的词语，造一个简单、实用的句子。返回格式为 JSON：{"sentence": "造句内容", "translation": "英文翻译（如果是中文造句）"}。只返回 JSON，不要其他内容。'
    : 'You are a language learning assistant. Please create a simple, practical sentence using the provided word. Return in JSON format: {"sentence": "the sentence", "translation": "translation to Chinese"}. Only return JSON, nothing else.';

  const userPrompt = `请用以下词语造句：${word}`;

  const apiUrl = AI_API_BASE_URL.replace(/\/$/, "");
  const url = `${apiUrl}/chat/completions`;

  console.log("请求 URL:", url);
  console.log("请求体:", JSON.stringify({
    model: AI_MODEL_ID,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 200,
  }, null, 2));
  console.log();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL_ID,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    console.log("响应状态:", response.status);
    console.log("响应头:", JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    const text = await response.text();
    console.log("原始响应:", text.slice(0, 500) + (text.length > 500 ? "..." : ""));

    if (response.ok) {
      const data = JSON.parse(text);
      console.log("\n解析后的数据:");
      console.log("  choices[0].message.content:", data.choices?.[0]?.message?.content);

      // 尝试解析返回的 JSON
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          console.log("\n造句结果:");
          console.log("  sentence:", parsed.sentence);
          console.log("  translation:", parsed.translation);
        } catch (e) {
          console.log("\n无法解析返回的 JSON 内容:", e.message);
        }
      }
    } else {
      console.log("\n错误:", text);
    }
  } catch (error) {
    console.error("请求失败:", error);
  }
}

async function main() {
  await testChatCompletions();
}

main().catch(console.error);
