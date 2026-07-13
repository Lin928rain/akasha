"""
最精确的 Groq API 测试 - 完全模拟聊天软件请求
"""

import os
import json
import ssl
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

API_KEY = os.getenv("AI_API_KEY", "").strip()
API_URL = "https://api.groq.com/openai/v1"
MODEL = "openai/gpt-oss-120b"

print("=" * 60)
print("精确测试 Groq API")
print("=" * 60)
print(f"API Key: {API_KEY}")
print(f"API URL: {API_URL}")
print(f"Model: {MODEL}")
print("=" * 60)

# 方法 1: 使用原始 HTTP
def test_raw_http():
    print("\n[方法 1] 原始 HTTP 请求")

    host = "api.groq.com"
    path = "/openai/v1/chat/completions"

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "user", "content": "你好"}
        ],
        "max_tokens": 10
    }

    body = json.dumps(payload, separators=(',', ':'))

    headers = {
        "Host": host,
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
        "Content-Length": str(len(body)),
        "User-Agent": "Mozilla/5.0"
    }

    print(f"请求体：{body}")
    print(f"Headers: {headers}")

    conn = http.client.HTTPSConnection(host)

    try:
        conn.request("POST", path, body, headers)
        res = conn.getresponse()

        print(f"\n状态：{res.status} {res.reason}")

        # 读取所有响应头
        print("响应头:")
        for header in res.getheaders():
            print(f"  {header[0]}: {header[1]}")

        data = res.read().decode("utf-8")
        print(f"响应体：{data}")

    except Exception as e:
        print(f"错误：{e}")
    finally:
        conn.close()

# 方法 2: 使用 urllib（更接近浏览器行为）
def test_urllib():
    print("\n" + "=" * 60)
    print("[方法 2] urllib 请求")

    import urllib.request
    import urllib.error

    url = f"{API_URL}/chat/completions"

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "user", "content": "你好"}
        ],
        "max_tokens": 10
    }

    data = json.dumps(payload).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
        "User-Agent": "ChatGPT-Web/1.0"
    }

    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            print(f"状态：{res.status}")
            result = res.read().decode("utf-8")
            print(f"响应：{result}")
    except urllib.error.HTTPError as e:
        print(f"HTTP 错误：{e.code} {e.reason}")
        print(f"响应头：{dict(e.headers)}")
        body = e.read().decode("utf-8")
        print(f"响应体：{body}")
    except urllib.error.URLError as e:
        print(f"URL 错误：{e.reason}")
    except Exception as e:
        print(f"其他错误：{e}")

# 方法 3: 检查 API Key 是否有特殊字符
def test_api_key_format():
    print("\n" + "=" * 60)
    print("[方法 3] API Key 格式检查")

    print(f"原始 Key: {repr(API_KEY)}")
    print(f"Key 长度：{len(API_KEY)}")
    print(f"Key 前缀：{API_KEY[:8]}")
    print(f"Key 后缀：{API_KEY[-4:]}")

    # 检查是否有隐藏字符
    if API_KEY != API_KEY.strip():
        print("警告：Key 包含首尾空白字符！")
        print(f"strip 后：{repr(API_KEY.strip())}")

    # 检查是否有不可见字符
    for i, c in enumerate(API_KEY):
        if ord(c) < 32:
            print(f"警告：位置 {i} 有不可见字符 (ord={ord(c)})")

if __name__ == "__main__":
    test_api_key_format()
    test_raw_http()
    test_urllib()
