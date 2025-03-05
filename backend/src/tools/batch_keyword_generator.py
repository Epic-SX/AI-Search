import os
import re
import requests
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class BatchKeywordGenerator:
    def __init__(self):
        self.api_key = os.environ.get('PERPLEXITY_API_KEY')
        if not self.api_key:
            print("Error: PERPLEXITY_API_KEY environment variable is not set.")
            sys.exit(1)
        
        self.endpoint = "https://api.perplexity.ai/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def clean_model_number(self, model_number):
        """
        Clean up the model number by removing numbering like "1 EA628W-25B" -> "EA628W-25B"
        and other common patterns that might appear in user input
        """
        if isinstance(model_number, dict):
            # If it's already a dictionary, just return it
            return model_number
            
        # Convert to string if it's not already
        model_number = str(model_number).strip()
        
        # Remove numbering at the beginning (e.g., "1 EA628W-25B" -> "EA628W-25B")
        model_number = re.sub(r'^\d+[\s\.:]?\s*', '', model_number)
        
        # Remove "型番:" prefix if present
        model_number = re.sub(r'^型番[:：]?\s*', '', model_number)
        
        # Remove any text that looks like part of a prompt
        if any(phrase in model_number for phrase in ['下記の商品', '検索キーワード', 'プロンプト', '出力は商品名', 'メーカー名']):
            return ""
            
        return model_number.strip()

    def generate_keyword(self, model_number, custom_prompt=None):
        """
        Generate a search keyword for a single model number or product information
        
        Args:
            model_number: Can be just a model number string or a detailed product information string
            custom_prompt: Optional custom prompt template
        
        Returns:
            A generated keyword string
        """
        # Check if model_number is a simple string or a detailed product info
        if isinstance(model_number, dict):
            # It's a product info dictionary
            product_info = model_number
            model_number_str = product_info.get("model_number", "")
            context = ""
            
            # Build context from product info
            if "model_number" in product_info:
                context += f"型番: {product_info['model_number']}\n"
            
            if "title" in product_info and product_info["title"]:
                context += f"商品名: {product_info['title']}\n"
            
            if "features" in product_info and product_info["features"]:
                context += "特徴:\n" + "\n".join([f"- {feature}" for feature in product_info["features"]]) + "\n"
            
            if "description" in product_info and product_info["description"]:
                context += f"説明: {product_info['description']}\n"
            
            cleaned_model = context
        else:
            # It's just a model number string
            cleaned_model = self.clean_model_number(model_number)
        
        # Use custom prompt if provided, otherwise use default prompt
        if custom_prompt:
            if isinstance(model_number, dict):
                # If we have rich product info, just append the prompt to the context
                prompt = cleaned_model + "\n\n" + custom_prompt.replace('{model_number}', model_number_str)
            else:
                prompt = custom_prompt.replace('{model_number}', cleaned_model)
        else:
            if isinstance(model_number, dict):
                # Use the rich context with default instructions
                prompt = f"""
                下記の商品情報から重要なキーワードを組み合わせて表現を変えて
                類似品を検索しやすいように検索キーワードを作成してください。
                商品の情報や特徴を組み合わせて重要な検索キーワードを１個抽出してください。
                出力は商品名＋商品の特徴＋サイズや重量は近いものでお願いします。
                既存のメーカーを選定しないように、メーカー名、型番は記載しないようにお願いします。
                英語の場合は日本語に翻訳してください。
                
                {cleaned_model}
                
                最適な検索キーワードを1つだけ出力してください。余計な説明は不要です。
                """
            else:
                prompt = f"""
                下記の商品名、型番、仕様情報から重要なキーワードを組み合わせて表現を変えて
                類似品を検索しやすいように検索キーワードを作成してください。
                商品の情報や特徴を組み合わせて重要な検索キーワードを１個抽出してください。
                出力は商品名＋商品の特徴＋サイズや重量は近いものでお願いします。
                既存のメーカーを選定しないように、メーカー名、型番は記載しないようにお願いします。
                英語の場合は日本語に翻訳してください。
                
                型番 {cleaned_model}
                
                最適な検索キーワードを1つだけ出力してください。余計な説明は不要です。
                """
        
        try:
            response = requests.post(
                self.endpoint,
                headers=self.headers,
                json={
                    "model": "sonar",
                    "messages": [
                        {
                            "role": "system",
                            "content": "あなたは製品型番から最適な検索キーワードを生成する専門家です。簡潔で具体的な日本語のキーワードを1つだけ提供してください。"
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 100
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                enhanced_keyword = result["choices"][0]["message"]["content"].strip()
                return enhanced_keyword
            else:
                print(f"API error: {response.status_code} - {response.text}")
                if isinstance(model_number, dict) and "model_number" in model_number:
                    return model_number["model_number"]  # Fallback to using the model number directly
                else:
                    return cleaned_model  # Fallback to using the model number directly
                
        except Exception as e:
            print(f"Error in API call: {e}")
            if isinstance(model_number, dict) and "model_number" in model_number:
                return model_number["model_number"]  # Fallback to using the model number directly
            else:
                return cleaned_model  # Fallback to using the model number directly

    def batch_generate(self, model_numbers, custom_prompt=None):
        """
        Generate search keywords for multiple model numbers or product information
        
        Args:
            model_numbers: List of model numbers or product information dictionaries
            custom_prompt: Optional custom prompt template
        
        Returns:
            List of dictionaries with model_number and keyword
        """
        results = []
        
        for item in model_numbers:
            if not item:
                continue
            
            if isinstance(item, dict):
                # It's a product info dictionary
                model_number = item.get("model_number", "")
                # Clean the model number
                model_number = self.clean_model_number(model_number)
                if not model_number.strip():
                    continue
                    
                # Update the model number in the dictionary
                item["model_number"] = model_number
                
                keyword = self.generate_keyword(item, custom_prompt)
                results.append({
                    "model_number": model_number.strip(),
                    "keyword": keyword
                })
            else:
                # It's a model number string
                # Clean the model number
                model_number = self.clean_model_number(item)
                if not model_number.strip():
                    continue
                
                keyword = self.generate_keyword(model_number, custom_prompt)
                results.append({
                    "model_number": model_number.strip(),
                    "keyword": keyword
                })
        
        return results
        
    def find_best_model(self, model_numbers, criteria_prompt):
        """
        Find the best model number that meets the criteria specified in the prompt
        
        Args:
            model_numbers: List of model numbers or product information dictionaries
            criteria_prompt: Prompt describing the criteria for selection
            
        Returns:
            Dictionary with best_model_number, reason, and all_evaluations
        """
        # First, gather product information for all model numbers
        product_info_list = []
        
        for item in model_numbers:
            if not item:
                continue
                
            if isinstance(item, dict):
                # It's already a product info dictionary
                model_number = item.get("model_number", "")
                # Clean the model number
                model_number = self.clean_model_number(model_number)
                if not model_number.strip():
                    continue
                    
                # Update the model number in the dictionary
                item["model_number"] = model_number
                product_info_list.append(item)
            else:
                # It's a model number string
                # Clean the model number
                model_number = self.clean_model_number(item)
                if not model_number.strip():
                    continue
                    
                # Just use the model number as is
                product_info_list.append({"model_number": model_number})
        
        if not product_info_list:
            return {
                "best_model_number": None,
                "reason": "No valid model numbers provided",
                "all_evaluations": []
            }
            
        # Create a prompt to evaluate all models against the criteria
        evaluation_prompt = f"""
        以下の複数の商品情報から、次の条件に最も合致する商品を1つ選んでください：
        
        条件：
        {criteria_prompt}
        
        商品情報：
        """
        
        for i, info in enumerate(product_info_list):
            evaluation_prompt += f"\n商品 {i+1}:\n"
            evaluation_prompt += f"型番: {info.get('model_number', '')}\n"
            
            if "title" in info and info["title"]:
                evaluation_prompt += f"商品名: {info['title']}\n"
            
            if "features" in info and info["features"]:
                evaluation_prompt += "特徴:\n" + "\n".join([f"- {feature}" for feature in info["features"]]) + "\n"
            
            if "description" in info and info["description"]:
                evaluation_prompt += f"説明: {info['description']}\n"
        
        evaluation_prompt += """
        回答形式：
        {
          "best_model_index": 選択した商品の番号（1から始まる整数）,
          "best_model_number": "選択した商品の型番",
          "reason": "選択した理由の詳細な説明",
          "evaluations": [
            {"model_number": "型番1", "score": 評価スコア（0-10）, "comment": "評価コメント"},
            {"model_number": "型番2", "score": 評価スコア（0-10）, "comment": "評価コメント"},
            ...
          ]
        }
        
        JSONフォーマットで回答してください。
        """
        
        try:
            response = requests.post(
                self.endpoint,
                headers=self.headers,
                json={
                    "model": "sonar",
                    "messages": [
                        {
                            "role": "system",
                            "content": "あなたは商品選定の専門家です。複数の商品から条件に最も合致するものを選び、その理由を詳しく説明してください。回答はJSON形式で提供してください。"
                        },
                        {
                            "role": "user",
                            "content": evaluation_prompt
                        }
                    ],
                    "max_tokens": 1000
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                evaluation_result = result["choices"][0]["message"]["content"].strip()
                
                # Try to parse the JSON response
                try:
                    import json
                    evaluation_data = json.loads(evaluation_result)
                    return {
                        "best_model_number": evaluation_data.get("best_model_number"),
                        "reason": evaluation_data.get("reason"),
                        "all_evaluations": evaluation_data.get("evaluations", [])
                    }
                except json.JSONDecodeError:
                    # If JSON parsing fails, try to extract the best model number using regex
                    import re
                    best_model_match = re.search(r'"best_model_number":\s*"([^"]+)"', evaluation_result)
                    reason_match = re.search(r'"reason":\s*"([^"]+)"', evaluation_result)
                    
                    best_model = best_model_match.group(1) if best_model_match else None
                    reason = reason_match.group(1) if reason_match else "Could not parse reason from response"
                    
                    return {
                        "best_model_number": best_model,
                        "reason": reason,
                        "all_evaluations": [],
                        "raw_response": evaluation_result
                    }
            else:
                print(f"API error: {response.status_code} - {response.text}")
                return {
                    "best_model_number": None,
                    "reason": f"API error: {response.status_code}",
                    "all_evaluations": []
                }
                
        except Exception as e:
            print(f"Error in API call: {e}")
            return {
                "best_model_number": None,
                "reason": f"Error: {str(e)}",
                "all_evaluations": []
            }

def main():
    """
    Main function to run the batch keyword generator from command line
    """
    if len(sys.argv) < 2:
        print("Usage: python batch_keyword_generator.py <input_file> [output_file] [custom_prompt_file]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "keywords_output.json"
    custom_prompt_file = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Read model numbers from input file
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            model_numbers = [line.strip() for line in f if line.strip()]
    except Exception as e:
        print(f"Error reading input file: {e}")
        sys.exit(1)
    
    # Read custom prompt if provided
    custom_prompt = None
    if custom_prompt_file:
        try:
            with open(custom_prompt_file, 'r', encoding='utf-8') as f:
                custom_prompt = f.read().strip()
        except Exception as e:
            print(f"Error reading custom prompt file: {e}")
            sys.exit(1)
    
    # Generate keywords
    generator = BatchKeywordGenerator()
    results = generator.batch_generate(model_numbers, custom_prompt)
    
    # Write results to output file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"Results written to {output_file}")
    except Exception as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 