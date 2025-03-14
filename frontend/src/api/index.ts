import axios from 'axios';
import { SearchResult, ImageSearchResult, ComparisonResult } from '@/types';

// APIのベースURL
// Try different backend URLs to find the one that works
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
console.log('Using API base URL:', API_BASE_URL);

// Configure Axios defaults for CORS
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.withCredentials = false;

// 商品情報による検索
export const searchByProductInfo = async (productInfo: string, directSearch: boolean = true): Promise<SearchResult> => {
  try {
    console.log(`DEBUG API: Calling searchByProductInfo with productInfo="${productInfo}", directSearch=true`);
    const response = await axios.post(`${API_BASE_URL}/api/search/product`, {
      product_info: productInfo,
      direct_search: true // Always use direct search
    });
    console.log('DEBUG API: Search response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error searching by product info:', error);
    throw error;
  }
};

// 複数の商品情報による一括検索
export const batchSearchByProductInfo = async (productInfoList: string[], directSearch: boolean = true): Promise<SearchResult[]> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/search/detailed-batch`, {
      product_info_list: productInfoList,
      direct_search: true // Always use direct search
    });
    return response.data;
  } catch (error) {
    console.error('Error in batch search:', error);
    throw error;
  }
};

// 画像URLによる検索
export const searchByImageUrl = async (imageUrl: string): Promise<ImageSearchResult> => {
  try {
    // Use only the /api/search/image endpoint
    const endpoint = `${API_BASE_URL}/api/search/image`;
    console.log(`Sending image URL search request to ${endpoint}`);
    
    // Add a timeout to prevent hanging requests
    const response = await axios.post(endpoint, {
      image_url: imageUrl
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Image URL search response:', response.data);
    
    // Process the response to ensure all products have valid image URLs
    if (response.data.detailed_products && response.data.detailed_products.length > 0) {
      response.data.detailed_products = response.data.detailed_products.map((product: any) => {
        // Fix Amazon image URLs
        if (product.source?.toLowerCase().includes('amazon') && product.image_url) {
          if (product.image_url.includes('placehold.co') || !product.image_url.startsWith('http')) {
            if (product.asin) {
              product.image_url = `https://m.media-amazon.com/images/I/${product.asin}._AC_SL1200_.jpg`;
            }
          }
        }
        
        // Fix Yahoo image URLs
        if (product.source?.toLowerCase().includes('yahoo') && product.image_url) {
          if (product.image_url.includes('placehold.co') || product.image_url.includes('no_image')) {
            const encodedTitle = encodeURIComponent(product.title || 'product');
            product.image_url = `https://shopping.c.yimg.jp/lib/y-kojima/${encodedTitle.substring(0, 30)}.jpg`;
          }
        }
        
        return product;
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('Error searching by image URL:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Status:', error.response?.status);
    }
    
    // Return a default error response
    return {
      similar_products: [],
      price_comparison: [],
      detailed_products: [],
      query_image: imageUrl,
      model_numbers: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// 画像ファイルによる検索
export const searchByImage = async (imageFile: File): Promise<ImageSearchResult> => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    // First try with the /api prefix
    const endpoint = `${API_BASE_URL}/api/search/image`;
    console.log(`Sending image file search request to ${endpoint}`);
    
    try {
      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      console.log('Image file search response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error with /api prefix: ${error}`);
      
      // If that fails, try without the /api prefix
      const fallbackEndpoint = `${API_BASE_URL}/search/image`;
      console.log(`Trying fallback endpoint: ${fallbackEndpoint}`);
      
      const fallbackResponse = await axios.post(fallbackEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      console.log('Fallback response:', fallbackResponse.data);
      return fallbackResponse.data;
    }
  } catch (error) {
    console.error('Error searching by image file:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Status:', error.response?.status);
    }
    throw error;
  }
};

// 複数画像ファイルによる一括検索
export const batchSearchByImages = async (imageFiles: File[]): Promise<ImageSearchResult[]> => {
  try {
    // Process each image file individually and collect results
    const promises = imageFiles.map(file => searchByImage(file).catch(error => {
      console.error(`Error searching with image file ${file.name}:`, error);
      // Return an empty result with error information
      return {
        similar_products: [],
        price_comparison: [],
        detailed_products: [],
        query_image: URL.createObjectURL(file),
        model_numbers: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        filename: file.name // Add filename for identification
      } as ImageSearchResult;
    }));
    
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error in batch image search:', error);
    throw error;
  }
};

// 複数画像URLによる一括検索
export const batchSearchByImageUrls = async (imageUrls: string[]): Promise<ImageSearchResult[]> => {
  try {
    console.log(`Starting batch search with ${imageUrls.length} image URLs`);
    
    // Process each image URL individually and collect results
    const promises = imageUrls.map(url => 
      searchByImageUrl(url)
        .catch(error => {
          console.error(`Error searching with image URL ${url}:`, error);
          // Return an empty result with error information
          return {
            similar_products: [],
            price_comparison: [],
            detailed_products: [],
            query_image: url,
            model_numbers: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          } as ImageSearchResult;
        })
    );
    
    const results = await Promise.all(promises);
    console.log(`Completed batch search for ${imageUrls.length} URLs`);
    return results;
  } catch (error) {
    console.error('Error in batch image URL search:', error);
    // Return empty results for all URLs
    return imageUrls.map(url => ({
      similar_products: [],
      price_comparison: [],
      detailed_products: [],
      query_image: url,
      model_numbers: [],
      error: 'Batch search failed'
    }));
  }
};

// 画像の内容を分析
export const analyzeImage = async (formData: FormData | { image_url: string }): Promise<{ generic_term: string } | null> => {
  try {
    const endpoint = `${API_BASE_URL}/api/analyze-image`;
    console.log(`Sending image analysis request to ${endpoint}`);
    
    let response;
    if ('image_url' in formData) {
      // If it's an image URL
      response = await axios.post(endpoint, {
        image_url: formData.image_url
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });
    } else {
      // If it's a file upload
      response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout
      });
    }
    
    console.log('Image analysis response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error analyzing image:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Status:', error.response?.status);
    }
    return null;
  }
};

// 商品比較
export const compareProducts = async (productA: string, productB: string): Promise<ComparisonResult> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/compare`, {
      product_a: productA,
      product_b: productB
    });
    return response.data;
  } catch (error) {
    console.error('Error comparing products:', error);
    throw error;
  }
};

// AIによる検索キーワード最適化
export const enhanceKeywords = async (productInfoList: string[], customPrompt?: string): Promise<string[]> => {
  try {
    const payload: any = {
      product_info_list: productInfoList
    };
    
    // Add custom prompt if provided
    if (customPrompt) {
      payload.custom_prompt = customPrompt;
    }
    
    const response = await axios.post(`${API_BASE_URL}/api/search/enhance-keywords`, payload);
    return response.data.keywords;
  } catch (error) {
    console.error('Error enhancing keywords:', error);
    throw error;
  }
};

// Interface for batch keyword generation results
export interface KeywordResult {
  model_number: string;
  keyword: string;
}

// 一括キーワード生成
export const batchGenerateKeywords = async (modelNumbers: string[], customPrompt?: string): Promise<KeywordResult[]> => {
  try {
    const payload: any = {
      model_numbers: modelNumbers
    };
    
    // Add custom prompt if provided
    if (customPrompt) {
      payload.custom_prompt = customPrompt;
    }
    
    const response = await axios.post(`${API_BASE_URL}/api/search/batch-keywords`, payload);
    return response.data.results;
  } catch (error) {
    console.error('Error generating batch keywords:', error);
    throw error;
  }
};

// 最適なモデル番号を見つける
export interface ModelEvaluation {
  model_number: string;
  score: number;
  comment: string;
}

export interface BestModelResult {
  best_model_number: string | null;
  reason: string;
  all_evaluations: ModelEvaluation[];
}

export const findBestModel = async (modelNumbers: string[], criteriaPrompt: string): Promise<BestModelResult> => {
  try {
    const payload = {
      model_numbers: modelNumbers,
      criteria_prompt: criteriaPrompt
    };
    
    const response = await axios.post(`${API_BASE_URL}/api/search/find-best-model`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: false
    });
    return response.data;
  } catch (error) {
    console.error('Error finding best model:', error);
    throw error;
  }
}; 