from src.api.amazon_api import amazon_api
from src.api.rakuten_api import rakuten_api
from src.api.yahoo_api import yahoo_api
from src.api.kakaku_api import kakaku_api
from src.config.settings import PRICE_THRESHOLD
from concurrent.futures import ThreadPoolExecutor

class PriceComparisonEngine:
    def __init__(self):
        self.apis = {
            'Amazon': amazon_api,
            'Rakuten': rakuten_api,
            'Yahoo': yahoo_api,
            'Kakaku': kakaku_api
        }

    def compare_prices(self, product_info):
        """
        各サイトの価格を比較
        """
        results = []
        
        with ThreadPoolExecutor(max_workers=len(self.apis)) as executor:
            future_to_api = {
                executor.submit(self._get_multiple_prices, api_name, api, product_info): api_name
                for api_name, api in self.apis.items()
            }
            
            for future in future_to_api:
                api_name = future_to_api[future]
                try:
                    price_info_list = future.result()
                    if price_info_list:
                        results.extend(price_info_list)
                except Exception as e:
                    print(f"Error getting price from {api_name}: {e}")

        return self.sort_and_filter_results(results)
        
    def compare_prices_direct(self, product_info):
        """
        各サイトの価格を比較 (直接検索モード)
        """
        print(f"DEBUG: Direct search for '{product_info}'")
        results = []
        
        with ThreadPoolExecutor(max_workers=len(self.apis)) as executor:
            future_to_api = {
                executor.submit(self._get_multiple_prices_direct, api_name, api, product_info): api_name
                for api_name, api in self.apis.items()
            }
            
            for future in future_to_api:
                api_name = future_to_api[future]
                try:
                    price_info_list = future.result()
                    if price_info_list:
                        results.extend(price_info_list)
                except Exception as e:
                    print(f"Error getting price from {api_name} (direct search): {e}")

        return self.sort_and_filter_results(results)
        
    def compare_prices_with_model_numbers(self, model_numbers):
        """
        複数の型番を使用して各サイトの価格を比較
        """
        print(f"DEBUG: Searching with multiple model numbers: {model_numbers}")
        all_results = []
        
        for model_number in model_numbers:
            try:
                # Get results for this model number
                results = self.compare_prices_direct(model_number)
                if results:
                    # Add a field to indicate which model number was used
                    for result in results:
                        result['model_number_used'] = model_number
                    all_results.extend(results)
            except Exception as e:
                print(f"Error searching for model number '{model_number}': {e}")
        
        return self.sort_and_filter_results(all_results)
        
    def get_detailed_products(self, product_info):
        """
        各サイトから詳細な商品情報を取得
        """
        all_products = []
        
        # 各APIから詳細情報を取得
        for api_name, api in self.apis.items():
            try:
                if hasattr(api, 'get_product_details'):
                    products = api.get_product_details(product_info)
                    all_products.extend(products)
            except Exception as e:
                print(f"Error getting product details from {api_name}: {e}")
                
        # 価格で昇順ソート
        sorted_products = sorted(all_products, key=lambda x: x.price if x.price else float('inf'))
        
        return sorted_products

    def get_detailed_products_direct(self, product_info):
        """
        各サイトから詳細な商品情報を取得 (直接検索モード)
        """
        print(f"DEBUG: Direct search for detailed products: '{product_info}'")
        all_products = []
        
        # 各APIから詳細情報を取得
        for api_name, api in self.apis.items():
            try:
                if hasattr(api, 'get_product_details'):
                    # Use the exact keyword for search
                    products = api.get_product_details(product_info)
                    
                    # Filter products to only include those with the exact keyword in the title
                    filtered_products = []
                    for product in products:
                        if product_info.lower() in product.title.lower():
                            filtered_products.append(product)
                    
                    all_products.extend(filtered_products)
            except Exception as e:
                print(f"Error getting product details from {api_name} (direct search): {e}")
                
        # 価格で昇順ソート
        sorted_products = sorted(all_products, key=lambda x: x.price if x.price else float('inf'))
        
        return sorted_products

    def get_detailed_products_with_model_numbers(self, model_numbers):
        """
        複数の型番を使用して各サイトから詳細な商品情報を取得
        """
        print(f"DEBUG: Getting detailed products with multiple model numbers: {model_numbers}")
        all_products = []
        
        for model_number in model_numbers:
            try:
                # Get products for this model number
                products = self.get_detailed_products_direct(model_number)
                if products:
                    # Add a field to indicate which model number was used
                    for product in products:
                        product.additional_info['model_number_used'] = model_number
                    all_products.extend(products)
            except Exception as e:
                print(f"Error getting detailed products for model number '{model_number}': {e}")
        
        # 価格で昇順ソート
        sorted_products = sorted(all_products, key=lambda x: x.price if x.price else float('inf'))
        
        return sorted_products

    def _get_multiple_prices(self, api_name, api, product_info):
        """
        各APIから複数の価格情報を取得
        """
        try:
            if hasattr(api, 'get_multiple_prices'):
                return api.get_multiple_prices(product_info)
            else:
                # 単一の価格情報しか返さないAPIの場合
                price_info = api.get_price(product_info)
                if price_info:
                    price_info['source'] = api_name
                    return [price_info]
                return []
        except Exception as e:
            print(f"Error in {api_name} API call: {e}")
            return []

    def _get_multiple_prices_direct(self, api_name, api, product_info):
        """
        各APIから複数の価格情報を取得 (直接検索モード)
        """
        try:
            if hasattr(api, 'get_multiple_prices'):
                results = api.get_multiple_prices(product_info)
                
                # Filter results to only include those with the exact keyword in the title
                filtered_results = []
                for result in results:
                    if product_info.lower() in result.get('title', '').lower():
                        filtered_results.append(result)
                
                return filtered_results
            else:
                # 単一の価格情報しか返さないAPIの場合
                price_info = api.get_price(product_info)
                if price_info and product_info.lower() in price_info.get('title', '').lower():
                    price_info['source'] = api_name
                    return [price_info]
                return []
        except Exception as e:
            print(f"Error in {api_name} API call (direct search): {e}")
            return []

    def sort_and_filter_results(self, results):
        """
        結果を価格順にソートしてフィルタリング
        """
        if not results:
            return []
            
        # 価格で昇順ソート
        sorted_results = sorted(results, key=lambda x: x['price'])
        
        # 最安値との価格差が閾値以内の商品のみを抽出
        min_price = sorted_results[0]['price']
        filtered_results = [
            result for result in sorted_results
            if result['price'] <= min_price * (1 + PRICE_THRESHOLD)
        ]
        
        return filtered_results 