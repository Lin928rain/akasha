/**
 * 详细调试测试脚本
 * 打印更多请求细节，用于诊断 403 Forbidden 问题
 */

const dotenv = require("dotenv");
const path = require("path");

// 加载 .env 文件
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const AI_API_BASE_URL = process.env.AI_API_BASE_URL || "";
const AI_MODEL_ID = process.env.AI_MODEL_ID || "";
const AI_API_KEY = process.env.AI_API_KEY || "";

console.log("=".repeat(60));
console.log("AI API 详细调试测试");
console.log("=".repeat(60));
console.log("API Base URL:", AI_API_BASE_URL);
console.log("Model ID:", AI_MODEL_ID);
console.log("API Key:", AI_API_KEY ? `${AI_API_KEY.slice(0, 8)}...${AI_API_KEY.slice(-4)}` : "(empty)");
console.log("=".repeat(60));

async function testWithDebug() {
  console.log("\n[调试测试] 发送请求并记录所有细节...\n");

  const word = "coincidence";
  const language = "zh";
  const isChinese = language.startsWith("zh");

  const systemPrompt = isChinese
    ? '你是一个语言学习助手。请根据提供的词语，造一个简单、实用的句子。返回格式为 JSON：{"sentence": "造句内容", "translation": "英文翻译（如果是中文造句）"}。只返回 JSON，不要其他内容。'
    : 'You are a language learning assistant. Please create a simple, practical sentence using the provided word. Return in JSON format: {"sentence": "the sentence", "translation": "translation to Chinese"}. Only return JSON, nothing else.';

  const userPrompt = `请用以下词语造句：${word}`;

  const apiUrl = AI_API_BASE_URL.replace(/\/$/, "");
  const url = `${apiUrl}/chat/completions`;

  const requestBody = {
    model: AI_MODEL_ID,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 200,
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AI_API_KEY}`,
  };

  console.log("请求方法：POST");
  console.log("请求 URL:", url);
  console.log("请求 Headers:");
  Object.entries(headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${key === "Authorization" ? `Bearer ***${AI_API_KEY.slice(-4)}` : value}`);
  });
  console.log("请求 Body:");
  console.log(JSON.stringify(requestBody, null, 2));
  console.log();

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });
    const endTime = Date.now();

    console.log("=".repeat(60));
    console.log("响应信息:");
    console.log("  请求耗时:", endTime - startTime, "ms");
    console.log("  状态码:", response.status, response.statusText);
    console.log("  OK:", response.ok);
    console.log("  响应 Headers:");
    for (const [key, value] of response.headers.entries()) {
      console.log(`    ${key}: ${value}`);
    }

    const text = await response.text();
    console.log("  原始响应内容:");
    console.log(text);

    if (response.ok) {
      try {
        const data = JSON.parse(text);
        const content = data.choices?.[0]?.message?.content;
        console.log("\n解析成功!");
        console.log("  返回内容:", content);

        if (content) {
          try {
            const parsed = JSON.parse(content);
            console.log("\nJSON 解析成功:");
            console.log("  sentence:", parsed.sentence);
            console.log("  translation:", parsed.translation);
          } catch (e) {
            console.log("\n返回内容不是有效 JSON:", e.message);
            console.log("  原始内容:", content);
          }
        }
      } catch (e) {
        console.log("\n响应不是有效 JSON:", e.message);
      }
    } else {
      console.log("\n请求失败，状态码:", response.status);
    }
  } catch (error) {
    console.error("请求异常:", error);
    console.error("  name:", error.name);
    console.error("  message:", error.message);
    console.error("  stack:", error.stack);
  }
}

// 测试不同的 model 名称格式
async function testDifferentModelFormats() {
  console.log("\n" + "=".repeat(60));
  console.log("测试不同的 Model 名称格式");
  console.log("=".repeat(60));

  const modelNames = [
    AI_MODEL_ID,
    AI_MODEL_ID?.trim(),
    AI_MODEL_ID?.toLowerCase(),
    AI_MODEL_ID?.toUpperCase(),
  ].filter(Boolean);

  const uniqueModels = [...new Set(modelNames)];

  console.log("原始 Model ID:", AI_MODEL_ID);
  console.log("去重后的测试列表:", uniqueModels);

  for (const model of uniqueModels) {
    console.log(`\n测试 model: ${model}`);

    try {
      const response = await fetch(`${AI_API_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Say hello in one word." },
          ],
          max_tokens: 10,
        }),
      });

      console.log(`  状态码：${response.status} ${response.statusText}`);
      if (!response.ok) {
        const text = await response.text();
        console.log(`  错误：${text.slice(0, 200)}`);
      }
    } catch (error) {
      console.log(`  异常：${error.message}`);
    }
  }
}

async function main() {
  await testWithDebug();
  await testDifferentModelFormats();
}

main().catch(console.error);
