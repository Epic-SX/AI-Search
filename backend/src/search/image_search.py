import requests
import base64
import json
from ..config.settings import GOOGLE_CLOUD_API_KEY, GOOGLE_VISION_API_ENDPOINT

class ImageSearchEngine:
    def __init__(self):
        self.api_key = GOOGLE_CLOUD_API_KEY
        self.endpoint = GOOGLE_VISION_API_ENDPOINT

    def search_similar_images(self, image_data=None, image_url=None):
        """
        画像データまたはURLから類似画像を検索
        """
        try:
            if not image_data and not image_url:
                raise ValueError("Either image_data or image_url must be provided")
                
            # Google Cloud Vision APIリクエストの準備
            request_data = {
                "requests": [
                    {
                        "features": [
                            {
                                "type": "WEB_DETECTION",
                                "maxResults": 10
                            }
                        ]
                    }
                ]
            }
            
            # 画像データまたはURLを設定
            if image_data:
                # Base64エンコードされた画像データを使用
                request_data["requests"][0]["image"] = {
                    "content": base64.b64encode(image_data).decode('utf-8')
                }
            else:
                # 画像URLを使用
                request_data["requests"][0]["image"] = {
                    "source": {
                        "imageUri": image_url
                    }
                }
            
            # APIリクエストを送信
            api_url = f"{self.endpoint}?key={self.api_key}"
            response = requests.post(api_url, json=request_data)
            
            if response.status_code != 200:
                print(f"Error in Google Vision API: {response.status_code} - {response.text}")
                return self._get_fallback_results()
                
            result = response.json()
            
            # レスポンスから類似商品情報を抽出
            if 'responses' in result and len(result['responses']) > 0:
                web_detection = result['responses'][0].get('webDetection', {})
                return self.process_similar_products(web_detection)
            
            return self._get_fallback_results()
            
        except Exception as e:
            print(f"Error in image search: {e}")
            return self._get_fallback_results()

    def process_similar_products(self, web_detection):
        """
        Web Detection結果から類似商品情報を抽出
        """
        similar_products = []
        
        # 視覚的に類似した画像の処理
        visual_matches = web_detection.get('visuallySimilarImages', [])
        for match in visual_matches[:5]:  # 上位5件を取得
            product = {
                'image_url': match.get('url'),
                'score': round(float(match.get('score', 0.0)), 2) if 'score' in match else 0.0,
                'title': self._extract_title(match)
            }
            similar_products.append(product)
            
        # 完全一致または部分一致の画像も追加
        full_matches = web_detection.get('fullMatchingImages', [])
        for match in full_matches[:2]:  # 上位2件を取得
            if len(similar_products) >= 5:
                break
            product = {
                'image_url': match.get('url'),
                'score': 1.0,  # 完全一致は最高スコア
                'title': self._extract_title(match),
                'match_type': 'exact'
            }
            similar_products.append(product)

        return similar_products

    def _extract_title(self, match):
        """
        画像から商品タイトルを抽出（可能な場合）
        """
        # ページタイトルやラベルから商品名を推測
        if 'pageTitle' in match:
            return match['pageTitle']
        return "類似商品"
        
    def _get_fallback_results(self):
        """
        APIエラー時のフォールバック結果を返す
        """
        return [
            {
                'image_url': "https://placehold.co/300x300/eee/999?text=Similar+Product+1",
                'score': 0.95,
                'title': "類似商品 1"
            },
            {
                'image_url': "https://placehold.co/300x300/eee/999?text=Similar+Product+2",
                'score': 0.87,
                'title': "類似商品 2"
            },
            {
                'image_url': "https://placehold.co/300x300/eee/999?text=Similar+Product+3",
                'score': 0.82,
                'title': "類似商品 3"
            }
        ] 