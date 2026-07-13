"""
测试 opencode.ai API
"""

import os
import json
from pathlib import Path
import http.client

# 手动加载 .env 文件
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

# 这是你之前配置的 opencode.ai
OPENCODE_API_URL = "https://opencode.ai/zen/v1"
OPENCODE_MODEL = "mimo-v2-flash-free"
# 从 .env 读取
API_KEY = os.getenv("AI_API_KEY", "")

print("=" * 60)
print("测试 opencode.ai API")
print("=" * 60)
print(f"API URL: {OPENCODE_API_URL}")
print(f"Model: {OPENCODE_MODEL}")
print(f"API Key: {API_KEY[:8]}...{API_KEY[-4:] if len(API_KEY) > 12 else ''}")
print("=" * 60)

def test_opencode():
    # 解析 URL
    url = OPENCODE_API_URL.replace("https://", "")
    parts = url.split("/", 1)
    host = parts[0]
    path = "/" + parts[1] if len(parts) > 1 else "/"

    print(f"Host: {host}")
    print(f"Path: {path}")

    conn = http.client.HTTPSConnection(host)

    payload = json.dumps({
        "model": OPENCODE_MODEL,
        "messages": [
            {"role": "system", "content": "你是一个有帮助的助手"},
            {"role": "user", "content": "你好，请用一句话介绍你自己"}
        ],
        "max_tokens": 50
    })

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}'
    }

    try:
        conn.request("POST", f"{path}/chat/completions", payload, headers)
        res = conn.getresponse()
        data = res.read().decode("utf-8")

        print(f"\n状态码：{res.status} {res.reason}")
        print(f"响应内容：{data[:500]}")

        if res.status == 200:
            result = json.loads(data)
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"\nAI 回复：{content}")
            print("\n成功!")
        else:
            print(f"\n失败!")

    except Exception as e:
        print(f"错误：{e}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_opencode()
