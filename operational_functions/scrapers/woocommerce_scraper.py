import urllib.parse

import requests
from bs4 import BeautifulSoup
import urllib3

# Disable SSL warnings for sites with certificate issues
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {"User-Agent": "Mozilla/5.0"}


def search_woocommerce(market, product_name: str):
    """WooCommerce scraper using the proven Central Supercenter pattern.

    Expects a `market` object with attributes:
    - country_island
    - supermarket
    - website
    - product_selector (optional)
    - title_selector (optional)
    - price_selector (optional)
    """
    base_url = market.website.rstrip("/") + "/?s="
    query = urllib.parse.quote(product_name)
    search_url = base_url + query

    print(f"\n[{market.country_island} - {market.supermarket}] Searching: {search_url}\n")

    try:
        response = requests.get(search_url, headers=HEADERS, timeout=15, verify=False)
    except requests.RequestException as exc:
        print(f"  Error fetching page: {exc}")
        return []

    if response.status_code != 200:
        print("  Error fetching page:", response.status_code)
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    search_term = product_name.lower()
    results = []

    # First: try container-based selectors from MarketDB (if provided)
    product_selector = (getattr(market, "product_selector", "") or "").strip()
    title_selector = (getattr(market, "title_selector", "") or "").strip()
    price_selector = (getattr(market, "price_selector", "") or "").strip()

    if product_selector and title_selector:
        containers = soup.select(product_selector)
        for c in containers:
            title_el = c.select_one(title_selector)
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title:
                continue
            if search_term not in title.lower():
                continue

            price = "Price not found"
            if price_selector:
                price_el = c.select_one(price_selector)
                if price_el:
                    text_val = price_el.get_text(strip=True)
                    if text_val:
                        price = text_val

            results.append(
                {
                    "country": market.country_island,
                    "supermarket": market.supermarket,
                    "title": title,
                    "price": price,
                    "search_url": search_url,
                }
            )

    if results:
        return results

    # Fallback: anchor-based pattern that works for Central Supercenter
    anchors = soup.find_all("a", href=True)

    # Primary: product links that match the search term
    for a in anchors:
        href = a["href"]
        text = a.get_text(strip=True)
        if not text:
            continue
        if "/shop/" in href and search_term in text.lower():
            price_tag = a.find_next("span", class_="woocommerce-Price-amount")
            price = price_tag.text.strip() if price_tag else "Price not found"
            results.append(
                {
                    "country": market.country_island,
                    "supermarket": market.supermarket,
                    "title": text,
                    "price": price,
                    "search_url": search_url,
                }
            )

    if results:
        return results

    # Fallback: all /shop/ products on the page (still skip empty titles)
    for a in anchors:
        href = a["href"]
        text = a.get_text(strip=True)
        if not text:
            continue
        if "/shop/" in href:
            price_tag = a.find_next("span", class_="woocommerce-Price-amount")
            price = price_tag.text.strip() if price_tag else "Price not found"
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
