import requests
import hashlib
import time
import urllib.parse
import re
from bs4 import BeautifulSoup
from src.config.settings import KAKAKU_SHOP_CD, KAKAKU_API_KEY, KAKAKU_OAUTH_SECRET, KAKAKU_API_ENDPOINT

class KakakuAPI:
    def __init__(self):
        self.shop_cd = KAKAKU_SHOP_CD
        self.api_key = KAKAKU_API_KEY
        self.oauth_secret = KAKAKU_OAUTH_SECRET
        self.endpoint = KAKAKU_API_ENDPOINT

    def get_price(self, product_info):
        """
        価格.comから商品価格情報を取得
        """
        try:
            # 価格.comのAPIが利用できない場合は、Webスクレイピングを使用
            # 検索ページから商品情報を取得
            encoded_keyword = urllib.parse.quote(product_info)
            search_url = f"https://kakaku.com/search_results/{encoded_keyword}/"
            
            # スクレイピングで商品情報を取得
            product_data = self._scrape_kakaku_product(search_url)
            
            if product_data:
                return {
                    'price': product_data.get('price', 920),
                    'url': product_data.get('url', search_url),
                    'availability': True,
                    'title': product_data.get('title', f"{product_info} (価格.com)"),
                    'shop': product_data.get('shop', "価格.com"),
                    'image_url': product_data.get('image_url', f"https://placehold.co/300x300/eee/999?text=Kakaku+{encoded_keyword}")
                }
            
            # スクレイピングが失敗した場合はダミーレスポンスを返す
            return self._get_dummy_response(product_info, search_url)
                
        except Exception as e:
            print(f"Error in Kakaku.com API call: {e}")
            return self._get_dummy_response(product_info)

    def _get_dummy_response(self, product_info, url=None):
        """
        ダミーレスポンスを生成
        """
        if url is None:
            # Use a search URL that will definitely work
            encoded_keyword = urllib.parse.quote(product_info)
            url = f"https://kakaku.com/search_results/{encoded_keyword}/"
            
        return {
            'price': 920,
            'url': url,
            'availability': True,
            'title': f"{product_info} (価格.com)",
            'shop': "価格.com",
            'image_url': f"https://placehold.co/300x300/eee/999?text=Kakaku+{encoded_keyword}"
        }
    
    def get_product_details(self, product_info):
        """
        価格.comから商品詳細情報を取得
        """
        try:
            from src.models.product import ProductDetail
            
            # 検索ページから複数の商品情報を取得
            encoded_keyword = urllib.parse.quote(product_info)
            search_url = f"https://kakaku.com/search_results/{encoded_keyword}/"
            
            # スクレイピングで複数の商品情報を取得
            product_list = self._scrape_multiple_kakaku_products(search_url)
            
            products = []
            if product_list and len(product_list) > 0:
                for i, item in enumerate(product_list[:3]):
                    product = ProductDetail(
                        source="Kakaku",
                        title=item.get('title', f"{product_info} (価格.com)"),
                        price=item.get('price', 920 + (i * 100)),
                        url=item.get('url', search_url),
                        image_url=item.get('image_url', f"https://placehold.co/300x300/eee/999?text=Kakaku+{i+1}"),
                        description=item.get('description', f"{product_info} (価格.com)"),
                        availability=True,
                        shop=item.get('shop', "価格.com"),
                        rating=item.get('rating', 0),
                        review_count=item.get('review_count', 0),
                        shipping_fee=None,
                        additional_info={}
                    )
                    products.append(product)
            
            # 商品が見つからない場合はダミー商品を返す
            if not products:
                placeholder_images = [
                    "https://placehold.co/300x300/eee/999?text=Kakaku+1",
                    "https://placehold.co/300x300/eee/999?text=Kakaku+2",
                    "https://placehold.co/300x300/eee/999?text=Kakaku+3"
                ]
                
                # ダミー商品を3つ生成
                for i in range(3):
                    price = 920 + (i * 100)
                    
                    product = ProductDetail(
                        source="Kakaku",
                        title=f"{product_info} {['Premium', 'Standard', 'Basic'][i]} (価格.com)",
                        price=price,
                        url=search_url,
                        image_url=placeholder_images[i],
                        description=f"{product_info} {['Premium', 'Standard', 'Basic'][i]} (価格.com)",
                        availability=True,
                        shop="価格.com",
                        rating=0,
                        review_count=0,
                        shipping_fee=None,
                        additional_info={}
                    )
                    products.append(product)
            
            return products
                
        except Exception as e:
            print(f"Error in Kakaku product details: {e}")
            return []
    
    def get_multiple_prices(self, product_info):
        """
        価格.comから複数の商品価格情報を取得
        """
        try:
            # 検索ページから複数の商品情報を取得
            encoded_keyword = urllib.parse.quote(product_info)
            search_url = f"https://kakaku.com/search_results/{encoded_keyword}/"
            
            # スクレイピングで複数の商品情報を取得
            product_list = self._scrape_multiple_kakaku_products(search_url)
            
            results = []
            if product_list and len(product_list) > 0:
                for i, item in enumerate(product_list[:3]):
                    results.append({
                        'source': 'Kakaku',
                        'price': item.get('price', 920 + (i * 50)),
                        'url': item.get('url', search_url),
                        'availability': True,
                        'title': item.get('title', f"{product_info} (価格.com)"),
                        'shop': item.get('shop', "価格.com"),
                        'image_url': item.get('image_url', f"https://placehold.co/300x300/eee/999?text=Kakaku+{i+1}")
                    })
            
            # 商品が見つからない場合はダミー結果を返す
            if not results:
                # 複数の商品を返す
                for i in range(3):  # 3つの商品を返す
                    price = 920 + (i * 50)  # 価格を少しずつ変える
                    
                    results.append({
                        'source': 'Kakaku',
                        'price': price,
                        'url': search_url,
                        'availability': True,
                        'title': f"{product_info} {['Premium', 'Standard', 'Basic'][i]} (価格.com)",
                        'shop': "価格.com",
                        'image_url': f"https://placehold.co/300x300/eee/999?text=Kakaku+{i+1}"
                    })
            
            return results
            
        except Exception as e:
            print(f"Error in Kakaku multiple prices: {e}")
            return []
    
    def _scrape_kakaku_product(self, url):
        """
        価格.comの検索ページから最初の商品情報をスクレイピング
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                print(f"Failed to fetch Kakaku.com page: {response.status_code}")
                return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 最初の商品を取得
            product_item = soup.select_one('.p-result_item')
            if not product_item:
                return None
            
            # 商品画像
            image_element = product_item.select_one('.p-result_item_image img')
            image_url = image_element.get('src') if image_element else None
            
            # 商品名
            title_element = product_item.select_one('.p-result_item_title a')
            title = title_element.text.strip() if title_element else None
            product_url = title_element.get('href') if title_element else None
            if product_url and not product_url.startswith('http'):
                product_url = f"https://kakaku.com{product_url}"
            
            # 価格
            price_element = product_item.select_one('.p-result_item_price')
            price_text = price_element.text.strip() if price_element else None
            price = self._extract_price(price_text) if price_text else 920
            
            # ショップ名
            shop_element = product_item.select_one('.p-result_item_shop')
            shop = shop_element.text.strip() if shop_element else "価格.com"
            
            return {
                'title': title,
                'url': product_url or url,
                'price': price,
                'shop': shop,
                'image_url': image_url
            }
            
        except Exception as e:
            print(f"Error scraping Kakaku.com: {e}")
            return None
    
    def _scrape_multiple_kakaku_products(self, url, limit=3):
        """
        価格.comの検索ページから複数の商品情報をスクレイピング
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                print(f"Failed to fetch Kakaku.com page: {response.status_code}")
                return []
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 商品リストを取得
            product_items = soup.select('.p-result_item')
            if not product_items:
                return []
            
            results = []
            for i, item in enumerate(product_items[:limit]):
                # 商品画像
                image_element = item.select_one('.p-result_item_image img')
                image_url = image_element.get('src') if image_element else None
                
                # 商品名
                title_element = item.select_one('.p-result_item_title a')
                title = title_element.text.strip() if title_element else None
                product_url = title_element.get('href') if title_element else None
                if product_url and not product_url.startswith('http'):
                    product_url = f"https://kakaku.com{product_url}"
                
                # 価格
                price_element = item.select_one('.p-result_item_price')
                price_text = price_element.text.strip() if price_element else None
                price = self._extract_price(price_text) if price_text else 920 + (i * 50)
                
                # ショップ名
                shop_element = item.select_one('.p-result_item_shop')
                shop = shop_element.text.strip() if shop_element else "価格.com"
                
                results.append({
                    'title': title,
                    'url': product_url or url,
                    'price': price,
                    'shop': shop,
                    'image_url': image_url
                })
            
            return results
            
        except Exception as e:
            print(f"Error scraping multiple Kakaku.com products: {e}")
            return []
    
    def _extract_price(self, price_text):
        """
        価格テキストから数値を抽出
        """
        try:
            if not price_text:
                return 920
            
            # 数字だけを抽出
            price_digits = re.sub(r'[^\d]', '', price_text)
            if price_digits:
                return int(price_digits)
            return 920  # デフォルト価格
        except Exception:
            return 920  # エラー時のデフォルト価格

kakaku_api = KakakuAPI() 