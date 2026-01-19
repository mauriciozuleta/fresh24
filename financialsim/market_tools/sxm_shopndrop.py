def extract_weight_from_slug(slug):
    """
    Extracts weight/unit information from a product slug string.
    Example: 'chicken-breast-1kg' -> '1kg', 'beef-steak-500g' -> '500g'
    Returns empty string if not found.
    """
    import re
    match = re.search(r'(\d+(?:[.,]\d+)?\s?(?:kg|g|lb|oz|l|ml))', slug, re.IGNORECASE)
    return match.group(1) if match else ''
import sys
import re
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

SEARCH_URL = "https://www.shopndropgrocerysxm.com/search.asp?keyword={query}"


def search_products(query, limit=100):
    """Scrape all pages for a query, collecting products until no more are found."""
    results = []
    page_num = 1
    collected = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        while True:
            url = SEARCH_URL.format(query=query.replace(" ", "+")) + f"&page={page_num}"
            print(f"DEBUG: Scraping {url}")
            page = context.new_page()
            page.goto(url, timeout=30000)
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(3000)
            html = page.content()
            page.close()
            soup = BeautifulSoup(html, "html.parser")
            product_container = soup.find('div', class_='product-items')
            if not product_container:
                break
            name_divs = product_container.find_all('div', class_='name')
            if not name_divs:
                break
            for name_div in name_divs:
                if limit is not None and collected >= limit:
                    context.close()
                    browser.close()
                    return results
                link = name_div.find('a')
                if not link:
                    continue
                product_name = link.get_text(strip=True)
                product_href = link.get('href', '')
                if product_href and not product_href.startswith('http'):
                    product_url = 'https://www.shopndropgrocerysxm.com/' + product_href
                else:
                    product_url = product_href
                parent = name_div.parent
                price_div = parent.find('div', class_='price') if parent else None
                price = 'N/A'
                if price_div:
                    price_span = price_div.find('span', class_='shownprice')
                    if price_span:
                        price = price_span.get_text(strip=True)
                slug_match = re.search(r'/([^/]+)_p_\d+\.html', product_url)
                if not slug_match:
                    slug_match = re.search(r'([^/]+)_p_\d+\.html', product_url)
                slug = slug_match.group(1) if slug_match else product_name.replace(' ', '-')
                description = extract_weight_from_slug(slug)
                results.append({
                    'name': slug,
                    'price': price,
                    'description': description,
                    'url': product_url
                })
                collected += 1
            page_num += 1
        context.close()
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
        print(f"Name: {item['name']}, Price: {item['price']}, {item['description']}, URL: {item['url']}")
        csv_rows.append({
            'Name': item.get('name', ''),
            'Price': item.get('price', ''),
            'Description': item.get('description', ''),
            'URL': item.get('url', '')
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
