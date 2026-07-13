/**
 * 自定义配置测试脚本
 * 可以在这里输入你在聊天测试软件中使用的配置
 */

const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function testCustomConfig() {
  console.log("=".repeat(60));
  console.log("自定义配置测试");
  console.log("=".repeat(60));
  console.log("请输入你在聊天测试软件中使用的配置\n");

  const apiUrl = await askQuestion("API Base URL (例如：https://opencode.ai/zen/v1): ");
  const apiKey = await askQuestion("API Key: ");
  const modelId = await askQuestion("Model ID: ");

  rl.close();

  console.log("\n" + "=".repeat(60));
  console.log("使用以下配置进行测试:");
  console.log("  API URL:", apiUrl);
  console.log("  Model:", modelId);
  console.log("  API Key:", apiKey ? `${apiKey.slice(0, 8)}...` : "(empty)");
  console.log("=".repeat(60));

  const body = {
    model: modelId,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "请用 'coincidence' 造句，返回 JSON 格式：{\"sentence\": \"英文句子\", \"translation\": \"中文翻译\"}" },
    ],
    temperature: 0.7,
    max_tokens: 200,
  };

  const url = apiUrl.replace(/\/$/, "") + "/chat/completions";

  console.log("\n发送请求...");
  console.log("URL:", url);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    console.log("\n响应状态:", response.status, response.statusText);
    console.log("响应头:");
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    const text = await response.text();
    console.log("\n原始响应:");
    console.log(text);

    if (response.ok) {
      const data = JSON.parse(text);
      const content = data.choices?.[0]?.message?.content;
      console.log("\n解析成功!");
      console.log("返回内容:", content);
    } else {
      console.log("\n请求失败!");
    }
  } catch (error) {
    console.error("\n请求异常:", error.message);
  }
}

testCustomConfig().catch(console.error);
