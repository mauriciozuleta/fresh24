from django.core.management.base import BaseCommand
from main.models import Route

class Command(BaseCommand):
    help = 'Delete all Route records.'

    def handle(self, *args, **options):
        count, _ = Route.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {count} Route records.'))
