"""
最精确的 API 测试 - 对比 Node.js 和 Python 的行为
"""

import http.client
import json
import ssl

# API 配置
API_KEY = "your-groq-api-key"
MODEL = "openai/gpt-oss-120b"
HOST = "api.groq.com"
PATH = "/openai/v1/chat/completions"

print("=" * 60)
print("Python 精确 HTTP 测试")
print("=" * 60)
print(f"Host: {HOST}")
print(f"Path: {PATH}")
print(f"Model: {MODEL}")
print(f"API Key: {API_KEY[:8]}...{API_KEY[-4:]}")
print("=" * 60)

def send_request(extra_headers=None):
    body = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": "Hi"}],
        "max_tokens": 5
    })

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}',
        'Content-Length': str(len(body)),
    }

    if extra_headers:
        headers.update(extra_headers)

    print(f"\nHeaders: {headers}")

    # 创建 HTTPS 连接，关闭 SSL 验证（排除 SSL 问题）
    context = ssl.create_default_context()
    conn = http.client.HTTPSConnection(HOST, context=context, timeout=30)

    try:
        conn.request("POST", PATH, body, headers)
        res = conn.getresponse()

        print(f"状态：{res.status} {res.reason}")

        # 读取响应头
        print("响应头:")
        for header in res.getheaders():
            print(f"  {header[0]}: {header[1]}")

        data = res.read().decode("utf-8")
        print(f"响应体：{data}")

        if res.status == 200:
            print("\n成功！")
            result = json.loads(data)
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"AI 回复：{content}")
        else:
            print("\n失败！")

        return res.status

    except Exception as e:
        print(f"错误：{e}")
        return None
    finally:
        conn.close()

# 测试 1: 基本请求
print("\n[测试 1] 基本请求")
send_request()

# 测试 2: 添加 User-Agent
print("\n[测试 2] 添加 User-Agent")
send_request({'User-Agent': 'Python-urllib/3.9'})

# 测试 3: 添加 Accept 头
print("\n[测试 3] 添加 Accept 头")
send_request({
    'User-Agent': 'Python-urllib/3.9',
    'Accept': '*/*'
})

# 测试 4: 完整头
print("\n[测试 4] 完整头")
send_request({
    'User-Agent': 'Python-urllib/3.9',
    'Accept': '*/*',
    'Connection': 'keep-alive'
})
