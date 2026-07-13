/**
 * 检查 .env 文件中的 API Key
 */

const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const content = fs.readFileSync(envPath, 'utf-8');

console.log("=".repeat(60));
console.log("检查 .env 文件");
console.log("=".repeat(60));

const lines = content.split('\n');
for (const line of lines) {
  if (line.includes('AI_API_KEY')) {
    console.log("\n原始行:", line);

    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0];
      const value = parts.slice(1).join('=');

      console.log("Key:", key);
      console.log("Value:", value);
      console.log("Value 长度:", value.length);

      // 检查每个字符
      console.log("\n字符分析:");
      for (let i = 0; i < value.length; i++) {
        const char = value[i];
        const code = value.charCodeAt(i);
        const hex = code.toString(16).padStart(4, '0');
        const display = code >= 32 && code < 127 ? char : '?';
        console.log(`  [${i}] ${code.toString().padStart(3)} (0x${hex}) '${display}'`);
      }
    }
  }
}

// 测试使用 trim() 后的 Key
console.log("\n" + "=".repeat(60));
console.log("测试 trim() 后的 Key");
console.log("=".repeat(60));

const apiKeyLine = lines.find(l => l.includes('AI_API_KEY'));
if (apiKeyLine) {
  const apiKey = apiKeyLine.split('=')[1]?.trim();
  console.log("API Key:", apiKey);
  console.log("API Key 长度:", apiKey?.length);

  // 测试 API 请求
  testApiKey(apiKey);
}

async function testApiKey(apiKey) {
  console.log("\n使用 trim() 后的 Key 测试...");

  const body = JSON.stringify({
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", "content": "Hi" }],
    max_tokens: 5
  });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: body,
    });

    console.log("状态:", response.status);
    const text = await response.text();
    console.log("响应:", text);

    if (response.status === 200) {
      console.log("\n成功！");
    } else {
      console.log("\n失败！");
    }
  } catch (error) {
    console.log("错误:", error.message);
  }
}
