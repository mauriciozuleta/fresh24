

import os
import sys
import django

# Ensure the workspace root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'financialsim.settings')
django.setup()
from main.models import Route

def clear_routes():
    count, _ = Route.objects.all().delete()
    print(f"Deleted {count} Route records.")

def rebuild_routes():
    # Placeholder: Call your route rebuilding logic here
    # For example, if you have a management command or function, call it
    # os.system('python manage.py your_rebuild_command')
    print("Rebuild logic not implemented. Please trigger route rebuild as needed.")

if __name__ == "__main__":
    clear_routes()
    rebuild_routes()
