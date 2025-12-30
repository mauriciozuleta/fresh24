from django.http import JsonResponse
from .models import Airport, Country, BranchInfo

def airports_by_country_api(request):
    country_code = request.GET.get('country')
    if not country_code:
        return JsonResponse({'airports': []})
    
    # Look up the country object from the country code
    try:
        country_obj = Country.objects.get(country_code=country_code)
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
    
    return JsonResponse({'airports': data})
