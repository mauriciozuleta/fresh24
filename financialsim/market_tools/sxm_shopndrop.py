import sys
import re
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

SEARCH_URL = "https://www.shopndropgrocerysxm.com/search.asp?keyword={query}"


def extract_weight_from_slug(slug):
    """Extract weight/unit information from product slug"""
    # Pattern to match numbers followed by units
    # Matches: 11-oz, 2-lb, 500-g, 1-5-kg, 12-ct, etc.
    pattern = r'(\d+(?:-\d+)?-(?:oz|lb|lbs|g|kg|ml|l|ct|pk|pack|ea|each))'
    
    matches = re.findall(pattern, slug, re.IGNORECASE)
    
    if matches:
        # Return all matches joined if multiple found
        return ' '.join(matches)
    
    return 'N/A'


def search_products(query, limit=20):
    url = SEARCH_URL.format(query=query.replace(" ", "+"))
    
    print(f"DEBUG: Searching URL: {url}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Run with visible browser
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        
        page.goto(url, timeout=30000)
        page.wait_for_load_state("networkidle")
        
        # Wait a bit more for JavaScript to load products
        page.wait_for_timeout(3000)
        
        html = page.content()
        context.close()
        browser.close()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # Find all products in the container
    product_container = soup.find('div', class_='product-items')
    if not product_container:
        print("DEBUG: No product container found")
        return []
    
    print(f"DEBUG: Product container found: {product_container.get('class')}")
    
    # Products don't have a wrapper div - find all name divs directly
    name_divs = product_container.find_all('div', class_='name')
    print(f"DEBUG: Found {len(name_divs)} products with name divs")
    
    results = []
    for name_div in name_divs[:limit]:
        # Extract name and URL from <div class="name">
        link = name_div.find('a')
        if not link:
            continue
        
        product_name = link.get_text(strip=True)
        product_href = link.get('href', '')
        
        # Make absolute URL
        if product_href and not product_href.startswith('http'):
            product_url = 'https://www.shopndropgrocerysxm.com/' + product_href
        else:
            product_url = product_href
        
        # Find the price div - it's a sibling of the name div
        # Navigate to parent and find price div
        parent = name_div.parent
        price_div = parent.find('div', class_='price') if parent else None
        
        price = 'N/A'
        if price_div:
            price_span = price_div.find('span', class_='shownprice')
            if price_span:
                price = price_span.get_text(strip=True)
        
        # Extract name slug from URL (remove _p_ID.html part)
        slug_match = re.search(r'/([^/]+)_p_\d+\.html', product_url)
        if not slug_match:
            slug_match = re.search(r'([^/]+)_p_\d+\.html', product_url)
        
        slug = slug_match.group(1) if slug_match else product_name.replace(' ', '-')
        
        # Extract weight/unit from slug
        description = extract_weight_from_slug(slug)
        
        results.append({
            'name': slug,
            'price': price,
            'description': description,
            'url': product_url
        })
    
    return results


if __name__ == "__main__":
    query = input("Enter product name to search: ").strip()
    items = search_products(query)

    print("\n=== RESULTS ===")
    for item in items:
        print(f"Name: {item['name']}, Price: {item['price']}, {item['description']}, URL: {item['url']}")
