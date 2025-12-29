from django.core.management.base import BaseCommand
from main.models import Route

class Command(BaseCommand):
    help = 'Delete all Route records.'

    def handle(self, *args, **options):
        from django.db import connection
        count, _ = Route.objects.all().delete()
        # Reset the primary key sequence for Route
        with connection.cursor() as cursor:
            table_name = Route._meta.db_table
            if connection.vendor == 'sqlite':
                cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table_name}'")
            elif connection.vendor == 'postgresql':
                cursor.execute(f"ALTER SEQUENCE {table_name}_id_seq RESTART WITH 1")
            # Add other DBs as needed
        self.stdout.write(self.style.SUCCESS(f'Deleted {count} Route records and reset Route ID sequence.'))
