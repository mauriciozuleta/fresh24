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
    country_code = request.GET.get('country')
    country_id = request.GET.get('country_id')
    if not country_code and not country_id:
        return JsonResponse({'airports': []})
    from main.models import Country, Airport, BranchInfo
    try:
        if country_code:
            country_obj = Country.objects.get(country_code=country_code)
        else:
            country_obj = Country.objects.get(pk=country_id)
        country_name = country_obj.name
    except Country.DoesNotExist:
        return JsonResponse({'airports': []})
    
    # Get all branches for this country (using Country FK)
    branches = BranchInfo.objects.filter(country=country_obj).select_related('airport')
    
    # Build data from branches
    data = []
    for branch_info in branches:
        data.append({
            'id': branch_info.airport.pk,
            'iata_code': branch_info.airport.iata_code,
            'city': branch_info.airport.city,
            'manager': branch_info.branch_manager
        })
        print(f"Found branch: {branch_info.airport.iata_code} - Manager: {branch_info.branch_manager}")
    
    print(f"Returning {len(data)} airports with branches for {country_name}")
    return JsonResponse({'airports': data})
