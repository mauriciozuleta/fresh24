from django.core.management.base import BaseCommand
from main.models import ProductDiagnosis

class Command(BaseCommand):
    help = 'Clear supermarket, local cost, price margin, availability, and updated columns in ProductDiagnosis table.'

    def handle(self, *args, **options):
        updated = ProductDiagnosis.objects.all().update(
            supermarket_name='',
            local_cost=None,
            price_margin=None,
            availability=0
        )
        self.stdout.write(self.style.SUCCESS(f'Cleared columns for {updated} ProductDiagnosis records.'))
