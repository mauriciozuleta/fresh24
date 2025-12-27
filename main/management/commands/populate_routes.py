from django.core.management.base import BaseCommand
from operational_functions.routes_utils import generate_routes_list
from main.models import Route

class Command(BaseCommand):
    help = 'Populate the routes table for all airport pairs, aircraft, and providers.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--only-empty',
            action='store_true',
            help='Run only if the routes table is empty.'
        )

    def handle(self, *args, **options):
        only_empty = options.get('only_empty', False)
        if only_empty and Route.objects.exists():
            self.stdout.write(self.style.WARNING('Routes table is not empty; skipping population.'))
            return
        before = Route.objects.count()
        created = generate_routes_list()
        after = Route.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'Routes populated. Operations: {created}. Total: {after}. Before: {before}.'
        ))
