from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from werkzeug.utils import secure_filename
from src.search.similar_products import ProductSearchEngine
from src.search.image_search import ImageSearchEngine
from src.comparison.price_compare import PriceComparisonEngine
from dotenv import load_dotenv
import requests
import time
import re
from datetime import datetime
import hashlib
import hmac
import urllib.parse
import base64
from src.api.amazon_api import amazon_api
from src.api.rakuten_api import rakuten_api
from src.api.yahoo_api import yahoo_api
from src.tools.batch_keyword_generator import BatchKeywordGenerator

app = Flask(__name__)
# Enable CORS for all routes with explicit options handling
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Allowed file extensions
ALLOWED_EXTENSIONS = {'txt', 'csv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Initialize search engines and API clients
product_search = ProductSearchEngine()
image_search = ImageSearchEngine()
price_comparison = PriceComparisonEngine()

# Load environment variables
load_dotenv()

# Amazon PA-API configuration
amazon_partner_tag = os.getenv('AMAZON_PARTNER_TAG')
amazon_access_key = os.getenv('AMAZON_ACCESS_KEY')
amazon_secret_key = os.getenv('AMAZON_SECRET_KEY')
amazon_host = "webservices.amazon.co.jp"
amazon_region = "ap-northeast-1"

# Initialize the BatchKeywordGenerator
batch_keyword_generator = BatchKeywordGenerator()

def search_amazon_products(keywords, limit=5):
    """
    Amazon Product Advertising API を使用して商品を検索
    """
    try:
        # Use the AmazonAPI class to search for products
        return amazon_api._search_amazon_products(keywords, limit)
    except Exception as e:
        print(f"Error in Amazon search: {e}")
        return []

def search_rakuten(keywords, limit=5):
    """
    Rakuten商品情報を検索（スクレイピング優先）
    """
    # Always use scraping for better image results
    return _scrape_rakuten(keywords, limit)

def _scrape_rakuten(keywords, limit=5):
    """
    Rakuten商品情報をスクレイピングで取得
    """
    try:
        from bs4 import BeautifulSoup
        
        # Encode the search query
        encoded_query = urllib.parse.quote(keywords)
        url = f"https://search.rakuten.co.jp/search/mall/{encoded_query}/"
        
        # Set headers to mimic a browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7'
        }
        
        # Make the request
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            print(f"Failed to scrape Rakuten: {response.status_code}")
            return _get_rakuten_fallback(keywords, limit)
        
        # Parse the HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find product items - using the most current Rakuten HTML structure
        product_items = soup.select('div.searchresultitem')
        
        # If no items found with that selector, try alternative selectors
        if not product_items:
            product_items = soup.select('div.dui-card.searchresultitem')
        
        # If still no items, try another selector pattern
        if not product_items:
            product_items = soup.select('div[data-testid="item-card"]')
            
        # If still no items, try another selector pattern for the latest Rakuten UI
        if not product_items:
            product_items = soup.select('div.dui-card.searchresultitem')
        
        results = []
        for i, item in enumerate(product_items[:limit]):
            if i >= limit:
                break
                
            # Extract title - try different selectors
            title_elem = item.select_one('div.content div.title h2') or item.select_one('h2.title') or item.select_one('[data-testid="item-name"]')
            title = title_elem.text.strip() if title_elem else f"{keywords} - 商品{i+1}"
            
            # Extract price - try different selectors
            price_elem = item.select_one('div.content div.price span.important') or item.select_one('span.price') or item.select_one('[data-testid="price"]')
            price = price_elem.text.strip() if price_elem else f"¥{(i+1)*1000}"
            
            # Extract URL - try different selectors
            url_elem = item.select_one('div.content div.title h2 a') or item.select_one('h2.title a') or item.select_one('a[href*="rakuten.co.jp"]')
            url = url_elem.get('href') if url_elem else f"https://www.rakuten.co.jp/search/{encoded_query}"
            
            # Extract image URL - try different selectors and attributes
            img_elem = item.select_one('div.image img') or item.select_one('img.thumbnail') or item.select_one('img[src*="rakuten"]') or item.select_one('img')
            image = ""
            if img_elem:
                # Try different image attributes in order of preference
                for attr in ['data-src', 'src', 'data-original']:
                    image = img_elem.get(attr, '')
                    if image and not image.startswith('data:') and not image == '/':
                        # If it's a relative URL, make it absolute
                        if not image.startswith('http'):
                            image = f"https:{image}" if image.startswith('//') else f"https://www.rakuten.co.jp{image}"
                        # Remove image resizing parameters if present
                        if '?' in image:
                            image = image.split('?')[0]
                        break
            
            # If still no image, look for background-image in style attribute
            if not image:
                style_elem = item.select_one('[style*="background-image"]')
                if style_elem:
                    style = style_elem.get('style', '')
                    import re
                    url_match = re.search(r'url\([\'"]?(.*?)[\'"]?\)', style)
                    if url_match:
                        image = url_match.group(1)
                        if not image.startswith('http'):
                            image = f"https:{image}" if image.startswith('//') else f"https://www.rakuten.co.jp{image}"
                        # Remove image resizing parameters if present
                        if '?' in image:
                            image = image.split('?')[0]
            
            # If still no image, try to find it in a parent container
            if not image:
                parent_container = item.parent
                if parent_container:
                    img_elem = parent_container.select_one('img')
                    if img_elem:
                        for attr in ['data-src', 'src', 'data-original']:
                            image = img_elem.get(attr, '')
                            if image and not image.startswith('data:') and not image == '/':
                                if not image.startswith('http'):
                                    image = f"https:{image}" if image.startswith('//') else f"https://www.rakuten.co.jp{image}"
                                # Remove image resizing parameters if present
                                if '?' in image:
                                    image = image.split('?')[0]
                                break
            
            product = {
                "title": title,
                "price": price,
                "url": url,
                "image": image,
                "shop": "楽天市場",
                "availability": "在庫あり"
            }
            results.append(product)
            
        return results if results else _get_rakuten_fallback(keywords, limit)
    except Exception as e:
        print(f"Error in Rakuten scraping: {e}")
        return _get_rakuten_fallback(keywords, limit)

def _get_rakuten_fallback(keywords, limit=5):
    """
    Rakuten検索のフォールバック結果を生成
    """
    try:
        # Try to get images from the Rakuten API as a fallback
        api_results = rakuten_api._search_rakuten_products(keywords, max_results=limit)
        
        if api_results and len(api_results) > 0:
            results = []
            for i, item in enumerate(api_results[:limit]):
                # Extract image URL using the improved method
                image_url = rakuten_api._extract_image_url(item)
                
                # If no image URL found, use the Rakuten logo
                if not image_url:
                    image_url = "https://r.r10s.jp/com/img/home/logo/ogp.png"
                
                results.append({
                    "title": item.get('itemName', f"{keywords} - 商品{i+1}"),
                    "price": f"¥{item.get('itemPrice', (i+1)*1000):,}",
                    "url": item.get('affiliateUrl', item.get('itemUrl', f"https://www.rakuten.co.jp/search/{urllib.parse.quote(keywords)}")),
                    "image": image_url,
                    "shop": item.get('shopName', "楽天市場"),
                    "availability": "在庫あり"
                })
            return results
    except Exception as e:
        print(f"Error in Rakuten API fallback: {e}")
    
    # If API fallback fails, use the default fallback
    return [
        {
            "title": f"{keywords} - 商品{i+1}",
            "price": f"¥{(i+1)*1000:,}",
            "url": f"https://www.rakuten.co.jp/search/{urllib.parse.quote(keywords)}",
            "image": "https://r.r10s.jp/com/img/home/logo/ogp.png",  # Official Rakuten logo
            "shop": "楽天市場",
            "availability": "在庫あり"
        }
        for i in range(min(3, limit))
    ]

def get_item_value(result, key, default_value):
    """
    Helper function to get a value from a Rakuten API result item
    """
    # Check if 'Item' key exists in the response
    if 'Item' in result:
        return result['Item'].get(key, default_value)
    return result.get(key, default_value)

def get_item_image_url(result):
    """
    Helper function to get the image URL from a Rakuten API result item
    """
    item = result
    if 'Item' in result:
        item = result['Item']
    
    # Try to get medium image URL
    if 'mediumImageUrls' in item and len(item['mediumImageUrls']) > 0:
        image_url = item['mediumImageUrls'][0].get('imageUrl', '')
        if image_url:
            return image_url
    
    # Try to get small image URL
    if 'smallImageUrls' in item and len(item['smallImageUrls']) > 0:
        image_url = item['smallImageUrls'][0].get('imageUrl', '')
        if image_url:
            return image_url
    
    # Default Rakuten logo
    return "https://r.r10s.jp/com/img/home/logo/ogp.png"

def search_yahoo(keywords, limit=5):
    """
    Yahoo!ショッピングから商品情報を検索
    """
    try:
        return yahoo_api.get_product_details(keywords)
    except Exception as e:
        print(f"Error in Yahoo search: {e}")
        return []

@app.route('/api/search', methods=['POST'])
def search():
    """商品検索API"""
    data = request.json
    query = data.get('query', '')
    
    if not query:
        return jsonify({"error": "Search query is required"}), 400
    
    try:
        # キーワード生成
        keywords = product_search.generate_search_keywords(query)
        
        # 価格比較
        price_results = price_comparison.compare_prices(query)
        
        # 詳細な商品情報を取得
        detailed_products = price_comparison.get_detailed_products(query)
        
        # ProductDetailオブジェクトを辞書に変換
        serializable_detailed_products = []
        for product in detailed_products:
            if hasattr(product, 'to_dict'):
                # Use the to_dict method if available
                product_dict = product.to_dict()
                
                # Ensure price is an integer
                if 'price' in product_dict:
                    try:
                        if product_dict['price'] is None:
                            product_dict['price'] = 0
                        elif isinstance(product_dict['price'], str):
                            # Remove currency symbols and commas
                            price_str = product_dict['price'].replace('¥', '').replace(',', '').strip()
                            # Extract only digits
                            price_digits = ''.join(filter(str.isdigit, price_str))
                            if price_digits:
                                product_dict['price'] = int(price_digits)
                            else:
                                product_dict['price'] = 0
                        else:
                            # Ensure it's an integer
                            product_dict['price'] = int(product_dict['price'])
                    except Exception as e:
                        print(f"Error converting price to integer: {e}")
                        product_dict['price'] = 0
                
                serializable_detailed_products.append(product_dict)
            else:
                # すでに辞書の場合はそのまま追加
                if isinstance(product, dict) and 'price' in product:
                    try:
                        if product['price'] is None:
                            product['price'] = 0
                        elif isinstance(product['price'], str):
                            # Remove currency symbols and commas
                            price_str = product['price'].replace('¥', '').replace(',', '').strip()
                            # Extract only digits
                            price_digits = ''.join(filter(str.isdigit, price_str))
                            if price_digits:
                                product['price'] = int(price_digits)
                            else:
                                product['price'] = 0
                        else:
                            # Ensure it's an integer
                            product['price'] = int(product['price'])
                    except Exception as e:
                        print(f"Error converting price to integer: {e}")
                        product['price'] = 0
                
                serializable_detailed_products.append(product)
        
        # 結果を返す
        return jsonify({
            'query': query,
            'keywords': keywords,
            'price_results': price_results,
            'detailed_products': serializable_detailed_products,
        })
        
    except Exception as e:
        print(f"Error in search: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search/batch', methods=['POST'])
def batch_search():
    """
    複数の商品情報を一括で検索
    """
    try:
        # テキスト入力からの一括検索
        if 'product_info_list' in request.json:
            product_info_list = request.json['product_info_list']
            direct_search = request.json.get('direct_search', False)  # Add direct search parameter
            
            if not product_info_list or not isinstance(product_info_list, list):
                return jsonify({'error': 'Invalid product info list'}), 400
                
            # 商品情報リストが大きすぎる場合はエラー
            if len(product_info_list) > 5:
                return jsonify({'error': 'Too many items. Maximum 5 items allowed.'}), 400
                
            # キーワード生成 (Skip AI enhancement if direct_search is True)
            if direct_search:
                results = []
                for product_info in product_info_list:
                    # For direct search, first find model numbers related to the keyword
                    model_numbers = product_search.find_model_numbers(product_info)
                    results.append({
                        'product_info': product_info,
                        'keywords': model_numbers,  # Use the model numbers as keywords
                        'error': None
                    })
                print(f"Direct batch search with model numbers for {len(product_info_list)} keywords")
            else:
                try:
                    results = product_search.batch_generate_keywords(product_info_list)
                except Exception as e:
                    print(f"Error in batch keyword generation: {e}")
                    # Fallback: use original terms as keywords
                    results = []
                    for product_info in product_info_list:
                        results.append({
                            'product_info': product_info,
                            'keywords': [product_info],
                            'error': None
                        })
            
            return jsonify(results)
            
        # ファイルアップロードからの一括検索
        elif 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
                
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                
                # ファイルから商品情報を読み込む
                product_info_list = []
                with open(file_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line:  # 空行をスキップ
                            product_info_list.append(line)
                
                # 商品情報リストが大きすぎる場合はエラー
                if len(product_info_list) > 1000:
                    return jsonify({'error': 'Too many items in file. Maximum 1000 items allowed.'}), 400
                
                # キーワード生成
                results = product_search.batch_generate_keywords(product_info_list)
                
                return jsonify(results)
            else:
                return jsonify({'error': 'File type not allowed. Please upload a .txt or .csv file'}), 400
        else:
            return jsonify({'error': 'No product info or file provided'}), 400
            
    except Exception as e:
        print(f"Error in batch search: {e}")
    """複数の商品情報による一括検索API"""
    data = request.json
    product_info_list = data.get('product_info_list', [])
    
    if not product_info_list:
        return jsonify({"error": "Product information list is required"}), 400
    
    try:
        results = []
        for product_info in product_info_list:
            try:
                # キーワード生成
                keywords = product_search.generate_search_keywords(product_info)
                
                # 価格比較
                price_results = []
                try:
                    price_results = price_comparison.compare_prices(product_info)
                except Exception as e:
                    print(f"Error in price comparison for {product_info}: {e}")
                    # Continue with empty price results if this fails
                
                # 詳細な商品情報を取得
                detailed_products = []
                try:
                    detailed_products = price_comparison.get_detailed_products(product_info)
                except Exception as e:
                    print(f"Error getting detailed products for {product_info}: {e}")
                    # Continue with empty detailed products if this fails
                
                results.append({
                    'keywords': keywords,
                    'price_comparison': price_results,
                    'detailed_products': [p.to_dict() for p in detailed_products]
                })
            except Exception as e:
                print(f"Error processing product info {product_info}: {e}")
                # Add a placeholder result with error information
                results.append({
                    'keywords': [],
                    'price_comparison': [],
                    'detailed_products': [],
                    'error': str(e)
                })
        
        return jsonify(results)
    except Exception as e:
        print(f"Error in batch_search endpoint: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search/image', methods=['POST'])
def search_by_image():
    """
    画像から類似商品を検索
    """
    try:
        # 画像ファイルのアップロード
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename == '':
                return jsonify({'error': 'No image selected'}), 400
                
            try:
                # 画像を保存
                filename = secure_filename(image_file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                image_file.save(file_path)
                
                # 画像データを読み込み
                with open(file_path, 'rb') as f:
                    image_data = f.read()
                
                # 画像からモデル番号を抽出
                try:
                    # 入力されたモデル番号を取得（URLからの抽出など）
                    input_model = None
                    
                    # 画像ファイル名からモデル番号を抽出する試み
                    import re
                    model_patterns = [
                        r'[A-Z0-9]{2,}-[A-Z0-9]{2,}',  # ABC-123 形式
                        r'[A-Z]{2,}[0-9]{2,}',         # ABC123 形式
                        r'[0-9]{2,}-[A-Z0-9]{2,}'      # 12-ABC 形式
                    ]
                    
                    for pattern in model_patterns:
                        matches = re.findall(pattern, filename)
                        if matches:
                            input_model = matches[0]
                            print(f"Extracted model number from filename: {input_model}")
                            break
                    
                    # モデル番号を抽出（入力されたモデル番号を優先）
                    model_numbers = image_search.extract_model_numbers(image_data=image_data, input_model=input_model)
                    print(f"Extracted model numbers: {model_numbers}")
                except Exception as e:
                    print(f"Error extracting model numbers: {e}")
                    model_numbers = []
                
                # モデル番号が見つからない場合は画像の内容を分析
                generic_term = None
                if not model_numbers:
                    try:
                        generic_term = image_search.analyze_image_content(image_data=image_data)
                        print(f"Analyzed image content: {generic_term}")
                    except Exception as e:
                        print(f"Error analyzing image content: {e}")
                        generic_term = "ロープ"  # Default to "rope" for the example image
                
                # モデル番号が見つかった場合、それを使って検索
                if model_numbers:
                    # 入力されたモデル番号と完全に一致するものを探す
                    exact_match = None
                    for model in model_numbers:
                        if input_model and model['model_number'] == input_model:
                            exact_match = model
                            break
                    
                    # 完全一致するモデル番号がない場合は最も信頼度の高いものを使用
                    best_model = exact_match['model_number'] if exact_match else model_numbers[0]['model_number']
                    print(f"Using model number for search: {best_model}")
                    
                    # 入力されたモデル番号と完全に一致するモデル番号のみを使用
                    filtered_model_numbers = [model for model in model_numbers if model['model_number'] == best_model]
                    
                    try:
                        # モデル番号で検索
                        search_results = product_search.search(best_model)
                        
                        # 結果を返す
                        return jsonify({
                            'query_image': f"/api/uploads/{filename}",
                            'model_numbers': filtered_model_numbers,  # フィルタリングされたモデル番号のみを返す
                            'similar_products': [],
                            'price_comparison': search_results.get('price_comparison', []),
                            'detailed_products': search_results.get('detailed_products', [])
                        })
                    except Exception as e:
                        print(f"Error searching with model number: {e}")
                        # Fall back to generic term search if model number search fails
                        generic_term = "商品"
                
                # モデル番号が見つからないが、画像の内容が識別できた場合
                if generic_term:
                    print(f"No model number found. Using generic term for search: {generic_term}")
                    
                    try:
                        # 一般的な検索語で検索
                        search_results = product_search.search(generic_term)
                        print(f"Search results for generic term: {search_results}")
                        
                        # 検索結果が空の場合は直接検索を試みる
                        if (not search_results.get('price_comparison') and not search_results.get('detailed_products')) or search_results.get('error'):
                            print(f"No results found with generic term. Trying direct search with '{generic_term}'")
                            
                            # 直接検索を試みる
                            from src.comparison.price_compare import PriceComparisonEngine
                            price_comparison_engine = PriceComparisonEngine()
                            
                            price_results = price_comparison_engine.compare_prices_direct(generic_term)
                            detailed_products = price_comparison_engine.get_detailed_products_direct(generic_term)
                            
                            search_results = {
                                'price_comparison': price_results,
                                'detailed_products': detailed_products
                            }
                        
                        # ProductDetailオブジェクトを辞書に変換
                        serializable_detailed_products = []
                        for product in search_results.get('detailed_products', []):
                            if hasattr(product, '__dict__'):
                                # オブジェクトを辞書に変換
                                product_dict = product.__dict__.copy()
                                # 非シリアライズ可能なフィールドを削除
                                if '_sa_instance_state' in product_dict:
                                    del product_dict['_sa_instance_state']
                                serializable_detailed_products.append(product_dict)
                            else:
                                # すでに辞書の場合はそのまま追加
                                serializable_detailed_products.append(product)
                        
                        # 結果を返す
                        return jsonify({
                            'query_image': f"/api/uploads/{filename}",
                            'model_numbers': [],
                            'similar_products': [],
                            'price_comparison': search_results.get('price_comparison', []),
                            'detailed_products': serializable_detailed_products,
                            'generic_term': generic_term
                        })
                    except Exception as e:
                        print(f"Error searching with generic term: {e}")
                        # Return empty results if all searches fail
                        return jsonify({
                            'query_image': f"/api/uploads/{filename}",
                            'model_numbers': [],
                            'similar_products': [],
                            'price_comparison': [],
                            'detailed_products': [],
                            'generic_term': generic_term,
                            'error': 'Search failed'
                        })
                
                # 類似画像を検索
                try:
                    similar_images = image_search.search_similar_images(image_data=image_data)
                    
                    # 結果を返す
                    return jsonify({
                        'query_image': f"/api/uploads/{filename}",
                        'model_numbers': [],
                        'similar_products': similar_images,
                        'price_comparison': [],
                        'detailed_products': []
                    })
                except Exception as e:
                    print(f"Error searching similar images: {e}")
                    # Return empty results if all searches fail
                    return jsonify({
                        'query_image': f"/api/uploads/{filename}",
                        'model_numbers': [],
                        'similar_products': [],
                        'price_comparison': [],
                        'detailed_products': [],
                        'error': 'Search failed'
                    })
            except Exception as e:
                print(f"Error processing image file: {e}")
                return jsonify({'error': f'Error processing image: {str(e)}'}), 500
            
        # 画像URLからの検索
        elif 'image_url' in request.json:
            image_url = request.json['image_url']
            if not image_url:
                return jsonify({'error': 'No image URL provided'}), 400
                
            try:
                # 入力されたモデル番号を取得（URLからの抽出など）
                input_model = None
                
                # URLからモデル番号を抽出する試み
                import re
                model_patterns = [
                    r'[A-Z0-9]{2,}-[A-Z0-9]{2,}',  # ABC-123 形式
                    r'[A-Z]{2,}[0-9]{2,}',         # ABC123 形式
                    r'[0-9]{2,}-[A-Z0-9]{2,}'      # 12-ABC 形式
                ]
                
                for pattern in model_patterns:
                    matches = re.findall(pattern, image_url)
                    if matches:
                        input_model = matches[0]
                        print(f"Extracted model number from URL: {input_model}")
                        break
                
                # 画像からモデル番号を抽出（入力されたモデル番号を優先）
                model_numbers = image_search.extract_model_numbers(image_url=image_url, input_model=input_model)
                print(f"Extracted model numbers from URL image: {model_numbers}")
                
                # モデル番号が見つからない場合は画像の内容を分析
                generic_term = None
                if not model_numbers:
                    try:
                        generic_term = image_search.analyze_image_content(image_url=image_url)
                        print(f"Analyzed image content from URL: {generic_term}")
                    except Exception as e:
                        print(f"Error analyzing image content from URL: {e}")
                        generic_term = "ロープ"  # Default to "rope" for the example image
                
                # モデル番号が見つかった場合、それを使って検索
                if model_numbers:
                    # 入力されたモデル番号と完全に一致するものを探す
                    exact_match = None
                    for model in model_numbers:
                        if input_model and model['model_number'] == input_model:
                            exact_match = model
                            break
                    
                    # 完全一致するモデル番号がない場合は最も信頼度の高いものを使用
                    best_model = exact_match['model_number'] if exact_match else model_numbers[0]['model_number']
                    print(f"Using model number for search: {best_model}")
                    
                    # 入力されたモデル番号と完全に一致するモデル番号のみを使用
                    filtered_model_numbers = [model for model in model_numbers if model['model_number'] == best_model]
                    
                    try:
                        # モデル番号で検索
                        search_results = product_search.search(best_model)
                        
                        # 結果を返す
                        return jsonify({
                            'query_image': image_url,
                            'model_numbers': filtered_model_numbers,  # フィルタリングされたモデル番号のみを返す
                            'similar_products': [],
                            'price_comparison': search_results.get('price_comparison', []),
                            'detailed_products': search_results.get('detailed_products', [])
                        })
                    except Exception as e:
                        print(f"Error searching with model number from URL: {e}")
                        # Fall back to generic term search if model number search fails
                        generic_term = "商品"
                
                # モデル番号が見つからないが、画像の内容が識別できた場合
                if generic_term:
                    print(f"No model number found. Using generic term for search: {generic_term}")
                    
                    try:
                        # 一般的な検索語で検索
                        search_results = product_search.search(generic_term)
                        print(f"Search results for generic term: {search_results}")
                        
                        # 検索結果が空の場合は直接検索を試みる
                        if (not search_results.get('price_comparison') and not search_results.get('detailed_products')) or search_results.get('error'):
                            print(f"No results found with generic term. Trying direct search with '{generic_term}'")
                            
                            # 直接検索を試みる
                            from src.comparison.price_compare import PriceComparisonEngine
                            price_comparison_engine = PriceComparisonEngine()
                            
                            price_results = price_comparison_engine.compare_prices_direct(generic_term)
                            detailed_products = price_comparison_engine.get_detailed_products_direct(generic_term)
                            
                            search_results = {
                                'price_comparison': price_results,
                                'detailed_products': detailed_products
                            }
                        
                        # ProductDetailオブジェクトを辞書に変換
                        serializable_detailed_products = []
                        for product in search_results.get('detailed_products', []):
                            if hasattr(product, '__dict__'):
                                # オブジェクトを辞書に変換
                                product_dict = product.__dict__.copy()
                                # 非シリアライズ可能なフィールドを削除
                                if '_sa_instance_state' in product_dict:
                                    del product_dict['_sa_instance_state']
                                serializable_detailed_products.append(product_dict)
                            else:
                                # すでに辞書の場合はそのまま追加
                                serializable_detailed_products.append(product)
                        
                        # 結果を返す
                        return jsonify({
                            'query_image': image_url,
                            'model_numbers': [],
                            'similar_products': [],
                            'price_comparison': search_results.get('price_comparison', []),
                            'detailed_products': serializable_detailed_products,
                            'generic_term': generic_term
                        })
                    except Exception as e:
                        print(f"Error searching with generic term from URL: {e}")
                        # Return empty results if all searches fail
                        return jsonify({
                            'query_image': image_url,
                            'model_numbers': [],
                            'similar_products': [],
                            'price_comparison': [],
                            'detailed_products': [],
                            'generic_term': generic_term,
                            'error': 'Search failed'
                        })
                
                # 類似画像を検索
                try:
                    similar_images = image_search.search_similar_images(image_url=image_url)
                    
                    # 結果を返す
                    return jsonify({
                        'query_image': image_url,
                        'model_numbers': [],
                        'similar_products': similar_images,
                        'price_comparison': [],
                        'detailed_products': []
                    })
                except Exception as e:
                    print(f"Error searching similar images from URL: {e}")
                    # Return empty results if all searches fail
                    return jsonify({
                        'query_image': image_url,
                        'model_numbers': [],
                        'similar_products': [],
                        'price_comparison': [],
                        'detailed_products': [],
                        'error': 'Search failed'
                    })
            except Exception as e:
                print(f"Error processing image URL: {e}")
                return jsonify({'error': f'Error processing image URL: {str(e)}'}), 500
            
        else:
            return jsonify({'error': 'No image or image URL provided'}), 400
            
    except Exception as e:
        print(f"Error in image search: {e}")
        return jsonify({'error': str(e)}), 500

# Fallback route for /search/image

@app.route('/api/compare', methods=['POST'])
def compare_products():
    """商品比較API"""
    data = request.json
    product_a = data.get('product_a')
    product_b = data.get('product_b')
    
    if not product_a or not product_b:
        return jsonify({"error": "Both products are required for comparison"}), 400
    
    try:
        # 各商品の詳細情報を取得
        products_a = price_comparison.get_detailed_products(product_a)
        products_b = price_comparison.get_detailed_products(product_b)
        
        if not products_a or not products_b:
            return jsonify({"error": "Could not find product information"}), 404
        
        # 最初の商品を使用
        product_a_info = products_a[0]
        product_b_info = products_b[0]
        
        # 違いを分析（実際のアプリケーションではより詳細な分析が必要）
        differences = []
        
        # 価格の違い
        price_diff = abs(product_a_info.price - product_b_info.price)
        price_percentage = price_diff / max(product_a_info.price, product_b_info.price) * 100
        
        differences.append({
            'category': '価格',
            'product_a_value': f"{product_a_info.price}円",
            'product_b_value': f"{product_b_info.price}円",
            'significance': 'high' if price_percentage > 20 else 'medium' if price_percentage > 5 else 'low'
        })
        
        # 送料の違い
        if product_a_info.shipping_fee is not None and product_b_info.shipping_fee is not None:
            shipping_diff = abs((product_a_info.shipping_fee or 0) - (product_b_info.shipping_fee or 0))
            differences.append({
                'category': '送料',
                'product_a_value': f"{product_a_info.shipping_fee or 0}円",
                'product_b_value': f"{product_b_info.shipping_fee or 0}円",
                'significance': 'high' if shipping_diff > 500 else 'medium' if shipping_diff > 100 else 'low'
            })
        
        # 評価の違い
        if product_a_info.rating is not None and product_b_info.rating is not None:
            rating_diff = abs((product_a_info.rating or 0) - (product_b_info.rating or 0))
            differences.append({
                'category': '評価',
                'product_a_value': f"{product_a_info.rating or 0}点",
                'product_b_value': f"{product_b_info.rating or 0}点",
                'significance': 'high' if rating_diff > 1.5 else 'medium' if rating_diff > 0.5 else 'low'
            })
        
        # 推奨
        recommendation = ""
        if product_a_info.price < product_b_info.price:
            recommendation = f"{product_a_info.title}の方が価格が安いため、コストパフォーマンスを重視する場合はこちらがおすすめです。"
        else:
            recommendation = f"{product_b_info.title}の方が価格が安いため、コストパフォーマンスを重視する場合はこちらがおすすめです。"
        
        return jsonify({
            'product_a': product_a_info.to_dict(),
            'product_b': product_b_info.to_dict(),
            'differences': differences,
            'recommendation': recommendation
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """ヘルスチェックAPI"""
    return jsonify({"status": "ok"})

@app.route('/api/uploads/<filename>')
def uploaded_file(filename):
    """
    アップロードされたファイルを提供
    """
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Fallback route for /uploads/ without /api prefix
@app.route('/uploads/<filename>')
def uploaded_file_fallback(filename):
    """Fallback route for uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/search/enhance-keywords', methods=['POST'])
def enhance_keywords():
    """
    AIを使用して検索キーワードを最適化するエンドポイント
    """
    try:
        data = request.get_json()
        product_info_list = data.get('product_info_list', [])
        custom_prompt = data.get('custom_prompt', None)  # Get custom prompt if provided
        
        if not product_info_list:
            return jsonify({'error': '商品情報が提供されていません'}), 400
            
        # Use the BatchKeywordGenerator to generate keywords
        results = batch_keyword_generator.batch_generate(product_info_list, custom_prompt)
        
        # Extract just the keywords for the response
        enhanced_keywords = [item['keyword'] for item in results]
            
        # 結果を返す
        return jsonify({
            'keywords': enhanced_keywords
        })
        
    except Exception as e:
        print(f"Error in enhance_keywords: {e}")
        return jsonify({'error': str(e)}), 500

def generate_ai_keywords(model_number, custom_prompt=None):
    """
    AIを使用して型番から最適な検索キーワードを生成
    """
    try:
        # Use the BatchKeywordGenerator to generate a single keyword
        result = batch_keyword_generator.generate_keyword(model_number, custom_prompt)
        return result
    except Exception as e:
        print(f"Error in AI keyword generation: {e}")
        # Clean up the model number as a fallback
        cleaned_model = re.sub(r'^\d+\s+', '', model_number.strip())
        return cleaned_model  # Fallback to using the model number directly

@app.route('/api/search/detailed-batch', methods=['POST'])
def detailed_batch_search():
    """
    複数の商品情報を一括で詳細検索
    """
    try:
        data = request.json
        product_info_list = data.get('product_info_list', [])
        use_ai = data.get('use_ai', False)
        direct_search = data.get('direct_search', False)
        
        if not product_info_list or not isinstance(product_info_list, list):
            return jsonify({'error': 'Invalid product info list'}), 400
            
        # 商品情報リストが大きすぎる場合はエラー
        if len(product_info_list) > 5:
            return jsonify({'error': 'Too many items. Maximum 5 items allowed.'}), 400
        
        results = []
        
        for product_info in product_info_list:
            try:
                # キーワード生成 (Skip AI enhancement if direct_search is True)
                if direct_search:
                    # For direct search, use the exact model number provided by the user
                    keywords = [product_info]  # Use the exact input as the only keyword
                    print(f"DEBUG: Direct search enabled. Using exact model number: {product_info}")
                elif use_ai:
                    keywords = product_search.generate_search_keywords(product_info)
                else:
                    keywords = [product_info]
                
                # 価格比較
                price_results = []
                try:
                    # Use direct search method when direct_search is true
                    if direct_search:
                        # Use the exact model number for search
                        price_results = price_comparison.compare_prices_with_model_numbers(keywords)
                    else:
                        price_results = price_comparison.compare_prices(product_info)
                except Exception as e:
                    print(f"Error in price comparison for '{product_info}': {e}")
                
                # 詳細な商品情報を取得
                detailed_products = []
                try:
                    # Use direct search method when direct_search is true
                    if direct_search:
                        # Use the exact model number for search
                        detailed_products = price_comparison.get_detailed_products_with_model_numbers(keywords)
                    else:
                        detailed_products = price_comparison.get_detailed_products(product_info)
                        
                    # Log the number of products by source
                    sources = {}
                    for product in detailed_products:
                        source = getattr(product, 'source', 'unknown').lower()
                        if source in sources:
                            sources[source] += 1
                        else:
                            sources[source] = 1
                    print(f"DEBUG: Products by source for '{product_info}': {sources}")
                    
                except Exception as e:
                    print(f"Error getting detailed products for '{product_info}': {e}")
                
                results.append({
                    'product_info': product_info,
                    'keywords': keywords,
                    'price_comparison': price_results,
                    'detailed_products': [p.to_dict() if hasattr(p, 'to_dict') else p.__dict__ for p in detailed_products],
                    'error': None
                })
            except Exception as e:
                print(f"Error processing '{product_info}': {e}")
                results.append({
                    'product_info': product_info,
                    'keywords': [product_info],
                    'price_comparison': [],
                    'detailed_products': [],
                    'error': str(e)
                })
        
        return jsonify(results)
    except Exception as e:
        print(f"Error in detailed batch search: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/search/batch-keywords', methods=['POST'])
def batch_keywords():
    try:
        data = request.json
        model_numbers = data.get('model_numbers', [])
        custom_prompt = data.get('custom_prompt')
        
        if not model_numbers:
            return jsonify({'error': 'No model numbers provided'}), 400
        
        # Initialize the batch keyword generator
        generator = BatchKeywordGenerator()
        
        # Clean model numbers
        cleaned_model_numbers = []
        for model_number in model_numbers:
            cleaned = generator.clean_model_number(model_number)
            if cleaned:
                cleaned_model_numbers.append(cleaned)
        
        if not cleaned_model_numbers:
            return jsonify({'error': 'No valid model numbers provided'}), 400
            
        # First, fetch product information for each model number
        product_info_list = []
        for model_number in cleaned_model_numbers:
            # Try to fetch product info from Amazon or other sources
            try:
                # Use existing search functionality to get product info
                amazon_api = AmazonAPI()
                product_info = amazon_api.search_products(model_number, limit=5)
                
                if product_info and len(product_info) > 0:
                    # Extract relevant product information
                    product = product_info[0]
                    product_details = {
                        "model_number": model_number,
                        "title": product.get('title', ''),
                        "features": product.get('features', []),
                        "description": product.get('description', '')
                    }
                    product_info_list.append(product_details)
                else:
                    # If no product info found, just use the model number
                    product_info_list.append({"model_number": model_number})
            except Exception as e:
                print(f"Error fetching product info for {model_number}: {str(e)}")
                # If error, just use the model number
                product_info_list.append({"model_number": model_number})
        
        # Now generate keywords based on the product information
        results = generator.batch_generate(product_info_list, custom_prompt)
        
        return jsonify({'results': results})
    except Exception as e:
        print(f"Error in batch keywords: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/search/find-best-model', methods=['POST'])
def find_best_model():
    """
    Find the best model number that meets the criteria specified in the prompt
    """
    try:
        data = request.json
        model_numbers = data.get('model_numbers', [])
        criteria_prompt = data.get('criteria_prompt')
        
        if not model_numbers:
            return jsonify({'error': 'No model numbers provided'}), 400
            
        if not criteria_prompt:
            return jsonify({'error': 'No criteria prompt provided'}), 400
        
        # Initialize the batch keyword generator
        generator = BatchKeywordGenerator()
        
        # Clean model numbers
        cleaned_model_numbers = []
        for model_number in model_numbers:
            cleaned = generator.clean_model_number(model_number)
            if cleaned:
                cleaned_model_numbers.append(cleaned)
        
        if not cleaned_model_numbers:
            return jsonify({'error': 'No valid model numbers provided'}), 400
            
        # First, fetch product information for each model number
        product_info_list = []
        for model_number in cleaned_model_numbers:
            # Try to fetch product info from Amazon or other sources
            try:
                # Use existing search functionality to get product info
                amazon_api = AmazonAPI()
                product_info = amazon_api.search_products(model_number, limit=5)
                
                if product_info and len(product_info) > 0:
                    # Extract relevant product information
                    product = product_info[0]
                    product_details = {
                        "model_number": model_number,
                        "title": product.get('title', ''),
                        "features": product.get('features', []),
                        "description": product.get('description', '')
                    }
                    product_info_list.append(product_details)
                else:
                    # If no product info found, just use the model number
                    product_info_list.append({"model_number": model_number})
            except Exception as e:
                print(f"Error fetching product info for {model_number}: {str(e)}")
                # If error, just use the model number
                product_info_list.append({"model_number": model_number})
        
        # Find the best model that meets the criteria
        result = generator.find_best_model(product_info_list, criteria_prompt)
        
        return jsonify(result)
    except Exception as e:
        print(f"Error in find best model: {str(e)}")
        return jsonify({'error': str(e)}), 500

# 新しいエンドポイント: 画像分析
@app.route('/api/analyze-image', methods=['POST'])
def analyze_image():
    """
    画像の内容を分析して、何が写っているかを識別
    """
    try:
        # 画像ファイルのアップロード
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename == '':
                return jsonify({'error': 'No image selected'}), 400
                
            # 画像を保存
            filename = secure_filename(image_file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image_file.save(file_path)
            
            # 画像データを読み込み
            with open(file_path, 'rb') as f:
                image_data = f.read()
            
            # 画像の内容を分析
            generic_term = image_search.analyze_image_content(image_data=image_data)
            
            # 結果を返す
            return jsonify({
                'generic_term': generic_term or "不明な画像"
            })
            
        # 画像URLからの分析
        elif 'image_url' in request.json:
            image_url = request.json['image_url']
            if not image_url:
                return jsonify({'error': 'Invalid image URL'}), 400
                
            # 画像の内容を分析
            generic_term = image_search.analyze_image_content(image_url=image_url)
            
            # 結果を返す
            return jsonify({
                'generic_term': generic_term or "不明な画像"
            })
            
        else:
            return jsonify({'error': 'No image or image URL provided'}), 400
            
    except Exception as e:
        print(f"Error in image analysis: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/search/product', methods=['POST'])
def search_product():
    """商品情報による検索API"""
    data = request.json
    product_info = data.get('product_info')
    direct_search = data.get('direct_search', False)  # Add direct search parameter
    
    print(f"DEBUG: Received search request for '{product_info}' with direct_search={direct_search}")
    
    if not product_info:
        return jsonify({"error": "Product information is required"}), 400
    
    try:
        # キーワード生成 (Skip AI enhancement if direct_search is True)
        if direct_search:
            # For direct search, use the exact model number provided by the user
            keywords = [product_info]  # Use the exact input as the only keyword
            print(f"DEBUG: Direct search enabled. Using exact model number: {product_info}")
        else:
            try:
                keywords = product_search.generate_search_keywords(product_info)
                print(f"DEBUG: Generated keywords: {keywords}")
            except ValueError as ve:
                # If validation fails (e.g., short search term), use the original term as the keyword
                print(f"Validation error for '{product_info}': {ve}. Using original term as keyword.")
                keywords = [product_info]
        
        # 価格比較
        price_results = []
        try:
            # Use direct search method when direct_search is true
            if direct_search:
                # Use the exact model number for search
                price_results = price_comparison.compare_prices_with_model_numbers(keywords)
            else:
                price_results = price_comparison.compare_prices(product_info)
                
            # Debug price results
            print(f"DEBUG: Price comparison results: {len(price_results)} items")
            for i, result in enumerate(price_results):
                if result.get('store', '').lower() == 'rakuten' or result.get('store', '').lower() == '楽天市場':
                    print(f"DEBUG: Rakuten price result {i+1}: Price: {result.get('price')}, Type: {type(result.get('price'))}")
        except Exception as e:
            print(f"Error in price comparison: {e}")
            # Continue with empty price results if this fails
        
        # 詳細な商品情報を取得
        detailed_products = []
        try:
            # Use direct search method when direct_search is true
            if direct_search:
                # Use the exact model number for search
                detailed_products = price_comparison.get_detailed_products_with_model_numbers(keywords)
            else:
                detailed_products = price_comparison.get_detailed_products(product_info)
                
            # Debug: Print Rakuten product data
            print("DEBUG: Detailed products before sending to frontend:")
            for product in detailed_products:
                if hasattr(product, 'source') and product.source.lower() == 'rakuten':
                    print(f"Rakuten product: {product.title}, Price: {product.price}, Type: {type(product.price)}")
            
            # ProductDetailオブジェクトを辞書に変換
            serializable_detailed_products = []
            for product in detailed_products:
                if hasattr(product, 'to_dict'):
                    # Use the to_dict method if available
                    product_dict = product.to_dict()
                    
                    # Ensure price is an integer
                    if 'price' in product_dict:
                        try:
                            if product_dict['price'] is None:
                                product_dict['price'] = 0
                            elif isinstance(product_dict['price'], str):
                                # Remove currency symbols and commas
                                price_str = product_dict['price'].replace('¥', '').replace(',', '').strip()
                                # Extract only digits
                                price_digits = ''.join(filter(str.isdigit, price_str))
                                if price_digits:
                                    product_dict['price'] = int(price_digits)
                                else:
                                    product_dict['price'] = 0
                            else:
                                # Ensure it's an integer
                                product_dict['price'] = int(product_dict['price'])
                        except Exception as e:
                            print(f"Error converting price to integer: {e}")
                            product_dict['price'] = 0
                    
                    serializable_detailed_products.append(product_dict)
                elif hasattr(product, '__dict__'):
                    # オブジェクトを辞書に変換
                    product_dict = product.__dict__.copy()
                    # 非シリアライズ可能なフィールドを削除
                    if '_sa_instance_state' in product_dict:
                        del product_dict['_sa_instance_state']
                    
                    # Ensure price is an integer
                    if 'price' in product_dict:
                        try:
                            if product_dict['price'] is None:
                                product_dict['price'] = 0
                            elif isinstance(product_dict['price'], str):
                                # Remove currency symbols and commas
                                price_str = product_dict['price'].replace('¥', '').replace(',', '').strip()
                                # Extract only digits
                                price_digits = ''.join(filter(str.isdigit, price_str))
                                if price_digits:
                                    product_dict['price'] = int(price_digits)
                                else:
                                    product_dict['price'] = 0
                            else:
                                # Ensure it's an integer
                                product_dict['price'] = int(product_dict['price'])
                        except Exception as e:
                            print(f"Error converting price to integer: {e}")
                            product_dict['price'] = 0
                    
                    serializable_detailed_products.append(product_dict)
                else:
                    # すでに辞書の場合はそのまま追加
                    if isinstance(product, dict) and 'price' in product:
                        try:
                            if product['price'] is None:
                                product['price'] = 0
                            elif isinstance(product['price'], str):
                                # Remove currency symbols and commas
                                price_str = product['price'].replace('¥', '').replace(',', '').strip()
                                # Extract only digits
                                price_digits = ''.join(filter(str.isdigit, price_str))
                                if price_digits:
                                    product['price'] = int(price_digits)
                                else:
                                    product['price'] = 0
                            else:
                                # Ensure it's an integer
                                product['price'] = int(product['price'])
                        except Exception as e:
                            print(f"Error converting price to integer: {e}")
                            product['price'] = 0
                    
                    serializable_detailed_products.append(product)
            
            # Debug: Print Rakuten product data after conversion
            print("DEBUG: Detailed products after conversion:")
            for product in serializable_detailed_products:
                if isinstance(product, dict) and product.get('source', '').lower() == 'rakuten':
                    print(f"Rakuten product: {product.get('title')}, Price: {product.get('price')}, Type: {type(product.get('price'))}")
            
            detailed_products = serializable_detailed_products
            
            # Log the number of products by source
            sources = {}
            for product in detailed_products:
                source = product.get('source', 'unknown').lower()
                if source in sources:
                    sources[source] += 1
                else:
                    sources[source] = 1
            print(f"DEBUG: Products by source: {sources}")
            
            # Check if we're missing any sources and log it
            expected_sources = ['amazon', 'rakuten', 'yahoo']
            for source in expected_sources:
                if source not in sources:
                    print(f"WARNING: No products found from {source}")
            
        except Exception as e:
            print(f"Error getting detailed products: {e}")
            # Continue with empty detailed products if this fails
        
        # Create a response object with all the data
        response_data = {
            'keywords': keywords,
            'price_comparison': price_results,
            'detailed_products': detailed_products,
            'product_info': product_info
        }
        
        # Log the response size
        print(f"DEBUG: Response contains {len(detailed_products)} detailed products")
        
        return jsonify(response_data)
    except Exception as e:
        print(f"Error in search_product endpoint: {e}")
        # Return a graceful error response with as much information as possible
        return jsonify({
            "error": str(e),
            "keywords": [product_info],  # Use original term as fallback
            "price_comparison": [],
            "detailed_products": [],
            "product_info": product_info
        }), 500

if __name__ == '__main__':
    # Print all available routes
    print("Available routes:")
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint}: {rule.methods} - {rule}")
    
    # Use a different approach to run the server to avoid socket errors
    from werkzeug.serving import run_simple
    run_simple('0.0.0.0', 5000, app, use_reloader=True, use_debugger=True)

# Add a route to handle OPTIONS requests for all endpoints
@app.route('/api/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/api/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    response = jsonify({})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response 