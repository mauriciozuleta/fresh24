import csv
from django.core.management.base import BaseCommand
from main.models import Product, Country
from django.utils import timezone

class Command(BaseCommand):
    help = 'Populate the Product table from multiple CSVs (Colombia and USA meat prices).'

    def handle(self, *args, **options):
        csv_files = [
            'financialsim/market_tools/colombia_export_prices.csv',
            'financialsim/market_tools/usa_pork_prices.csv',
            'financialsim/market_tools/usa_beef_prices.csv',
            'financialsim/market_tools/usa_chicken_prices.csv',
            'financialsim/market_tools/usa_lamb_prices.csv',
        ]
        count = 0
        for file_path in csv_files:
            with open(file_path, newline='', encoding='latin-1') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    try:
                        # Clean and parse fields
                        product_code = row.get('product_code', '').strip()
                        product_type = row.get('product_type', '').strip()
                        name = row.get('name', '').strip()
                        country_name = row.get('country', '').strip()
                        trade_unit = row.get('trade_unit', '').strip()
                        def clean_num(val):
                            if not val:
                                return 0
                            return float(str(val).replace(',', '').replace('"', '').replace('\u2013', '-').strip())
                        fca_cost_per_wu = clean_num(row.get('fca_cost_per_wu', '0'))
                        packaging = row.get('packaging', '').strip()
                        packaging_weight = clean_num(row.get('packaging_weight', '0'))
                        # Handle column with possible space typo
                        units_per_pack = row.get('units _per_pack') or row.get('units_per_pack') or row.get('units_per_pack', '0')
                        try:
                            units_per_pack = int(str(units_per_pack).replace(',', '').replace('"', '').strip())
                        except Exception:
                            units_per_pack = 0
                        packaging_cost = clean_num(row.get('packaging_cost', '0'))
                        other_info = row.get('other_info', '').strip()
                        currency = row.get('currency', '').strip()

                        # Get or create country (case-insensitive)
                        country_obj, _ = Country.objects.get_or_create(name__iexact=country_name, defaults={'name': country_name})

                        Product.objects.create(
                            product_code=product_code,
                            product_type=product_type,
                            name=name,
                            country=country_obj,
                            trade_unit=trade_unit,
                            fca_cost_per_wu=fca_cost_per_wu,
                            packaging=packaging,
                            packaging_weight=packaging_weight,
                            units_per_pack=units_per_pack,
                            packaging_cost=packaging_cost,
                            other_info=other_info,
                            currency=currency,
                            created_at=timezone.now(),
                            updated_at=timezone.now()
                        )
                        count += 1
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"Skipped row in {file_path} due to error: {e} | Row: {row}"))
        self.stdout.write(self.style.SUCCESS(f'Successfully imported {count} products from all CSVs.'))
