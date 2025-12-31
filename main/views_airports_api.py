from django.http import JsonResponse
from .models import Airport, Country, BranchInfo

def airports_by_country_api(request):
    country_code = request.GET.get('country')
    country_id = request.GET.get('country_id')
    
    if not country_code and not country_id:
        return JsonResponse({'airports': []})
    
    # Look up the country object from the country code or ID
    try:
        if country_id:
            country_obj = Country.objects.get(pk=country_id)
        else:
            country_obj = Country.objects.get(country_code=country_code)
    except Country.DoesNotExist:
        return JsonResponse({'airports': []})
    
    # Get all airports for this country
    # Try multiple matching strategies since Airport.country is a CharField
    airports = Airport.objects.filter(country__iexact=country_obj.country_code) | \
               Airport.objects.filter(country__iexact=country_obj.name)
    
    # Build data from all airports
    data = []
    for airport in airports:
        # Try to get branch info if it exists
        branch_info = BranchInfo.objects.filter(airport=airport, country=country_obj).first()
        data.append({
            'id': airport.pk,
            'iata_code': airport.iata_code,
            'city': airport.city,
            'manager': branch_info.branch_manager if branch_info else ''
        })
    
    return JsonResponse({'airports': data})
