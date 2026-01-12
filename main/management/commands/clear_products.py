from django.core.management.base import BaseCommand
from main.models import Product

class Command(BaseCommand):
    help = 'Delete all products from the Product table.'

    def handle(self, *args, **options):
        count = Product.objects.count()
        Product.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count} products.'))
