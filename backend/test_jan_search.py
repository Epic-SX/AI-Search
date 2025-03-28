import os
import sys
import json
from dotenv import load_dotenv
from src.api.perplexity_client import perplexity_client
from src.comparison.price_compare import PriceComparisonEngine
from src.api.rakuten_api import rakuten_api

# Load environment variables
load_dotenv()

# Create a price comparison engine
price_comparison = PriceComparisonEngine()

def test_direct_search(jan_code):
    """Test searching directly with a JAN code"""
    print(f"Testing direct search with JAN code: {jan_code}")
    
    # First test Rakuten API directly
    print("\n=== Testing Rakuten API directly ===")
    rakuten_products = rakuten_api.get_product_details(jan_code)
    print(f"Found {len(rakuten_products)} products from Rakuten API")
    
    # Print the first product
    if rakuten_products and len(rakuten_products) > 0:
        product = rakuten_products[0]
        if hasattr(product, 'title'):
            # If it's a ProductDetail object
            print(f"First product: {product.title}")
            print(f"Price: {product.price}")
            print(f"URL: {product.url}")
            if hasattr(product, 'additional_info') and product.additional_info:
                print(f"Additional info: {json.dumps(product.additional_info, ensure_ascii=False, indent=2)}")
        elif isinstance(product, dict):
            # If it's a dictionary
            print(f"First product: {product.get('itemName', 'Unknown')}")
            print(f"Price: {product.get('itemPrice', 0)}")
            print(f"URL: {product.get('itemUrl', '')}")
            print(f"Additional info: {product}")
        else:
            print(f"Unknown product type: {type(product)}")
            print(f"Product: {product}")
    
    # Now test the price comparison engine
    print("\n=== Testing price comparison engine ===")
    products = price_comparison.get_detailed_products_direct(jan_code)
    
    # Count products by source
    sources = {}
    for product in products:
        if isinstance(product, dict):
            source = product.get('source', "Unknown")
        else:
            source = product.source if hasattr(product, 'source') else "Unknown"
        
        if source not in sources:
            sources[source] = 0
        sources[source] += 1
    
    # Print results
    print(f"Found {len(products)} products in total")
    print("Products by source:")
    for source, count in sources.items():
        print(f"  {source}: {count}")
    
    # Print a sample of products from each source
    for source in sources.keys():
        print(f"\nSample products from {source}:")
        
        # Filter products by source, handling both dict and object types
        if source == "Unknown":
            # For unknown source, include products without a source attribute
            sample = [p for p in products if 
                     (isinstance(p, dict) and p.get('source', "Unknown") == "Unknown") or
                     (not isinstance(p, dict) and not hasattr(p, 'source') or p.source == "Unknown")][:2]
        else:
            # For known sources, filter by that source
            sample = [p for p in products if 
                     (isinstance(p, dict) and p.get('source') == source) or
                     (not isinstance(p, dict) and hasattr(p, 'source') and p.source == source)][:2]
        
        for idx, product in enumerate(sample):
            # Display title and price based on object type
            if isinstance(product, dict):
                title = product.get('title', product.get('itemName', 'Unknown'))
                price = product.get('price', product.get('itemPrice', 0))
                print(f"  {idx+1}. {title} - ¥{price}")
                # Check for JAN code info
                if 'additional_info' in product and product['additional_info']:
                    jan_info = product['additional_info'].get('searched_by_jan', False)
                    print(f"     Searched by JAN: {jan_info}")
            else:
                title = product.title if hasattr(product, 'title') else 'Unknown'
                price = product.price if hasattr(product, 'price') else 0
                print(f"  {idx+1}. {title} - ¥{price}")
                # Check for JAN code info
                if hasattr(product, 'additional_info') and product.additional_info:
                    jan_info = product.additional_info.get('searched_by_jan', False)
                    print(f"     Searched by JAN: {jan_info}")

def test_model_to_jan(model_number):
    """Test getting JAN code from model number and then searching"""
    print(f"Testing model number to JAN code: {model_number}")
    
    # Get JAN code
    jan_code = perplexity_client.get_jan_code(model_number)
    
    if jan_code:
        print(f"Found JAN code: {jan_code}")
        # Test searching with the JAN code
        test_direct_search(jan_code)
    else:
        print(f"No JAN code found for {model_number}")

def main():
    if len(sys.argv) > 1:
        # Use command line argument as model number
        if sys.argv[1].isdigit() and (len(sys.argv[1]) == 8 or len(sys.argv[1]) == 13):
            # If it looks like a JAN code, test direct search
            test_direct_search(sys.argv[1])
        else:
            # Otherwise treat it as a model number
            test_model_to_jan(sys.argv[1])
    else:
        # Default test case
        # First test with a known JAN code
        test_direct_search("4549526608612")  # JAN code for Sony KDL-32W600D
        
        # Then test with a model number
        test_model_to_jan("EA715SE-10")

if __name__ == "__main__":
    main() 