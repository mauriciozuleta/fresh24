import requests
from bs4 import BeautifulSoup
import urllib.parse
import re

def search_product(product_name):
    # Build search URL
    base_url = "https://centralsupercenter.com/?s="
    query = urllib.parse.quote(product_name)
    results = []
    page_num = 1
    while True:
        search_url = base_url + query + f"&page={page_num}"
        print(f"DEBUG: Scraping {search_url}")
        response = requests.get(search_url, headers={
            "User-Agent": "Mozilla/5.0"
        })
        if response.status_code != 200:
            print("Error fetching page:", response.status_code)
            break
        soup = BeautifulSoup(response.text, "html.parser")
        anchors = soup.find_all('a', href=True)
        found = False
        for a in anchors:
            href = a['href']
            text = a.get_text(strip=True)
            if '/shop/' in href and text:
                found = True
                price_tag = a.find_next('span', class_='woocommerce-Price-amount')
                price = price_tag.text.strip() if price_tag else "N/A"
                url_parts = href.rstrip('/').split('/')
                if url_parts:
                    name_slug = url_parts[-1]
                else:
                    name_slug = text.lower().replace(' ', '-')
                description = "N/A"
                results.append({
                    "name": name_slug,
                    "price": price,
                    "description": description,
                    "url": href
                })
        if not found:
            break
        page_num += 1
    return results


def search_products(query, limit=20):
    """Wrapper used by the diagnosis engine.

    Exposes a consistent search_products(query, limit) API and
    always returns a list (possibly empty).
    """

    results = search_product(query) or []
    if limit is not None:
        return results[:limit]
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

    import csv
    import os
    if results:
        print("\n=== RESULTS ===")
        csv_rows = []
        for item in results:
            print(f"Name: {item['name']}, Price: {item['price']}, {item['description']}, URL: {item['url']}")
            csv_rows.append({
                'Name': item.get('name', ''),
                'Price': item.get('price', ''),
                'Description': item.get('description', ''),
                'URL': item.get('url', '')
            })
        # Save to CSV in the same folder
        from datetime import datetime
        date_str = datetime.now().strftime('%m-%d-%Y')
        scraper_name = os.path.splitext(os.path.basename(__file__))[0]
        csv_filename = os.path.join(
            os.path.dirname(__file__),
            f"{scraper_name}_{product}_{date_str}.csv"
        )
        with open(csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=['Name', 'Price', 'Description', 'URL'])
            writer.writeheader()
            writer.writerows(csv_rows)
        print(f"\nResults also saved to {csv_filename}")
    else:
        print("No result found.")
