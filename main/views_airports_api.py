from django.http import JsonResponse
from .models import Airport, Country

def airports_by_country_api(request):
    country_code = request.GET.get('country')
    if not country_code:
        return JsonResponse({'airports': []})
    
    # Look up the country name from the country code
    try:
        country_obj = Country.objects.get(country_code=country_code)
        country_name = country_obj.name
    except Country.DoesNotExist:
        return JsonResponse({'airports': []})
    
    airports = Airport.objects.filter(country=country_name).order_by('iata_code')
    data = [{'iata_code': a.iata_code, 'city': a.city} for a in airports]
    return JsonResponse({'airports': data})
