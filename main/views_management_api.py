from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .models import RegionalInfo, CountryInfo, BranchInfo, Country, Airport


def check_region_info(request):
    """Check if regional manager/user exist for the given region"""
    region = request.GET.get('region')
    if not region:
        return JsonResponse({'exists': False})
    
    try:
        info = RegionalInfo.objects.get(region=region)
        return JsonResponse({
            'exists': True,
            'regional_manager': info.regional_manager,
            'region_user': info.region_user
        })
    except RegionalInfo.DoesNotExist:
        return JsonResponse({'exists': False})


def check_country_info(request):
    """Check if country manager/user exist for the given country"""
    country_code = request.GET.get('country')
    if not country_code:
        return JsonResponse({'exists': False})
    
    try:
        country = Country.objects.get(country_code=country_code)
        info = CountryInfo.objects.get(country=country)
        return JsonResponse({
            'exists': True,
            'country_manager': info.country_manager,
            'country_user': info.country_user,
            'export_sales_tax': float(info.export_sales_tax) if info.export_sales_tax else None,
            'export_other_tax': float(info.export_other_tax) if info.export_other_tax else None,
            'country_profit': float(info.country_profit) if info.country_profit else None,
            'country_revenue_tax': float(info.country_revenue_tax) if info.country_revenue_tax else None,
            'import_tax': float(info.import_tax) if info.import_tax else None,
            'other_tax': float(info.other_tax) if info.other_tax else None,
            'country_import_profit': float(info.country_import_profit) if info.country_import_profit else None,
        })
    except (Country.DoesNotExist, CountryInfo.DoesNotExist):
        return JsonResponse({'exists': False})


def check_branch_info(request):
    """Check if branch manager/user exist for the given airport"""
    airport_code = request.GET.get('airport')
    if not airport_code:
        return JsonResponse({'exists': False})
    
    try:
        airport = Airport.objects.get(iata_code=airport_code)
        info = BranchInfo.objects.get(airport=airport)
        return JsonResponse({
            'exists': True,
            'branch_manager': info.branch_manager,
            'branch_user': info.branch_user
        })
    except (Airport.DoesNotExist, BranchInfo.DoesNotExist):
        return JsonResponse({'exists': False})


@csrf_exempt
@require_http_methods(["POST"])
def save_region_info(request):
    """Save or update regional manager/user"""
    try:
        data = json.loads(request.body)
        region = data.get('region')
        regional_manager = data.get('regional_manager')
        region_user = data.get('region_user')
        
        if not all([region, regional_manager, region_user]):
            return JsonResponse({'success': False, 'error': 'Missing required fields'}, status=400)
        
        info, created = RegionalInfo.objects.update_or_create(
            region=region,
            defaults={
                'regional_manager': regional_manager,
                'region_user': region_user
            }
        )
        
        return JsonResponse({
            'success': True,
            'created': created,
            'message': 'Region info saved successfully'
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def save_country_info(request):
    """Save or update country manager/user"""
    try:
        data = json.loads(request.body)
        country_code = data.get('country')
        region = data.get('region')
        country_manager = data.get('country_manager')
        country_user = data.get('country_user')
        
        if not all([country_code, region, country_manager, country_user]):
            return JsonResponse({'success': False, 'error': 'Missing required fields'}, status=400)
        
        country = Country.objects.get(country_code=country_code)
        
        info, created = CountryInfo.objects.update_or_create(
            country=country,
            region=region,
            defaults={
                'country_manager': country_manager,
                'country_user': country_user
            }
        )
        
        return JsonResponse({
            'success': True,
            'created': created,
            'message': 'Country info saved successfully'
        })
    except Country.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Country not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def save_branch_info(request):
    """Save or update branch manager/user"""
    try:
        data = json.loads(request.body)
        airport_code = data.get('airport')
        country_code = data.get('country')
        branch_manager = data.get('branch_manager')
        branch_user = data.get('branch_user')
        
        if not all([airport_code, country_code, branch_manager, branch_user]):
            return JsonResponse({'success': False, 'error': 'Missing required fields'}, status=400)
        
        airport = Airport.objects.get(iata_code=airport_code)
        country = Country.objects.get(country_code=country_code)
        
        info, created = BranchInfo.objects.update_or_create(
            airport=airport,
            country=country,
            defaults={
                'branch_manager': branch_manager,
                'branch_user': branch_user
            }
        )
        
        return JsonResponse({
            'success': True,
            'created': created,
            'message': 'Branch info saved successfully'
        })
    except (Airport.DoesNotExist, Country.DoesNotExist):
        return JsonResponse({'success': False, 'error': 'Airport or Country not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def get_management_table_data(request):
    """Get hierarchical management data for table rendering"""
    data = []
    
    # Get all regional info
    regions = RegionalInfo.objects.all().order_by('region')
    
    for region_info in regions:
        region_data = {
            'region': region_info.region,
            'regional_manager': region_info.regional_manager,
            'region_user': region_info.region_user,
            'countries': []
        }
        
        # Get countries for this region
        countries = CountryInfo.objects.filter(region=region_info.region).select_related('country')
        
        for country_info in countries:
            country_data = {
                'country_name': country_info.country.name,
                'country_code': country_info.country.country_code,
                'country_manager': country_info.country_manager,
                'country_user': country_info.country_user,
                'branches': []
            }
            
            # Get branches for this country
            branches = BranchInfo.objects.filter(country=country_info.country).select_related('airport')
            
            for branch_info in branches:
                branch_data = {
                    'airport_code': branch_info.airport.iata_code,
                    'airport_city': branch_info.airport.city,
                    'branch_manager': branch_info.branch_manager,
                    'branch_user': branch_info.branch_user
                }
                country_data['branches'].append(branch_data)
            
            region_data['countries'].append(country_data)
        
        data.append(region_data)
    
    return JsonResponse({'data': data})
