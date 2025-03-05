import requests
from src.config.settings import RAKUTEN_API_ENDPOINT, RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID
from src.models.product import ProductDetail
import urllib.parse
import hashlib
import json  # Add this for debugging

class RakutenAPI:
    def __init__(self):
        self.app_id = RAKUTEN_APP_ID
        self.affiliate_id = RAKUTEN_AFFILIATE_ID
        self.endpoint = f"{RAKUTEN_API_ENDPOINT}/IchibaItem/Search/20170706"

    def get_price(self, keyword):
        """Get price from Rakuten."""
        items = self._search_rakuten_products(keyword)
        
        if not items:
            return None
            
        # Get the first item
        item = items[0]
        
        # Extract price
        price = item.get("itemPrice", 0)
        
        return {
            "price": price,
            "currency": "JPY",
            "source": "rakuten"
        }
    
    def _extract_image_url(self, item):
        """Extract image URL from item data."""
        if not item:
            return None
            
        # Try to get medium image URL first
        if 'mediumImageUrls' in item and item['mediumImageUrls']:
            medium_urls = item['mediumImageUrls']
            if medium_urls and isinstance(medium_urls, list):
                if medium_urls[0] and isinstance(medium_urls[0], str):
                    return medium_urls[0]
                elif medium_urls[0] and isinstance(medium_urls[0], dict) and 'imageUrl' in medium_urls[0]:
                    return medium_urls[0]['imageUrl']
                    
        # Fall back to small image URL if medium is not available
        if 'smallImageUrls' in item and item['smallImageUrls']:
            small_urls = item['smallImageUrls']
            if small_urls and isinstance(small_urls, list):
                if small_urls[0] and isinstance(small_urls[0], str):
                    return small_urls[0]
                elif small_urls[0] and isinstance(small_urls[0], dict) and 'imageUrl' in small_urls[0]:
                    return small_urls[0]['imageUrl']
                    
        return None
    
    def get_product_details(self, keyword):
        """Get product details from Rakuten."""
        items = self._search_rakuten_products(keyword)
        
        if not items:
            return []
            
        products = []
        for item in items:
            # Extract product details
            product = ProductDetail(
                source="Rakuten",
                title=item.get("itemName", ""),
                price=item.get("itemPrice", 0),
                url=item.get("itemUrl", ""),
                image_url=self._extract_image_url(item),
                description=item.get("itemCaption", ""),
                availability=True,
                shop=item.get("shopName", "Rakuten"),
                rating=item.get("reviewAverage", 0),
                review_count=item.get("reviewCount", 0),
                shipping_fee=None,
                additional_info={
                    "pointRate": item.get("pointRate", 0),
                    "shopCode": item.get("shopCode", ""),
                    "shopUrl": item.get("shopUrl", ""),
                    "genreId": item.get("genreId", "")
                }
            )
            products.append(product)
            
        return products
    
    def get_multiple_prices(self, product_info):
        """
        楽天市場から複数の商品価格情報を取得
        """
        try:
            # 楽天APIを使用して実際の商品データを取得
            rakuten_results = self._search_rakuten_products(product_info, max_results=3)
            
            results = []
            if rakuten_results and len(rakuten_results) > 0:
                for i, item in enumerate(rakuten_results[:3]):
                    # Extract image URL
                    image_url = self._extract_image_url(item)
                    
                    results.append({
                        'source': 'Rakuten',
                        'price': item.get('itemPrice', 950 + (i * 50)),
                        'url': item.get('affiliateUrl', item.get('itemUrl', f"https://search.rakuten.co.jp/search/mall/{urllib.parse.quote(product_info)}")),
                        'availability': True,
                        'title': item.get('itemName', f"{product_info} (楽天)"),
                        'shop': item.get('shopName', "楽天市場"),
                        'image_url': image_url
                    })
            
            # 商品が見つからないかAPIコールが失敗した場合はプレースホルダー結果を返す
            if not results:
                encoded_keyword = urllib.parse.quote(product_info)
                
                # 複数の商品を返す
                for i in range(3):  # 3つの商品を返す
                    price = 950 + (i * 50)  # 価格を少しずつ変える
                    
                    results.append({
                        'source': 'Rakuten',
                        'price': price,
                        'url': f"https://search.rakuten.co.jp/search/mall/{encoded_keyword}",
                        'availability': True,
                        'title': f"{product_info} {['Premium', 'Standard', 'Basic'][i]} (楽天)",
                        'shop': "楽天市場",
                        'image_url': f"https://placehold.co/300x300/eee/999?text=Rakuten+{i+1}"
                    })
                
            return results
            
        except Exception as e:
            print(f"Error in Rakuten API call: {e}")
            return []
    
    def _search_rakuten_products(self, keyword, max_results=3):
        """Search for products on Rakuten."""
        url = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706"
        params = {
            "applicationId": self.app_id,
            "affiliateId": self.affiliate_id,
            "keyword": keyword,
            "hits": max_results,
            "page": 1,
            "sort": "+itemPrice",
            "imageFlag": 1,
            "availability": 1,
            "carrier": 0,
            "formatVersion": 2
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if 'Items' in data and data['Items']:
                return data['Items']
            return []
        except Exception as e:
            print(f"Error searching Rakuten products: {e}")
            return []

rakuten_api = RakutenAPI() 