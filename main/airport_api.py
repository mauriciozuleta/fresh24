from django.http import JsonResponse
from operational_functions.airport_utils import get_airport_coordinates_and_altitude

def airport_lookup(request):
    iata = request.GET.get('iata_code', '').strip().upper()
    if not iata or len(iata) != 3:
        return JsonResponse({'error': 'Invalid IATA code'}, status=400)
    result = get_airport_coordinates_and_altitude(iata)
    if result:
        lat, lon, alt, name, city, country = result
        return JsonResponse({
            'name': name,
            'city': city,
            'country': country,
            'latitude': lat,
            'longitude': lon,
            'altitude_ft': alt
        })
    return JsonResponse({'error': 'Airport not found'}, status=404)

def airports_by_country(request):
    country_id = request.GET.get('country_id')
    if not country_id:
        return JsonResponse({'airports': []})
    from main.models import Country, Airport
    try:
        country_obj = Country.objects.get(pk=country_id)
        country_name = country_obj.name
    except Country.DoesNotExist:
        return JsonResponse({'airports': []})
    airports = Airport.objects.filter(country=country_name).order_by('iata_code')
    data = [{'id': a.pk, 'iata_code': a.iata_code} for a in airports]
    return JsonResponse({'airports': data})
