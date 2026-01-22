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

BASE_URL = "https://www.shopndropgrocerysxm.com/"
SEARCH_URL = BASE_URL + "search.asp?keyword={query}"
FRESH_FRUITS_CATEGORY_URL = BASE_URL + "Fresh-fruits-and-vegetables_c_161.html"

# Cache of navbar-based categories: normalized_key -> {key, top, sub, url}
_NAV_CATEGORY_MAP = None


def _normalize_query_key(query: str) -> str:
    """Normalize a query string for special-case routing.

    Lowercases and strips spaces/hyphens so that variants like
    "fresh fruits and vegetables" and "fresh-fruits-and-vegetables"
    map to the same key.
    """
    q = (query or "").lower()
    return re.sub(r"[\s\-]+", "", q)


def _scrape_product_list_from_page_html(html, results, collected, limit):
    """Given a product listing HTML page, extract products into results.

    Returns the updated collected count.
    """
    soup = BeautifulSoup(html, "html.parser")
    product_container = soup.find('div', class_='product-items')
    if not product_container:
        return collected
    name_divs = product_container.find_all('div', class_='name')
    if not name_divs:
        return collected
    for name_div in name_divs:
        if limit is not None and collected >= limit:
            return collected
        link = name_div.find('a')
        if not link:
            continue
        product_name = link.get_text(strip=True)
        product_href = link.get('href', '')
        if product_href and not product_href.startswith('http'):
            product_url = BASE_URL + product_href.lstrip('/')
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
    return collected


def _build_nav_category_map():
    """Build a mapping of navbar categories to subcategory URLs.

    Result keys are of the form "Top Label / Subcategory" (lowercased
    for lookup), e.g. "fruits & vegetables / apple".
    """
    global _NAV_CATEGORY_MAP
    result = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        print(f"DEBUG: Loading navbar from {BASE_URL}", flush=True)
        page.goto(BASE_URL, timeout=30000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        html = page.content()
        page.close()
        context.close()
        browser.close()

    soup = BeautifulSoup(html, "html.parser")
    nav_ul = soup.find('ul', id='categories')
    if not nav_ul:
        print("DEBUG: Navbar <ul id='categories'> not found", flush=True)
        _NAV_CATEGORY_MAP = result
        return result

    for li in nav_ul.find_all('li', class_='dropdown', recursive=False):
        # Top-level label, e.g. "Fruits & Vegetables"
        top_a = li.find('a', href=True)
        if not top_a:
            continue
        top_label = (top_a.get_text(strip=True) or '').strip()
        if not top_label:
            continue

        # Inner subcategories, anchors with class="subcat"
        for a in li.find_all('a', class_='subcat', href=True):
            sub_label = (a.get_text(strip=True) or '').strip()
            if not sub_label:
                continue
            href = (a.get('href') or '').strip()
            if not href:
                continue
            if not href.startswith('http'):
                full_url = BASE_URL + href.lstrip('/')
            else:
                full_url = href

            key = f"{top_label} / {sub_label}"
            norm_key = key.lower()
            if norm_key not in result:
                result[norm_key] = {
                    'key': key,
                    'top': top_label,
                    'sub': sub_label,
                    'url': full_url,
                }

    print(f"DEBUG: Built navbar category map with {len(result)} entries", flush=True)
    _NAV_CATEGORY_MAP = result
    return result


def _get_nav_category_map():
    """Return (and cache) the navbar category mapping."""
    global _NAV_CATEGORY_MAP
    if _NAV_CATEGORY_MAP is None:
        _NAV_CATEGORY_MAP = _build_nav_category_map()
    return _NAV_CATEGORY_MAP or {}


def get_nav_categories():

    """Public helper: return navbar categories grouped by top-level name.

    The structure is a list of dicts:

        [{"top": "Fruits & Vegetables", "subcategories": ["Apple", ...]}, ...]

    This is used by the Django admin/Market Analysis UI to build the
    primary (category) and secondary (subcategory) dropdowns for the
    sxm_shopndrop scraper.
    """

    nav_map = _get_nav_category_map()  # norm_key -> {key, top, sub, url}
    grouped = {}
    for info in nav_map.values():
        top = info.get('top') or ''
        sub = info.get('sub') or ''
        if not top or not sub:
            continue
        subs = grouped.setdefault(top, set())
        subs.add(sub)

    result = []
    for top, subs in sorted(grouped.items(), key=lambda kv: kv[0].lower()):
        result.append({
            'top': top,
            'subcategories': sorted(subs, key=lambda s: s.lower()),
        })
    return result


def _scrape_category_listing(category_url: str, limit=1000):
    """Scrape all products for a given category listing URL.

    Follows pagination using the standard `page` query parameter.
    """
    results = []
    collected = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page_num = 1
        while True:
            if limit is not None and collected >= limit:
                break
            if page_num == 1:
                page_url = category_url
            else:
                sep = '&' if '?' in category_url else '?'
                page_url = f"{category_url}{sep}page={page_num}"
            print(f"DEBUG: Scraping category listing {page_url}", flush=True)
            page = context.new_page()
            try:
                page.goto(page_url, timeout=30000)
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(2000)
            except Exception as e:
                print(f"DEBUG: Failed to load {page_url}: {e}", flush=True)
                page.close()
                break
            html = page.content()
            page.close()
            prev_collected = collected
            collected = _scrape_product_list_from_page_html(html, results, collected, limit)
            if collected == prev_collected:
                # No new products on this page; stop pagination.
                break
            page_num += 1
        context.close()
        browser.close()
    return results


def _search_fresh_fruits_and_vegetables(limit=1000):
    """Special scraper for the Fresh fruits and vegetables catalog.

    Starts from the catalog page, discovers all subcategory links in the
    <div class="subcategories"> block, then visits each subcategory and
    scrapes its product listings.
    """
    results = []
    collected = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        # Load the main Fresh fruits and vegetables catalog page
        page = context.new_page()
        print(f"DEBUG: Scraping Fresh fruits catalog {FRESH_FRUITS_CATEGORY_URL}", flush=True)
        page.goto(FRESH_FRUITS_CATEGORY_URL, timeout=30000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)
        html = page.content()
        page.close()
        soup = BeautifulSoup(html, "html.parser")
        subcats_div = soup.find('div', class_='subcategories')
        if not subcats_div:
            print("DEBUG: No subcategories block found on Fresh fruits page", flush=True)
            context.close()
            browser.close()
            return results

        subcat_urls = []
        for a in subcats_div.find_all('a', href=True):
            href = a.get('href')
            if not href:
                continue
            if '_c_' not in href:
                continue
            if not href.startswith('http'):
                full_url = BASE_URL + href.lstrip('/')
            else:
                full_url = href
            if full_url not in subcat_urls:
                subcat_urls.append(full_url)

        print(f"DEBUG: Found {len(subcat_urls)} Fresh fruits subcategories", flush=True)

        for subcat_url in subcat_urls:
            page_num = 1
            while True:
                if limit is not None and collected >= limit:
                    context.close()
                    browser.close()
                    return results
                # Append page parameter if needed
                if page_num == 1:
                    page_url = subcat_url
                else:
                    sep = '&' if '?' in subcat_url else '?'
                    page_url = f"{subcat_url}{sep}page={page_num}"
                print(f"DEBUG: Scraping Fresh fruits subcategory {page_url}", flush=True)
                page = context.new_page()
                try:
                    page.goto(page_url, timeout=30000)
                    page.wait_for_load_state("networkidle")
                    page.wait_for_timeout(2000)
                except Exception as e:
                    print(f"DEBUG: Failed to load {page_url}: {e}", flush=True)
                    page.close()
                    break
                html = page.content()
                page.close()
                prev_collected = collected
                collected = _scrape_product_list_from_page_html(html, results, collected, limit)
                if collected == prev_collected:
                    # No products found on this page, stop paging this subcategory
                    break
                page_num += 1

        context.close()
        browser.close()
    return results


def search_products(query, limit=100):
    """Scrape all pages for a query, collecting products until no more are found.

    Primary mode for integration with the app is *category-based*:
    - Query strings like "Fruits & Vegetables / Apple" will be matched
      against the navbar-derived category map, and the corresponding
      subcategory catalog will be scraped.

    For the legacy special case "fresh fruits and vegetables", we crawl
    the catalog hierarchy instead of using the search endpoint, because the
    products live exclusively under that category.
    """
    query = (query or '').strip()
    if not query:
        return []

    # 1) Navbar category-based routing, e.g. "Fruits & Vegetables / Apple"
    nav_map = _get_nav_category_map()
    q_key = query.lower()
    if q_key in nav_map:
        cat = nav_map[q_key]
        print(f"DEBUG: Using navbar category scraper for {cat['key']}", flush=True)
        return _scrape_category_listing(cat['url'], limit=limit)

    # 2) Special-case routing for the Fresh fruits and vegetables catalog
    key = _normalize_query_key(query)
    if key == 'freshfruitsandvegetables':
        return _search_fresh_fruits_and_vegetables(limit=limit)

    # 3) Fallback to search endpoint for any other free-text usage
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
            print(f"DEBUG: Scraping {url}", flush=True)
            page = context.new_page()
            page.goto(url, timeout=30000)
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(3000)
            html = page.content()
            page.close()
            prev_collected = collected
            collected = _scrape_product_list_from_page_html(html, results, collected, limit)
            if collected == prev_collected:
                # No more products on this page, stop.
                break
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
