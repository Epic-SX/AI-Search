import axios from 'axios';
import { SearchResult, ImageSearchResult, ComparisonResult, ProductInfo } from '@/types';

// APIのベースURL
// Try different backend URLs to find the one that works
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
console.log('Using API base URL:', API_BASE_URL);

// Configure Axios defaults for CORS
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.withCredentials = false;

// Get JAN code for a model number
export const getJanCode = async (modelNumber: string): Promise<string | null> => {
  try {
    console.log(`DEBUG API: Getting JAN code for model number "${modelNumber}"`);
    const response = await axios.post(`${API_BASE_URL}/api/get-jan-code`, {
      model_number: modelNumber
    });
    console.log('DEBUG API: JAN code response received:', response.data);
    return response.data.jan_code;
  } catch (error) {
    console.error('Error getting JAN code:', error);
    return null;
  }
};

// Search by product info
export const searchByProductInfo = async (productInfo: string, directSearch: boolean = false): Promise<SearchResult> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/search/product`, {
      product_info: productInfo,
      direct_search: directSearch
    });
    return response.data;
  } catch (error) {
    console.error('Error in search:', error);
    throw error;
  }
};

// 製品コード画像による検索
export const searchByProductImage = async (formData: FormData): Promise<SearchResult> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/search/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error in image search:', error);
    throw error;
  }
};

// 製品コード画像のURLによる検索
export const searchByImageUrl = async (imageUrl: string): Promise<SearchResult> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/search/image-url`, {
      image_url: imageUrl
    });
    return response.data;
  } catch (error) {
    console.error('Error in image URL search:', error);
    throw error;
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
    // Create FormData for each file
    const formDataArray = imageFiles.map(file => {
      const formData = new FormData();
      formData.append('image', file);
      return formData;
    });
    
    // Process each image sequentially
    const results: ImageSearchResult[] = [];
    
    for (let i = 0; i < formDataArray.length; i++) {
      const formData = formDataArray[i];
      const response = await axios.post(`${API_BASE_URL}/api/search/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Add filename to the result
      results.push({
        ...response.data,
        filename: imageFiles[i].name
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error in batch image search:', error);
    throw error;
  }
};

// 複数画像URLによる一括検索
export const batchSearchByImageUrls = async (imageUrls: string[]): Promise<ImageSearchResult[]> => {
  try {
    // Process each URL sequentially
    const results: ImageSearchResult[] = [];
    
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      const response = await axios.post(`${API_BASE_URL}/api/search/image-url`, {
        image_url: imageUrl
      });
      
      // Add the URL to the result
      results.push({
        ...response.data,
        image_url: imageUrl
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error in batch image URL search:', error);
    throw error;
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
  } catch (error: any) {
    console.error('Error comparing products:', error);
    
    // Add more detailed error logging
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Server error response:', error.response.data);
      console.error('Status code:', error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
    
    throw error;
  }
};

// キーワードの強化
export const enhanceKeywords = async (modelNumbers: string[], prompt?: string): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/search/batch-keywords`, {
      model_numbers: modelNumbers,
      custom_prompt: prompt
    });
    return response.data;
  } catch (error) {
    console.error('Error in keyword enhancement:', error);
    throw error;
  }
};

// 複数の商品情報による一括検索
export const batchSearchByProductInfo = async (productInfoList: string[], directSearch: boolean = true, timeout: number = 120000): Promise<SearchResult[]> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/search/detailed-batch`, {
      product_info_list: productInfoList,
      direct_search: directSearch
    }, {
      timeout: timeout // Set a longer timeout for larger batches
    });
    
    // If the response contains a batch_id, save it for status checking
    if (response.data.batch_id) {
      localStorage.setItem('last_batch_id', response.data.batch_id);
      return response.data.results;
    }
    
    return response.data;
  } catch (error) {
    console.error('Error in batch search:', error);
    throw error;
  }
};

// Check status of a batch search
export const checkBatchSearchStatus = async (batchId: string): Promise<any> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/search/status/${batchId}`);
    return response.data;
  } catch (error) {
    console.error('Error checking batch status:', error);
    throw error;
  }
};

// 最適なモデルを見つける
export interface BestModelResult {
  best_model_number: string;
  reason: string;
  all_evaluations?: Array<{
    model_number: string;
    score: number;
    comment: string;
  }>;
  search_results?: SearchResult;
}

export const findBestModel = async (modelNumbers: string[], criteria: string): Promise<BestModelResult> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/find-best-model`, {
      model_numbers: modelNumbers,
      criteria: criteria
    });
    return response.data;
  } catch (error) {
    console.error('Error finding best model:', error);
    throw error;
  }
}; 