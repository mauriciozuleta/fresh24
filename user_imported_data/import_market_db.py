import csv
import os
import django
import sys

# Setup Django environment
django_project_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(django_project_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'financialsim.settings')
django.setup()

from main.models import MarketDB

CSV_PATH = os.path.join(os.path.dirname(__file__), 'market_db.CSV')

def import_market_db():
    with open(CSV_PATH, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            MarketDB.objects.create(
                country_island=row['Country/Island'],
                supermarket=row['Supermarket'],
                website=row['Website'],
                platform=row['Platform'],
                scrapable=row['Scrapable'],
                product_selector=row['product_selector'],
                title_selector=row['title_selector'],
                price_selector=row['price_selector'],
                js_render=row['js_render'],
                scrape_method=row['scrape_method'],
                notes=row['Notes']
            )
    print('MarketDB table populated successfully.')

if __name__ == '__main__':
    import_market_db()
