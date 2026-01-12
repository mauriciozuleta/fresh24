import requests
from bs4 import BeautifulSoup
import urllib.parse
import re

def search_product(product_name):
    # Build search URL
    base_url = "https://centralsupercenter.com/?s="
    query = urllib.parse.quote(product_name)
    search_url = base_url + query

    # Fetch page
    response = requests.get(search_url, headers={
        "User-Agent": "Mozilla/5.0"
    })

    if response.status_code != 200:
        print("Error fetching page:", response.status_code)
        return None

    soup = BeautifulSoup(response.text, "html.parser")

    # Find all product links that look like product pages
    anchors = soup.find_all('a', href=True)
    search_term = product_name.lower()
    results = []
    
    for a in anchors:
        href = a['href']
        text = a.get_text(strip=True)
        # Check if this is a product link
        if '/shop/' in href and text:
            # Try to find price
            price_tag = a.find_next('span', class_='woocommerce-Price-amount')
            price = price_tag.text.strip() if price_tag else "N/A"
            
            # Extract name from URL (convert to slug format like xm_scrapper)
            url_parts = href.rstrip('/').split('/')
            if url_parts:
                name_slug = url_parts[-1]  # Get last part of URL as name
            else:
                name_slug = text.lower().replace(' ', '-')
            
            # Get description (empty for now, can be enhanced later)
            description = "N/A"
            
            results.append({
                "name": name_slug,
                "price": price,
                "description": description,
                "url": href
            })

    return results


import sys

if __name__ == "__main__":
    if len(sys.argv) > 1:
        product = " ".join(sys.argv[1:])
    else:
        try:
            product = input("Enter product name to search: ")
        except EOFError:
            print("No input provided. Exiting.")
            sys.exit(1)

    results = search_product(product)

    if results:
        print("\n=== RESULTS ===")
        for item in results:
            print(f"Name: {item['name']}, Price: {item['price']}, {item['description']}, URL: {item['url']}")
    else:
        print("No result found.")
