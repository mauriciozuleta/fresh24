import sys
import re
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

SEARCH_URL = "https://www.sxmleshalles.com/en/search?controller=search&s={query}"

PRODUCT_SELECTOR = "article.product-miniature"
TITLE_SELECTOR = "h3.h3.product-title a"
PRICE_SELECTOR = "span.price"
IMAGE_SELECTOR = "img"


def extract_weight(text):
    """Extract weight/presentation from text like '1 x 15 oz' or '500 g'"""
    # Try to match patterns like "1 x 15 oz", "2 x 500 ml", "500 g", "2 x 250 gr approx.", etc.
    pattern = r"(\d+\s?x\s?\d+\.?\d*\s?(kg|gr|g|lbs|lb|oz|ml|l|cl)|\d+\.?\d*\s?(kg|gr|g|lbs|lb|oz|ml|l|cl))"
    match = re.search(pattern, text.lower())
    return match.group(0) if match else None


def find_product_page_url(product_name):
    """Search for a product by name and get its detail page URL"""
    # Convert image filename to search query (replace hyphens with spaces)
    search_query = product_name.replace("-", " ")
    url = SEARCH_URL.format(query=search_query.replace(" ", "+"))
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        page.goto(url, timeout=30000)
        page.wait_for_load_state("networkidle")
        
        # Wait a bit more for JS to render products
        page.wait_for_timeout(2000)
        
        html = page.content()
        browser.close()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # Look for links with class "thumbnail product-thumbnail"
    product_links = soup.find_all('a', class_='thumbnail product-thumbnail', href=True)
    
    if product_links:
        return product_links[0]['href']
    
    # Fallback: Try to find any link that matches product URL pattern
    product_pattern = re.compile(r'/en/[\w-]+/\d+-[\w-]+\.html')
    all_links = soup.find_all('a', href=True)
    
    for link in all_links:
        href = link['href']
        if product_pattern.search(href):
            return href
    
    return None


def get_product_weight(product_url):
    """Visit product detail page and extract its weight/presentation"""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        page.goto(product_url, timeout=30000)
        page.wait_for_load_state("networkidle")
        
        html = page.content()
        browser.close()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # First try to get the full product description content
    desc_div = soup.select_one("div.product-description")
    if desc_div:
        # Get all text, clean up whitespace, join multiple lines with comma
        text = desc_div.get_text(separator=" ", strip=True)
        # Clean up extra spaces
        text = re.sub(r'\s+', ' ', text).strip()
        if text:
            return text
    
    # Fallback to other selectors if description not found
    selectors_to_try = [
        "h1.h1",
        "h1",
        "div.product-information",
        "span.product-subtitle",
        "div.product-description-short",
    ]
    
    for selector in selectors_to_try:
        element = soup.select_one(selector)
        if element:
            text = element.get_text(separator=" ", strip=True)
            text = re.sub(r'\s+', ' ', text).strip()
            if text:
                return text
    
    return None


def search_products(query, limit=100):
    """Scrape all pages for a query, collecting products until no more are found."""
    results = []
    page_num = 1
    collected = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        while True:
            url = SEARCH_URL.format(query=query.replace(" ", "+")) + f"&page={page_num}"
            print(f"DEBUG: Scraping {url}")
            page = browser.new_page()
            page.goto(url, timeout=30000)
            page.wait_for_load_state("networkidle")
            html = page.content()
            page.close()
            soup = BeautifulSoup(html, "html.parser")
            products = soup.select(PRODUCT_SELECTOR)
            if not products:
                break
            for product in products:
                if limit is not None and collected >= limit:
                    browser.close()
                    return results
                title_el = product.select_one(TITLE_SELECTOR)
                price_el = product.select_one(PRICE_SELECTOR)
                img_el = product.select_one(IMAGE_SELECTOR)
                title = title_el.text.strip() if title_el else "Unknown"
                price = price_el.text.strip() if price_el else "N/A"
                product_url = title_el["href"] if title_el and title_el.has_attr("href") else None
                image = img_el["src"] if img_el else None
                jpg_name = None
                if image:
                    match = re.search(r"/([^/]+)\.jpg", image)
                    if match:
                        jpg_name = match.group(1)
                weight = extract_weight(title) if title else None
                results.append({
                    "name": jpg_name,
                    "price": price,
                    "weight": weight,
                    "url": product_url,
                    "title": title
                })
                collected += 1
            page_num += 1
        browser.close()
    return results


if __name__ == "__main__":
    query = input("Enter product name to search: ").strip()
    items = search_products(query)

    print("\n=== RESULTS ===")

    import csv
    import os
    csv_rows = []
    for item in items:
        description = item.get('weight')
        product_page_url = item.get('url')
        # If no description in title (or empty string), get it from product page
        if (not description or not description.strip()):
            if not product_page_url and item.get('name'):
                product_page_url = find_product_page_url(item['name'])
            if product_page_url:
                description = get_product_weight(product_page_url)
        description = description or 'N/A'
        url = product_page_url or 'N/A'
        print(f"Name: {item['name']}, Price: {item['price']}, {description}, URL: {url}")
        csv_rows.append({
            'Name': item.get('name', ''),
            'Price': item.get('price', ''),
            'Description': description,
            'URL': url
        })

    # Save to CSV in the same folder
    if items:
        from datetime import datetime
        date_str = datetime.now().strftime('%m-%d-%Y')
        scraper_name = os.path.splitext(os.path.basename(__file__))[0]
        csv_filename = os.path.join(
            os.path.dirname(__file__),
            f"{scraper_name}_{query}_{date_str}.csv"
        )
        with open(csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=['Name', 'Price', 'Description', 'URL'])
            writer.writeheader()
            writer.writerows(csv_rows)
        print(f"\nResults also saved to {csv_filename}")