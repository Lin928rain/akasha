"""
快速测试 - 使用 urllib
"""

import urllib.request
import urllib.error
import json

API_KEY = 'your-groq-api-key'
MODEL = 'openai/gpt-oss-120b'
URL = 'https://api.groq.com/openai/v1/chat/completions'

print(f"Testing: {MODEL}")
print(f"API Key: {API_KEY[:8]}...{API_KEY[-4:]}")

data = json.dumps({
    'model': MODEL,
    'messages': [{'role': 'user', 'content': 'Hi'}],
    'max_tokens': 5
}).encode('utf-8')

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {API_KEY}',
}

req = urllib.request.Request(URL, data=data, headers=headers, method='POST')

try:
    with urllib.request.urlopen(req, timeout=30) as res:
        print(f'Status: {res.status}')
        result = res.read().decode()
        print(f'Response: {result}')

        if res.status == 200:
            parsed = json.loads(result)
            content = parsed.get('choices', [{}])[0].get('message', {}).get('content', '')
            print(f'AI Reply: {content}')

except urllib.error.HTTPError as e:
    print(f'HTTP Error: {e.code} {e.reason}')
    print(f'Body: {e.read().decode()}')
except Exception as e:
    print(f'Error: {e}')
