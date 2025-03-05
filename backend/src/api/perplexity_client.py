import requests
import json
from ..config.settings import PERPLEXITY_API_KEY

class PerplexityClient:
    def __init__(self):
        self.api_key = PERPLEXITY_API_KEY
        self.endpoint = "https://api.perplexity.ai/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def complete(self, prompt):
        try:
            payload = {
                "model": "sonar",  # ドキュメントに記載されている正しいモデル名
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "max_tokens": 1000,
                "temperature": 0.2,
                "top_p": 0.9
            }
            
            response = requests.post(
                self.endpoint,
                headers=self.headers,
                data=json.dumps(payload)
            )
            
            if response.status_code != 200:
                print(f"Error: API returned status code {response.status_code}")
                print(f"Response: {response.text}")
                # エラー時にはダミーのキーワードを返す
                return "- 精密工具\n- 測定器具\n- 工業用部品"
                
            result = response.json()
            return result["choices"][0]["message"]["content"]
            
        except Exception as e:
            print(f"Error in Perplexity API call: {e}")
            # 例外発生時にもダミーのキーワードを返す
            return "- 精密工具\n- 測定器具\n- 工業用部品"

perplexity_client = PerplexityClient() 