import urllib.parse

import requests
from bs4 import BeautifulSoup
import urllib3

# Disable SSL warnings for sites with certificate issues
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {"User-Agent": "Mozilla/5.0"}


def search_shopify(market, product_name: str):
    """Basic Shopify search implementation using MarketDB info.

    Expects a `market` object with attributes:
    - country_island
    - supermarket
    - website
    - product_selector, title_selector, price_selector (optional overrides)
    """
    base = market.website.rstrip("/")
    query = urllib.parse.quote(product_name)
    search_url = f"{base}/search?q={query}"

    print(f"\n[{market.country_island} - {market.supermarket}] Searching (Shopify): {search_url}\n")

    try:
        response = requests.get(search_url, headers=HEADERS, timeout=15, verify=False)
    except requests.RequestException as exc:
        print(f"  Error fetching page: {exc}")
        return []

    if response.status_code != 200:
        print("  Error fetching page:", response.status_code)
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    product_selector = (getattr(market, "product_selector", "div.product-grid-item") or "div.product-grid-item").strip()
    title_selector = (getattr(market, "title_selector", "h2.product-title") or "h2.product-title").strip()
    price_selector = (getattr(market, "price_selector", "span.price-item") or "span.price-item").strip()

    containers = soup.select(product_selector)
    if not containers:
        print("  No product containers found with selector:", product_selector)
        # Fallback: try common Shopify patterns
        print("  Trying fallback Shopify patterns...")
        containers = soup.select("div.product-item, div.grid-product, div.product-card")
        if not containers:
            # Last resort: scan links
            anchors = soup.find_all("a", href=True)
            results = []
            search_term = product_name.lower()
            for a in anchors:
                text = a.get_text(strip=True)
                if not text or search_term not in text.lower():
                    continue
                if "/product" in a["href"] or "/collections/" in a["href"]:
                    price = "Price not found"
                    parent = a.parent
                    if parent:
                        price_spans = parent.find_all(["span", "div"], class_=lambda c: c and ("price" in c.lower() if isinstance(c, str) else False))
                        if price_spans:
                            price = price_spans[0].get_text(strip=True)
                    results.append(
                        {
                            "country": market.country_island,
                            "supermarket": market.supermarket,
                            "title": text,
                            "price": price,
                            "search_url": search_url,
                        }
                    )
            return results

    results = []
    search_term = product_name.lower()

    for c in containers:
        title_el = c.select_one(title_selector)
        if not title_el:
            continue
        title = title_el.get_text(strip=True)
        if not title or search_term not in title.lower():
            continue

        price_el = c.select_one(price_selector)
        price = price_el.get_text(strip=True) if price_el else "Price not found"

        results.append(
            {
                "country": market.country_island,
                "supermarket": market.supermarket,
                "title": title,
                "price": price,
                "search_url": search_url,
            }
        )

    return results
