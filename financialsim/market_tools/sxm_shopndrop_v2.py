def extract_weight_from_slug(slug):
    """
    Extracts weight/unit information from a product slug string.
    Example: 'chicken-breast-1kg' -> '1kg', 'beef-steak-500g' -> '500g'
    Returns empty string if not found.
    """
    import re
    match = re.search(r'(\d+(?:[.,]\d+)?\s?(?:kg|g|lb|oz|l|ml))', slug, re.IGNORECASE)
    return match.group(1) if match else ''
# Debug version: prints only navbar options
import re
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

BASE_URL = "https://www.shopndropgrocerysxm.com/"


def print_navbar_options():
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
        return

    options = {}
    for li in nav_ul.find_all('li', class_='dropdown', recursive=False):
        top_a = li.find('a', href=True)
        if not top_a:
            continue
        top_label = (top_a.get_text(strip=True) or '').strip()
        for a in li.find_all('a', class_='subcat', href=True):
            sub_label = (a.get_text(strip=True) or '').strip()
            href = (a.get('href') or '').strip()
            if not href:
                continue
            if not href.startswith('http'):
                full_url = BASE_URL + href.lstrip('/')
            else:
                full_url = href
            key = f"{top_label} / {sub_label}"
            options[key] = full_url
    return options

def print_products_in_subcategory(subcat_url):
    products = []
    seen_urls = set()
    page_num = 1
    max_pages = 50  # Safety limit to prevent infinite loops

    while page_num <= max_pages:
        # Construct paginated URL
        if page_num == 1:
            page_url = subcat_url
        else:
            if subcat_url.endswith('.html'):
                page_url = subcat_url.replace('.html', f'-{page_num}.html')
            else:
                page_url = f"{subcat_url}-{page_num}.html"

        print(f"DEBUG: Scraping page {page_num} -> {page_url}", flush=True)

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = context.new_page()
            page.goto(page_url, timeout=30000)
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
            html = page.content()
            page.close()
            context.close()
            browser.close()

        soup = BeautifulSoup(html, "html.parser")
        product_container = soup.find('div', class_='product-items')
        if not product_container:
            print("DEBUG: No product container found, stopping.", flush=True)
            break

        name_divs = product_container.find_all('div', class_='name')
        if not name_divs:
            break
        for name_div in name_divs:
            name = name_div.get_text(strip=True)
            parent = name_div.find_parent('div', class_='product-item')
            price = ''
            desc = ''
            url = ''
            if parent:
                price_div = parent.find('div', class_='price')
                price = price_div.get_text(strip=True) if price_div else ''
                desc_div = parent.find('div', class_='description')
                desc = desc_div.get_text(strip=True) if desc_div else ''
                a_tag = parent.find('a', href=True)
                url = a_tag['href'] if a_tag and a_tag.has_attr('href') else ''
            products.append({
                'Name': name,
                'Price': price,
                'Description': desc,
                'URL': url
            })
            seen_urls.add(url)
        page_num += 1
    return products
