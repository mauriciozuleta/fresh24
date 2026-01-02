import csv
import os
import django
import sys

# Setup Django environment
django_project_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(django_project_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'financialsim.settings')
django.setup()

from main.models import Product, Country

CSV_PATH = os.path.join(django_project_path, 'user_imported_data', 'products_export.csv')

def get_country(country_code):
    try:
        return Country.objects.get(country_code=country_code)
    except Country.DoesNotExist:
        return None

def import_products():
    with open(CSV_PATH, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            country = get_country(row['country_id'])
            if not country:
                print(f"Country not found for code: {row['country_id']}, skipping product {row['product_code']}")
                continue
            Product.objects.update_or_create(
                product_code=row['product_code'],
                defaults={
                    'product_type': row['product_type'],
                    'name': row['name'],
                    'country': country,
                    'trade_unit': row['trade_unit'],
                    'fca_cost_per_wu': row['fca_cost_per_wu'] or 0,
                    'packaging': row['packaging'],
                    'packaging_weight': row['packaging_weight'] or 0,
                    'units_per_pack': row['units_per_pack'] or 0,
                    'packaging_cost': row['packaging_cost'] or 0,
                    'other_info': row['other_info'],
                    'currency': row['currency'],
                }
            )
            print(f"Imported/Updated: {row['product_code']} - {row['name']}")

if __name__ == '__main__':
    import_products()
    print('Product import complete.')
