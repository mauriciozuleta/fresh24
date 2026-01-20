from django.http import JsonResponse
from django.views.decorators.http import require_GET

# Dummy data for demonstration. Replace with real logic as needed.
SUPERMARKETS_BY_COUNTRY = {
    'US': [
        {'module_name': 'walmart', 'display_name': 'Walmart'},
        {'module_name': 'target', 'display_name': 'Target'},
    ],
    'NL': [
        {'module_name': 'albert_heijn', 'display_name': 'Albert Heijn'},
    ],
    'SX': [
        {'module_name': 'shopndrop', 'display_name': 'Shop n Drop'},
    ],
}

@require_GET
def available_supermarkets(request):
    country = request.GET.get('country', '')
    supermarkets = SUPERMARKETS_BY_COUNTRY.get(country, [])
    return JsonResponse({'supermarkets': supermarkets})
