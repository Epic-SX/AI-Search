import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the AmazonAPI class
from src.api.amazon_api import AmazonAPI

def test_amazon_api():
    """
    Test the Amazon API functionality
    """
    print("Testing Amazon API...")
    
    # Create an instance of the AmazonAPI class
    amazon_api = AmazonAPI()
    
    # Test keywords
    test_keywords = [
        "EA628W-25B",  # From the example
        "ノートパソコン",  # Generic term
        "Apple MacBook Pro",  # Popular product
    ]
    
    for keyword in test_keywords:
        print(f"\nTesting search for: {keyword}")
        
        # Test the search functionality
        results = amazon_api._search_amazon_products(keyword, limit=2)
        
        if results:
            print(f"Found {len(results)} results:")
            for i, result in enumerate(results):
                print(f"  Result {i+1}:")
                print(f"    Title: {result.get('title', 'N/A')}")
                print(f"    Price: {result.get('price', 'N/A')}")
                print(f"    URL: {result.get('url', 'N/A')}")
                print(f"    Image: {result.get('image', 'N/A')}")
        else:
            print("No results found.")
        
        # Test the get_price functionality
        price_info = amazon_api.get_price(keyword)
        print("\nPrice information:")
        print(f"  Price: {price_info.get('price', 'N/A')}")
        print(f"  Title: {price_info.get('title', 'N/A')}")
        print(f"  URL: {price_info.get('url', 'N/A')}")
        print(f"  Shop: {price_info.get('shop', 'N/A')}")
        print(f"  Availability: {price_info.get('availability', 'N/A')}")
        
        print("\n" + "-"*50)

if __name__ == "__main__":
    test_amazon_api()