import os
import sys

import django


# --- Django setup to use MarketDB ---
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "financialsim.settings")
django.setup()

from main.models import MarketDB
from operational_functions.scrapers import (
    search_woocommerce,
    search_shopify,
    search_custom_html,
    search_js_rendered,
)


def search_product_across_markets(product_name: str):
    """Dispatch search per supermarket based on platform in MarketDB."""
    all_results = []

    markets = MarketDB.objects.all()
    for market in markets:
        platform = (market.platform or "").lower()
        scrapable = (market.scrapable or "").lower()
        scrape_method = (market.scrape_method or "").lower()

        if scrapable != "yes":
            continue

        if platform == "js" or "js" in scrape_method:
            results = search_js_rendered(market, product_name)
        elif platform == "woocommerce":
            results = search_woocommerce(market, product_name)
        elif platform == "shopify":
            results = search_shopify(market, product_name)
        else:
            # Treat anything else as Custom HTML with selectors
            results = search_custom_html(market, product_name)

        all_results.extend(results)

    return all_results


def main():
    if len(sys.argv) > 1:
        product = " ".join(sys.argv[1:])
    else:
        try:
            product = input("Enter product name to search: ")
        except EOFError:
            print("No input provided. Exiting.")
            sys.exit(1)

    if not product:
        print("No product provided. Exiting.")
        sys.exit(1)

    results = search_product_across_markets(product)

    if results:
        print("\n=== RESULTS ===")
        for item in results:
            print("Country:", item["country"])
            print("Supermarket:", item["supermarket"])
            print("Product:", item["title"])
            print("Price:", item["price"])
            print("Search URL:", item["search_url"])
            print("----------------")
        print("================\n")
    else:
        print("No result found.")


if __name__ == "__main__":
    main()