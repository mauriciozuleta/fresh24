import urllib.parse

import requests
from bs4 import BeautifulSoup
import urllib3

# Disable SSL warnings for sites with certificate issues
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {"User-Agent": "Mozilla/5.0"}


def search_custom_html(market, product_name: str):
    """Generic HTML search using selectors from MarketDB for Custom platforms.

    Expects a `market` object with attributes:
    - country_island
    - supermarket
    - website
    - product_selector, title_selector, price_selector
    """
    base = market.website.rstrip("/")
    query = urllib.parse.quote(product_name)
    search_url = f"{base}/?s={query}"

    print(f"\n[{market.country_island} - {market.supermarket}] Searching (Custom): {search_url}\n")

    try:
        response = requests.get(search_url, headers=HEADERS, timeout=15, verify=False)
    except requests.RequestException as exc:
        print(f"  Error fetching page: {exc}")
        return []

    if response.status_code != 200:
        print("  Error fetching page:", response.status_code)
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    product_selector = (getattr(market, "product_selector", "") or "").strip()
    title_selector = (getattr(market, "title_selector", "") or "").strip()
    price_selector = (getattr(market, "price_selector", "") or "").strip()

    if not product_selector:
        print("  No product selector defined; skipping.")
        return []

    search_term = product_name.lower()
    
    containers = soup.select(product_selector)
    if not containers:
        print("  No product containers found with selector:", product_selector)
        # Fallback: scan all links containing the search term
        print("  Trying fallback link-based search...")
        anchors = soup.find_all("a", href=True)
        results = []
        for a in anchors:
            text = a.get_text(strip=True)
            if not text or search_term not in text.lower():
                continue
            # Try to find nearby price
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

    for c in containers:
        title = None
        price = None

        if title_selector:
            title_el = c.select_one(title_selector)
            if title_el:
                title = title_el.get_text(strip=True)

        if not title or search_term not in title.lower():
            continue

        if price_selector:
            price_el = c.select_one(price_selector)
            if price_el:
                price = price_el.get_text(strip=True)

        if not price:
            price = "Price not found"

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
