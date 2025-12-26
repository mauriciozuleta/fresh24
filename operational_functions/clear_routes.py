
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'financialsim.settings')
django.setup()
from main.models import Route

if __name__ == "__main__":
    count, _ = Route.objects.all().delete()
    print(f"Deleted {count} Route records.")
