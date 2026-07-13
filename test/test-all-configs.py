"""
测试所有可能的 API 配置
"""

import os
import json
from pathlib import Path

# 手动加载 .env 文件
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

API_KEY = os.getenv("AI_API_KEY", "")

print("=" * 60)
print("测试所有可能的 API 配置")
print("=" * 60)

import http.client

def test_api(api_url, model, api_key, name):
    print(f"\n测试：{name}")
    print(f"  URL: {api_url}")
    print(f"  Model: {model}")

    conn = http.client.HTTPSConnection(api_url.replace("https://", ""))

    payload = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": "Hi"}],
        "max_tokens": 5
    })

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }

    path = "/chat/completions"

    try:
        conn.request("POST", path, payload, headers)
        res = conn.getresponse()
        data = res.read().decode("utf-8")

        status = f"{res.status} {res.reason}"
        if res.status == 200:
            print(f"  结果：SUCCESS - {status}")
            result = json.loads(data)
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"  回复：{content}")
            return True
        else:
            print(f"  结果：FAILED - {status}")
            print(f"  错误：{data}")
    except Exception as e:
        print(f"  结果：ERROR - {e}")
    finally:
        conn.close()

    return False

# 测试配置列表
configs = [
    # Groq 官方
    ("https://api.groq.com", "openai/v1", "llama-3.1-8b-instant", API_KEY, "Groq llama-3.1-8b-instant"),
    ("https://api.groq.com", "openai/v1", "llama-3.1-70b-versatile", API_KEY, "Groq llama-3.1-70b"),

    # 当前配置
    ("https://api.groq.com", "openai/v1", "openai/gpt-oss-120b", API_KEY, "当前配置 gpt-oss-120b"),
]

# 如果你知道聊天软件用的配置，可以添加到这里

print("\n提示：如果你的聊天软件用的是其他 API（如 opencode.ai），")
print("请告诉我具体的配置，我来添加测试")

results = []
for config in configs:
    api_url, path, model, key, name = config
    full_url = f"{api_url}/{path}"
    result = test_api(api_url, model, key, name)
    results.append((name, result))

print("\n" + "=" * 60)
print("测试结果汇总")
print("=" * 60)
for name, result in results:
    status = "✓ SUCCESS" if result else "✗ FAILED"
    print(f"{status}: {name}")
