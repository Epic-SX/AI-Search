from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
# type: ignore
from werkzeug.utils import secure_filename
from src.search.similar_products import ProductSearchEngine
from src.search.image_search import ImageSearchEngine
from src.comparison.price_compare import PriceComparisonEngine
from dotenv import load_dotenv
import re
from datetime import datetime
from src.api.amazon_api import amazon_api, AmazonAPI
from src.api.rakuten_api import rakuten_api
from src.api.yahoo_api import yahoo_api
from src.tools.batch_keyword_generator import BatchKeywordGenerator

app = Flask(__name__)
# Configure CORS properly with specific settings
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000", 
                                "allow_headers": ["Content-Type", "Authorization"],
                                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                                "supports_credentials": True}})

# Add an explicit route handler for OPTIONS requests
@app.route('/api/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return '', 200

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

def select_cheapest_highest_ranked_products(products, max_products=10):
    """
    価格とランキングに基づいて最適な商品を選択
    """
    if not products:
        return []
        
    # Sort by price (ascending) and then by ranking (descending) if available
    sorted_products = sorted(
        products,
        key=lambda p: (
            float('inf') if not p.get('price') or p.get('price') == 0 else p.get('price'),
            -1 * (p.get('ranking', 0) or 0)  # Higher ranking is better
        )
    )
    
    # Return the top N products
    return sorted_products[:max_products]

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
    Rakuten商品情報を検索（API優先）
    """
    # Use the Rakuten API to get product information
    return rakuten_api.search_products(keywords, limit)

def _get_rakuten_fallback(keywords, limit=5):
    """
    楽天APIが失敗した場合のフォールバック価格情報
    """
    # Use the fallback method from the Rakuten API
    return rakuten_api._get_fallback_prices(keywords, limit)

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
        first_image = item['mediumImageUrls'][0]
        if isinstance(first_image, dict) and 'imageUrl' in first_image:
            image_url = first_image['imageUrl']
            if image_url:
                # Ensure the URL uses HTTPS
                if image_url.startswith('http:'):
                    image_url = image_url.replace('http:', 'https:')
                
                # Add size parameter for better quality if using thumbnail.image.rakuten.co.jp
                if 'thumbnail.image.rakuten.co.jp' in image_url and not '_ex=' in image_url:
                    image_url = f"{image_url}{'&' if '?' in image_url else '?'}_ex=300x300"
                
                return image_url
    
    # Try to get small image URL
    if 'smallImageUrls' in item and len(item['smallImageUrls']) > 0:
        first_image = item['smallImageUrls'][0]
        if isinstance(first_image, dict) and 'imageUrl' in first_image:
            image_url = first_image['imageUrl']
            if image_url:
                # Ensure the URL uses HTTPS
                if image_url.startswith('http:'):
                    image_url = image_url.replace('http:', 'https:')
                
                # Add size parameter for better quality if using thumbnail.image.rakuten.co.jp
                if 'thumbnail.image.rakuten.co.jp' in image_url and not '_ex=' in image_url:
                    image_url = f"{image_url}{'&' if '?' in image_url else '?'}_ex=300x300"
                
                return image_url
    
    # Default Rakuten logo
    return "https://thumbnail.image.rakuten.co.jp/@0_mall/rakuten/cabinet/ichiba/app/pc/img/common/logo_rakuten_320x320.png"

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
        
        # ランキングと価格に基づいて最適な商品を選択
        selected_products = select_cheapest_highest_ranked_products(serializable_detailed_products)
        
        # 結果を返す
        return jsonify({
            'query': query,
            'keywords': keywords,
            'price_results': price_results,
            'detailed_products': selected_products,
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
                    # 画像ファイル名からモデル番号を抽出する試み
                    import re
                    model_patterns = [
                        r'[A-Z0-9]{2,}-[A-Z0-9]{2,}',  # ABC-123 形式
                        r'[A-Z]{2,}[0-9]{2,}',         # ABC123 形式
                        r'[0-9]{2,}-[A-Z0-9]{2,}'      # 12-ABC 形式
                    ]
                    
                    input_model = None
                    for pattern in model_patterns:
                        matches = re.findall(pattern, filename)
                        if matches:
                            input_model = matches[0]
                            print(f"Extracted model number from filename: {input_model}")
                            break
                    
                    # モデル番号を抽出（入力されたモデル番号を優先）
                    model_numbers = []
                    try:
                        model_numbers = image_search.extract_model_numbers(image_data=image_data)
                        print(f"Extracted model numbers: {model_numbers}")
                    except Exception as e:
                        print(f"Error extracting model numbers from image: {e}")
                        # Continue with empty model numbers
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
                        # Use a more useful default term instead of "ロープ"
                        generic_term = "スマートフォン"  # Default to "smartphone" which is likely to yield results
                
                # モデル番号が見つかった場合、それを使って検索
                if model_numbers:
                    # 最も信頼度の高いモデル番号を使用
                    best_model = model_numbers[0]['model_number']
                    print(f"Using model number for search: {best_model}")
                    
                    # 最も信頼度の高いモデル番号のみを使用
                    filtered_model_numbers = [model_numbers[0]]
                    
                    try:
                        # モデル番号で検索
                        search_results = product_search.search(best_model)
                        
                        # 結果を返す
                        return jsonify({
                            'query_image': f"/api/uploads/{filename}",
                            'model_numbers': filtered_model_numbers,
                            'generic_term': generic_term,  # Add generic term to the response
                            'similar_products': [],
                            'price_comparison': search_results.get('price_comparison', []),
                            'detailed_products': search_results.get('detailed_products', [])
                        })
                    except Exception as e:
                        print(f"Error searching with model number: {e}")
                        # Fall back to generic term search if model number search fails
                        generic_term = generic_term or "商品"
                
                # モデル番号が見つからないが、画像の内容が識別できた場合
                if generic_term:
                    print(f"No model number found or model number search failed. Using generic term for search: {generic_term}")
                    
                    # 単一検索を使用して商品を検索
                    search_results = product_search.search(generic_term)
                    
                    # 結果を返す
                    return jsonify({
                        'query_image': f"/api/uploads/{filename}",
                        'model_numbers': model_numbers,
                        'generic_term': generic_term,
                                'similar_products': [],
                        'price_comparison': search_results.get('price_comparison', []),
                        'detailed_products': search_results.get('detailed_products', [])
                    })
                
                # 何も見つからなかった場合
                    return jsonify({
                        'query_image': f"/api/uploads/{filename}",
                        'model_numbers': [],
                    'generic_term': "商品",
                        'similar_products': [],
                        'price_comparison': [],
                    'detailed_products': [],
                    'error': 'No model number or recognizable content found'
                    })
                
            except Exception as e:
                print(f"Error processing image file: {e}")
                return jsonify({'error': f'Error processing image file: {str(e)}'}), 500
            
        # 画像URLからの検索
        elif 'image_url' in request.json:
            image_url = request.json['image_url']
            if not image_url:
                return jsonify({'error': 'Invalid image URL'}), 400
                
            try:
                # 画像URLからモデル番号を抽出
                model_numbers = []
                try:
                    model_numbers = image_search.extract_model_numbers(image_url=image_url)
                    print(f"Extracted model numbers from URL: {model_numbers}")
                except Exception as e:
                    print(f"Error extracting model numbers from URL: {e}")
                    # Continue with empty model numbers
                
                # モデル番号が見つからない場合は画像の内容を分析
                generic_term = None
                if not model_numbers:
                    try:
                        generic_term = image_search.analyze_image_content(image_url=image_url)
                        print(f"Analyzed image content from URL: {generic_term}")
                    except Exception as e:
                        print(f"Error analyzing image content from URL: {e}")
                        # Use a more useful default term
                        generic_term = "スマートフォン"
                
                # モデル番号が見つかった場合、それを使って検索
                if model_numbers:
                    # 最も信頼度の高いモデル番号を使用
                    best_model = model_numbers[0]['model_number']
                    print(f"Using model number for search: {best_model}")
                    
                    # 最も信頼度の高いモデル番号のみを使用
                    filtered_model_numbers = [model_numbers[0]]
                    
                    try:
                        # モデル番号で検索
                        search_results = product_search.search(best_model)
                        
                        # 結果を返す
                        return jsonify({
                            'query_image': image_url,
                            'model_numbers': filtered_model_numbers,
                            'generic_term': generic_term,  # Add generic term to the response
                            'similar_products': [],
                            'price_comparison': search_results.get('price_comparison', []),
                            'detailed_products': search_results.get('detailed_products', [])
                        })
                    except Exception as e:
                        print(f"Error searching with model number from URL: {e}")
                        # Fall back to generic term search if model number search fails
                        generic_term = generic_term or "商品"
                
                # モデル番号が見つからないが、画像の内容が識別できた場合
                if generic_term:
                    print(f"No model number found or model number search failed. Using generic term for search from URL: {generic_term}")
                    
                    # 単一検索を使用して商品を検索
                    search_results = product_search.search(generic_term)
                    
                    # 結果を返す
                    return jsonify({
                        'query_image': image_url,
                        'model_numbers': model_numbers,
                        'generic_term': generic_term,
                        'similar_products': [],
                        'price_comparison': search_results.get('price_comparison', []),
                        'detailed_products': search_results.get('detailed_products', [])
                    })
                
                # 何も見つからなかった場合
                    return jsonify({
                        'query_image': image_url,
                        'model_numbers': [],
                    'generic_term': "商品",
                        'similar_products': [],
                        'price_comparison': [],
                        'detailed_products': [],
                    'error': 'No model number or recognizable content found'
                    })
                
            except Exception as e:
                print(f"Error processing image URL: {e}")
                return jsonify({'error': f'Error processing image URL: {str(e)}'}), 500
            
        else:
            return jsonify({'error': 'No image or image URL provided'}), 400
            
    except Exception as e:
        print(f"Error in image search: {e}")
        return jsonify({'error': str(e)}), 500

# Add a fallback route for image search without the /api prefix
@app.route('/search/image', methods=['POST'])
def search_by_image_fallback():
    """
    画像から類似商品を検索 (フォールバックエンドポイント)
    """
    return search_by_image()

@app.route('/api/compare', methods=['POST'])
def compare_products():
    """商品比較API"""
    data = request.json
    product_a = data.get('product_a')
    product_b = data.get('product_b')
    
    if not product_a or not product_b:
        return jsonify({"error": "Both products are required for comparison"}), 400
    
    # Helper function to safely get attribute from either dict or object
    def get_attr(obj, attr, default=None):
        if isinstance(obj, dict):
            return obj.get(attr, default)
        else:
            return getattr(obj, attr, default)
    
    # Helper function to clean HTML tags from text
    def clean_html(html_text):
        """Remove HTML tags from text"""
        if not html_text:
            return ""
            
        import re
        # Replace <br>, <br/>, <br /> with newlines
        text = re.sub(r'<br\s*/?>', '\n', html_text, flags=re.IGNORECASE)
        
        # Remove all other HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Replace multiple newlines with a single newline
        text = re.sub(r'\n+', '\n', text)
        
        # Replace multiple spaces with a single space
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    try:
        # 各商品の詳細情報を取得
        products_a = price_comparison.get_detailed_products(product_a)
        products_b = price_comparison.get_detailed_products(product_b)
        
        # Check if we found any products
        if not products_a:
            return jsonify({"error": f"Could not find information for product: {product_a}"}), 404
        
        if not products_b:
            return jsonify({"error": f"Could not find information for product: {product_b}"}), 404
        
        # 最初の商品を使用
        product_a_info = products_a[0]
        product_b_info = products_b[0]
        
        # Validate that both products have the necessary data
        price_a = get_attr(product_a_info, 'price')
        price_b = get_attr(product_b_info, 'price')
        
        if price_a is None:
            return jsonify({"error": f"Price information not available for product: {product_a}"}), 400
            
        if price_b is None:
            return jsonify({"error": f"Price information not available for product: {product_b}"}), 400
        
        # 違いを分析（実際のアプリケーションではより詳細な分析が必要）
        differences = []
        
        # 価格の違い
        try:
            price_diff = abs(price_a - price_b)
            price_percentage = price_diff / max(price_a, price_b) * 100 if max(price_a, price_b) > 0 else 0
            
            differences.append({
                'category': '価格',
                'product_a_value': f"{price_a}円",
                'product_b_value': f"{price_b}円",
                'significance': 'high' if price_percentage > 20 else 'medium' if price_percentage > 5 else 'low'
            })
        except (TypeError, ZeroDivisionError) as e:
            print(f"Error calculating price difference: {e}")
            # Add a placeholder for price difference
            differences.append({
                'category': '価格',
                'product_a_value': f"{price_a or '不明'}円",
                'product_b_value': f"{price_b or '不明'}円",
                'significance': 'medium'
            })
        
        # 送料の違い
        try:
            shipping_fee_a = get_attr(product_a_info, 'shipping_fee', 0)
            shipping_fee_b = get_attr(product_b_info, 'shipping_fee', 0)
            
            if shipping_fee_a is not None and shipping_fee_b is not None:
                shipping_diff = abs((shipping_fee_a or 0) - (shipping_fee_b or 0))
                differences.append({
                    'category': '送料',
                    'product_a_value': f"{shipping_fee_a or 0}円",
                    'product_b_value': f"{shipping_fee_b or 0}円",
                    'significance': 'high' if shipping_diff > 500 else 'medium' if shipping_diff > 100 else 'low'
                })
        except Exception as e:
            print(f"Error calculating shipping difference: {e}")
        
        # 評価の違い
        try:
            rating_a = get_attr(product_a_info, 'rating')
            rating_b = get_attr(product_b_info, 'rating')
            
            if rating_a is not None and rating_b is not None:
                rating_diff = abs((rating_a or 0) - (rating_b or 0))
                differences.append({
                    'category': '評価',
                    'product_a_value': f"{rating_a or 0}点",
                    'product_b_value': f"{rating_b or 0}点",
                    'significance': 'high' if rating_diff > 1.5 else 'medium' if rating_diff > 0.5 else 'low'
                })
        except Exception as e:
            print(f"Error calculating rating difference: {e}")
        
        # 耐荷重の違い (Extract from description or additional_info)
        try:
            # Try to find load capacity information in the product data
            load_capacity_a = "不明"
            load_capacity_b = "不明"
            
            # Check in additional_info
            additional_info_a = get_attr(product_a_info, 'additional_info', {})
            if additional_info_a:
                for key, value in additional_info_a.items():
                    if '荷重' in key or '耐荷重' in key or '最大荷重' in key:
                        load_capacity_a = str(value)
                        break
            
            additional_info_b = get_attr(product_b_info, 'additional_info', {})
            if additional_info_b:
                for key, value in additional_info_b.items():
                    if '荷重' in key or '耐荷重' in key or '最大荷重' in key:
                        load_capacity_b = str(value)
                        break
            
            # Check in description
            description_a = get_attr(product_a_info, 'description', '')
            if load_capacity_a == "不明" and description_a:
                import re
                load_capacity_match = re.search(r'耐荷重[：:]\s*(\d+[kgkg]*)', description_a)
                if load_capacity_match:
                    load_capacity_a = load_capacity_match.group(1)
            
            description_b = get_attr(product_b_info, 'description', '')
            if load_capacity_b == "不明" and description_b:
                import re
                load_capacity_match = re.search(r'耐荷重[：:]\s*(\d+[kgkg]*)', description_b)
                if load_capacity_match:
                    load_capacity_b = load_capacity_match.group(1)
            
            # Add to differences if at least one product has load capacity info
            if load_capacity_a != "不明" or load_capacity_b != "不明":
                differences.append({
                    'category': '耐荷重',
                    'product_a_value': load_capacity_a,
                    'product_b_value': load_capacity_b,
                    'significance': 'high'  # Load capacity is usually important
                })
        except Exception as e:
            print(f"Error extracting load capacity: {e}")
        
        # 特徴の違い (Extract from features or description)
        try:
            # Try to find features information in the product data
            features_a = "不明"
            features_b = "不明"
            
            # Check in features field
            product_features_a = get_attr(product_a_info, 'features', [])
            if product_features_a:
                if isinstance(product_features_a, list):
                    features_a = ", ".join(product_features_a[:3])  # Take first 3 features
                else:
                    features_a = str(product_features_a)
            
            product_features_b = get_attr(product_b_info, 'features', [])
            if product_features_b:
                if isinstance(product_features_b, list):
                    features_b = ", ".join(product_features_b[:3])  # Take first 3 features
                else:
                    features_b = str(product_features_b)
            
            # If no features, extract from description
            if features_a == "不明" and description_a:
                # Use the full description instead of truncating
                features_a = clean_html(description_a)
            
            if features_b == "不明" and description_b:
                # Use the full description instead of truncating
                features_b = clean_html(description_b)
            
            # Add to differences if at least one product has features info
            if features_a != "不明" or features_b != "不明":
                differences.append({
                    'category': '特徴',
                    'product_a_value': features_a,
                    'product_b_value': features_b,
                    'significance': 'medium'
                })
        except Exception as e:
            print(f"Error extracting features: {e}")
        
        # 推奨
        recommendation = ""
        
        # 価格差が大きい場合は安い方を推奨
        try:
            if price_percentage > 20:
                cheaper_product = "商品A" if price_a < price_b else "商品B"
                recommendation = f"{cheaper_product}の方が{price_percentage:.1f}%安いため、コストパフォーマンスが良いでしょう。"
            # 価格差が小さい場合は評価が高い方を推奨
            elif rating_a is not None and rating_b is not None and abs(rating_a - rating_b) > 0.5:
                better_rated = "商品A" if rating_a > rating_b else "商品B"
                recommendation = f"{better_rated}の方が評価が高いため、品質が良い可能性があります。"
            # それ以外の場合は特徴に基づいて推奨
            else:
                # 特徴に基づく推奨ロジックを実装
                recommendation = "両商品は価格と評価が似ていますが、詳細な特徴を比較して選択することをお勧めします。"
        except Exception as e:
            print(f"Error generating recommendation: {e}")
            recommendation = "商品の詳細を比較して、ご自身のニーズに合った方を選択してください。"
        
        # 商品情報を辞書に変換
        def product_to_dict(product):
            if isinstance(product, dict):
                return product
            elif hasattr(product, 'to_dict') and callable(getattr(product, 'to_dict')):
                return product.to_dict()
            else:
                # Convert object attributes to dictionary
                return {k: v for k, v in product.__dict__.items() if not k.startswith('_')}
        
        # 結果を返す
        result = {
            'product_a': product_to_dict(product_a_info),
            'product_b': product_to_dict(product_b_info),
            'differences': differences,
            'recommendation': recommendation
        }
        
        return jsonify(result)
    except Exception as e:
        print(f"Error comparing products: {e}")
        return jsonify({"error": f"Error comparing products: {str(e)}"}), 500

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
        # Always use direct search
        direct_search = True
        
        if not product_info_list or not isinstance(product_info_list, list):
            return jsonify({'error': 'Invalid product info list'}), 400
            
        # 商品情報リストが大きすぎる場合はエラー
        if len(product_info_list) > 5:
            return jsonify({'error': 'Too many items. Maximum 5 items allowed.'}), 400
        
        results = []
        
        for product_info in product_info_list:
            try:
                # キーワード生成 (Always use direct search)
                # For direct search, use the exact model number provided by the user
                keywords = [product_info]  # Use the exact input as the only keyword
                print(f"DEBUG: Direct search enabled. Using exact model number: {product_info}")
                
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
                product_info = amazon_api.search_items(model_number, limit=5)
                
                if product_info and len(product_info) > 0:
                    # Extract relevant product information
                    product = product_info[0]
                    # Check if product is a ProductDetail object
                    if hasattr(product, 'title'):
                        product_details = {
                            "model_number": model_number,
                            "title": product.title,
                            "features": getattr(product, 'features', []),
                            "description": getattr(product, 'description', '')
                        }
                    else:
                        # Handle dictionary format
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
            
        # Instead of fetching product information for each model number,
        # directly use Perplexity AI to find the best model
        product_info_list = []
        for model_number in cleaned_model_numbers:
            product_info_list.append({"model_number": model_number})
        
        # Find the best model that meets the criteria
        result = generator.find_best_model(product_info_list, criteria_prompt)
        
        # Return just the best model number and reason
        return jsonify({
            'best_model_number': result.get('best_model_number'),
            'reason': result.get('reason')
        })
    except Exception as e:
        print(f"Error in find best model: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add a route to explicitly handle OPTIONS requests
@app.route('/api/search/product', methods=['OPTIONS'])
def handle_product_options():
    response = jsonify({'status': 'ok'})
    return response

# Add the missing POST method handler for /api/search/product
@app.route('/api/search/product', methods=['POST'])
def search_product():
    """
    Search for a specific product by model number or product info
    """
    try:
        data = request.json
        product_info = data.get('product_info', '')
        
        if not product_info:
            return jsonify({"error": "Product info is required"}), 400
        
        # Use direct search with the exact model number/product info
        keywords = [product_info]
        
        # Get detailed product information
        detailed_products = price_comparison.get_detailed_products_with_model_numbers(keywords)
        
        # Convert product objects to dictionaries
        serializable_products = []
        for product in detailed_products:
            if hasattr(product, 'to_dict'):
                product_dict = product.to_dict()
                serializable_products.append(product_dict)
            else:
                # If it's already a dictionary
                serializable_products.append(product.__dict__)
        
        # Return the results
        return jsonify({
            'query': product_info,
            'keywords': keywords,
            'detailed_products': serializable_products
        })
        
    except Exception as e:
        print(f"Error in product search: {e}")
        return jsonify({"error": str(e)}), 500
