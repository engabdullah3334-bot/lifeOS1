import requests
import os
import time

def call(prompt: str, retries=3, delay=2) -> str:
    api_key = os.getenv("GROK_API_KEY", "").strip()
    url = "https://api.xai.com/v1/chat/completions"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    payload = {
        "model": "grok-beta", # أو الإصدار الذي تملكه
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "temperature": 0.7
    }

    for i in range(retries):
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"]
            
            if response.status_code in [429, 503]: # التعامل مع ضغط السيرفر
                time.sleep(delay * (i + 1))
                continue
                
            response.raise_for_status()
        except Exception as e:
            if i == retries - 1: raise RuntimeError(f"Grok API Error: {str(e)}")
            
    return "Grok server is busy, try again."