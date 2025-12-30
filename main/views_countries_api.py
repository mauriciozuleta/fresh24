from django.http import JsonResponse
from .models import Country

def countries_by_region_api(request):
    region = request.GET.get('region')
    if not region:
        return JsonResponse({'countries': []})
    countries = Country.objects.filter(region=region).order_by('name')
    data = [{'name': c.name, 'code': c.country_code} for c in countries]
    return JsonResponse({'countries': data})
