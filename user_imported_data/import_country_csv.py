import csv
import os
import django
import sys

# Setup Django environment
script_dir = os.path.dirname(__file__)
django_project_path = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.append(django_project_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'financialsim.settings')
django.setup()

from main.models import Country

csv_path = os.path.join(script_dir, 'country-code-to-currency-code-mapping.csv')

with open(csv_path, newline='', encoding='utf-8') as csvfile:
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
print('Country import complete.')
