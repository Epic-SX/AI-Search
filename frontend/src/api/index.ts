import axios from 'axios';
import { SearchResult, ImageSearchResult, ComparisonResult } from '@/types';

// APIのベースURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Configure Axios defaults for CORS
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.withCredentials = false;

// 商品情報による検索
export const searchByProductInfo = async (productInfo: string, directSearch: boolean = false): Promise<SearchResult> => {
  try {
    console.log(`DEBUG API: Calling searchByProductInfo with productInfo="${productInfo}", directSearch=${directSearch}`);
    const response = await axios.post(`${API_BASE_URL}/search/product`, {
      product_info: productInfo,
      direct_search: directSearch
    });
    console.log('DEBUG API: Search response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error searching by product info:', error);
    throw error;
  }
};

// 複数の商品情報による一括検索
export const batchSearchByProductInfo = async (productInfoList: string[], directSearch: boolean = false): Promise<SearchResult[]> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/search/detailed-batch`, {
      product_info_list: productInfoList,
      direct_search: directSearch
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
    const response = await axios.post(`${API_BASE_URL}/search/image`, {
      image_url: imageUrl
    });
    return response.data;
  } catch (error) {
    console.error('Error searching by image URL:', error);
    throw error;
  }
};

// 画像ファイルによる検索
export const searchByImage = async (imageFile: File): Promise<ImageSearchResult> => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await axios.post(`${API_BASE_URL}/search/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error searching by image file:', error);
    throw error;
  }
};

// 商品比較
export const compareProducts = async (productA: string, productB: string): Promise<ComparisonResult> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/compare`, {
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
    
    const response = await axios.post(`${API_BASE_URL}/search/enhance-keywords`, payload);
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
    
    const response = await axios.post(`${API_BASE_URL}/search/batch-keywords`, payload);
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
    
    const response = await axios.post(`${API_BASE_URL}/search/find-best-model`, payload, {
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