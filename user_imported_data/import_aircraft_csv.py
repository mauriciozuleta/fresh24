import csv
import os
import django
import sys

# Setup Django environment
django_project_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(django_project_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'financialsim.settings')
django.setup()

from main.models import Aircraft

csv_path = os.path.join(os.path.dirname(__file__), 'aircraft_export.csv')

with open(csv_path, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        # Convert all numeric fields to float or int as needed
        for key in row:
            if row[key] == '':
                row[key] = None
            elif key not in ['aircraft_id', 'manufacturer', 'model', 'short_name']:
                try:
                    if 'positions' in key:
                        row[key] = int(float(row[key])) if row[key] is not None else None
                    else:
                        row[key] = float(row[key]) if row[key] is not None else None
                except Exception:
                    row[key] = None
        Aircraft.objects.update_or_create(
            aircraft_id=row['aircraft_id'],
            defaults={k: v for k, v in row.items() if k != 'aircraft_id'}
        )
print('Aircraft import complete.')
