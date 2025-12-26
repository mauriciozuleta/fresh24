from django.core.management.base import BaseCommand
from operational_functions.routes_utils import generate_routes_list

class Command(BaseCommand):
    help = 'Generate and populate all possible routes in the Route table.'

    def handle(self, *args, **options):
        created = generate_routes_list()
        self.stdout.write(self.style.SUCCESS(f'Successfully generated/updated {created} routes.'))
