
import os
import django
import csv
from django.db import transaction

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'financialsim.settings')
django.setup()

from main.models import Country

CSV_PATH = 'user_imported_data/country-code-to-currency-code-mapping.csv'

@transaction.atomic
def import_countries():
    with open(CSV_PATH, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            Country.objects.update_or_create(
                country_code=row['CountryCode'],
                defaults={
                    'name': row['Country'],
                    'currency': row['Currency'],
                    'currency_code': row['Code'],
                    'region': row['Region'],
                }
            )

if __name__ == '__main__':
    import_countries()
    print('Countries imported.')
