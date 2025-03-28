// 商品情報の型定義
export interface Product {
  source: string;
  title: string;
  price: number;
  url: string;
  image_url: string;
  description?: string;
  availability: boolean;
  shop: string;
  rating?: number;
  review_count?: number;
  shipping_fee?: number | null;
  delivery_date?: string;
  additional_info?: Record<string, any>;
}

// 検索結果の型定義
export interface SearchResult {
  keywords: string[];
  price_comparison: PriceInfo[];
  detailed_products: ProductInfo[];
  product_info?: string;
  error?: string | null;
  jan_code?: string | null;
}

// 画像検索結果の型定義
export interface ImageSearchResult {
  similar_products: SimilarProduct[];
  price_comparison: PriceInfo[];
  detailed_products: ProductInfo[];
  query_image?: string;
  model_numbers?: ModelNumber[];
  generic_term?: string;
  message?: string;
  error?: string;
  filename?: string;
}

// 類似商品の型定義
export interface SimilarProduct {
  image_url: string;
  score: number;
  title: string;
}

// 価格情報の型定義
export interface PriceInfo {
  store: string;
  price: number;
  url: string;
  shipping_fee?: number;
  total_price?: number;
  title?: string;
  image_url?: string;
  shop?: string;
}

// 商品情報の型定義
export interface ProductInfo {
  source?: string;
  price?: number;
  url: string;
  availability?: boolean;
  title?: string;
  store?: string;
  shop?: string;
  image_url?: string;
  description?: string;
  rating?: number;
  features?: string[];
  asin?: string;  // Amazon Standard Identification Number for Amazon products
  shipping_fee?: number; // Shipping fee for the product
  additional_info?: {
    is_fallback?: boolean;
    [key: string]: any;
  };
  // Added fields for CSV export
  search_term?: string;
  brand?: string;
  manufacturer?: string;
  model?: string;
  model_number?: string;
  jan?: string;
  jan_code?: string;
  stock_status?: string;
  stock_quantity?: number | string;
}

// 商品比較結果の型定義
export interface ComparisonResult {
  product_a: ProductInfo;
  product_b: ProductInfo;
  differences: ProductDifference[];
  recommendation: string;
}

// 商品の違いの型定義
export interface ProductDifference {
  category: string;
  product_a_value: string;
  product_b_value: string;
  significance: 'high' | 'medium' | 'low';
}

// モデル番号の型定義
export interface ModelNumber {
  model_number: string;
  confidence: number;
  source: string;
} 