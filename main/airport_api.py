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
