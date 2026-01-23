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
            print("DEBUG: No product name divs found, stopping.", flush=True)
            break

        new_on_page = 0
        for name_div in name_divs:
            link = name_div.find('a')
            if not link:
                continue
            product_name = link.get_text(strip=True)
            product_href = link.get('href', '')
            if product_href and not product_href.startswith('http'):
                product_url = BASE_URL + product_href.lstrip('/')
            else:
                product_url = product_href

            # If we've already seen this product URL, skip it
            if product_url in seen_urls:
                continue
            seen_urls.add(product_url)

            parent = name_div.parent
            price_div = parent.find('div', class_='price') if parent else None
            price = 'N/A'
            if price_div:
                price_span = price_div.find('span', class_='shownprice')
                if price_span:
                    price = price_span.get_text(strip=True)

            description = extract_weight_from_slug(product_name)
            print(f"Name: {product_name}, Price: {price}, {description}, URL: {product_url}")
            products.append({
                'Name': product_name,
                'Price': price,
                'Description': description,
                'URL': product_url
            })
            new_on_page += 1

        if new_on_page == 0:
            print("DEBUG: No new products on this page, stopping.", flush=True)
            break

        page_num += 1

    # Save to CSV in the same folder, one per category, appending products if file exists
    if products:
        import csv
        import os
        # Get the top-level category from the selected subcategory key
        # We'll pass the category name as an argument to this function
        import inspect
        frame = inspect.currentframe().f_back
        category_name = frame.f_locals.get('category_name', None)
        if not category_name:
            # fallback: try to parse from URL (not as robust)
            category_name = 'unknown'
        cat_part = category_name.replace(' ', '').replace('&', 'and').replace('/', '').replace('-', '').lower()
        csv_filename = os.path.join(
            os.path.dirname(__file__),
            f"sxm_shopndrop-{cat_part}.csv"
        )
        # Read existing products if file exists, to avoid duplicates
        existing_urls = set()
        if os.path.exists(csv_filename):
            with open(csv_filename, 'r', encoding='utf-8', newline='') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    if 'URL' in row:
                        existing_urls.add(row['URL'])
        # Filter out products already in the file
        new_products = [p for p in products if p['URL'] not in existing_urls]
        write_header = not os.path.exists(csv_filename)
        with open(csv_filename, 'a', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=['Name', 'Price', 'Description', 'URL'])
            if write_header:
                writer.writeheader()
            writer.writerows(new_products)
        print(f"\nResults added to {csv_filename} ({len(new_products)} new products)")

if __name__ == "__main__":
    options = print_navbar_options()
    if not options:
        print("No navbar options found.")
        exit(1)
    print("Available subcategories:")
    for idx, key in enumerate(options.keys()):
        print(f"[{idx}] {key}")
    sel = input("Select a subcategory by number: ").strip()
    try:
        sel_idx = int(sel)
        subcat_key = list(options.keys())[sel_idx]
        subcat_url = options[subcat_key]
        # Extract the top-level category from the subcat_key (format: 'Category / Subcategory')
        category_name = subcat_key.split(' / ')[0]
        print(f"\nProducts in: {subcat_key}\n")
        print_products_in_subcategory(subcat_url)
    except Exception as e:
        print(f"Invalid selection: {e}")
