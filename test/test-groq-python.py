"""
Groq API 测试脚本 - Python 版本
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

GROQ_API_KEY = os.getenv("AI_API_KEY", "")
GROQ_MODEL_ID = os.getenv("AI_MODEL_ID", "")
GROQ_API_URL = "https://api.groq.com/openai/v1"

print("=" * 60)
print("Groq API Python 测试")
print("=" * 60)
print(f"API URL: {GROQ_API_URL}")
print(f"Model: {GROQ_MODEL_ID}")
print(f"API Key: {GROQ_API_KEY[:8]}...{GROQ_API_KEY[-4:]}")
print("=" * 60)

# 使用标准库的 urllib 测试
import urllib.request
import urllib.error

def test_with_urllib():
    print("\n[测试 1] 使用 urllib 测试")

    url = f"{GROQ_API_URL}/chat/completions"

    data = {
        "model": GROQ_MODEL_ID,
        "messages": [
            {"role": "user", "content": "你好，请用一句话介绍你自己"}
        ],
        "max_tokens": 50
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}"
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as response:
            result = response.read().decode("utf-8")
            print(f"状态：{response.status}")
            print(f"响应：{result}")

            result_data = json.loads(result)
            content = result_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"\nAI 回复：{content}")

    except urllib.error.HTTPError as e:
        print(f"HTTP 错误：{e.code} {e.reason}")
        error_body = e.read().decode("utf-8")
        print(f"错误详情：{error_body}")
    except urllib.error.URLError as e:
        print(f"URL 错误：{e.reason}")
    except Exception as e:
        print(f"其他错误：{e}")

def test_with_requests_style():
    print("\n" + "=" * 60)
    print("[测试 2] 使用 http.client 测试")
    print("=" * 60)

    import http.client

    conn = http.client.HTTPSConnection("api.groq.com")

    payload = json.dumps({
        "model": GROQ_MODEL_ID,
        "messages": [
            {"role": "system", "content": "你是一个有帮助的助手"},
            {"role": "user", "content": "Hello"}
        ],
        "max_tokens": 10
    })

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {GROQ_API_KEY}'
    }

    try:
        conn.request("POST", "/openai/v1/chat/completions", payload, headers)
        res = conn.getresponse()
        data = res.read().decode("utf-8")

        print(f"状态：{res.status} {res.reason}")
        print(f"响应头：{dict(res.getheaders())}")
        print(f"响应内容：{data}")

    except Exception as e:
        print(f"错误：{e}")
    finally:
        conn.close()

def test_with_simple_request():
    print("\n" + "=" * 60)
    print("[测试 3] 最简请求")
    print("=" * 60)

    import http.client

    conn = http.client.HTTPSConnection("api.groq.com")

    # 最简请求
    payload = json.dumps({
        "model": GROQ_MODEL_ID,
        "messages": [{"role": "user", "content": "Hi"}],
        "max_tokens": 5
    })

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {GROQ_API_KEY}'
    }

    print(f"请求 URL: https://api.groq.com/openai/v1/chat/completions")
    print(f"请求体：{payload}")
    print(f"Headers: Content-Type=application/json, Authorization=Bearer ***")

    try:
        conn.request("POST", "/openai/v1/chat/completions", payload, headers)
        res = conn.getresponse()
        data = res.read().decode("utf-8")

        print(f"\n状态码：{res.status} {res.reason}")
        print(f"响应内容：{data}")

        if res.status == 200:
            print("\n✓ API Key 有效！")
        else:
            print(f"\n✗ API Key 可能无效，状态码：{res.status}")

    except Exception as e:
        print(f"错误：{e}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_with_urllib()
    test_with_requests_style()
    test_with_simple_request()
