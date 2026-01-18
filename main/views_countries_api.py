from django.http import JsonResponse
from .models import Country, CountryInfo, RegionalInfo

def countries_by_region_api(request):
    region = request.GET.get('region')
    if not region:
        return JsonResponse({'countries': []})
    
    # Get regional manager
    regional_manager = 'Not Assigned'
    try:
        regional_info = RegionalInfo.objects.get(region=region)
        regional_manager = regional_info.regional_manager
    except RegionalInfo.DoesNotExist:
        pass
    
    countries = Country.objects.filter(region=region).order_by('name')
    data = []
    for c in countries:
        country_manager = 'Not Assigned'
        try:
            country_info = CountryInfo.objects.get(country=c, region=region)
            country_manager = country_info.country_manager
        except CountryInfo.DoesNotExist:
            pass
        
        data.append({
            'name': c.name,
            'code': c.country_code,
            'country_code': c.country_code,
            'country_manager': country_manager,
            'region_manager': regional_manager
        })
    
    return JsonResponse({'countries': data})

def countries_in_branches_api(request):
    # Implementation for countries_in_branches_api
    pass

def countries_in_countryinfo_api(request):
    # Get unique country IDs from CountryInfo
    country_ids = CountryInfo.objects.values_list('country', flat=True).distinct()
    countries = Country.objects.filter(id__in=country_ids).order_by('name')
    data = [
        {
            'name': c.name,
            'code': c.country_code,
            'country_code': c.country_code,
            'id': c.id,
        }
        for c in countries
    ]
    return JsonResponse({'countries': data})
