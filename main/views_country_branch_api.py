from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json
from .models import Country, CountryInfo, BranchInfo, Airport


@csrf_exempt
@require_http_methods(["POST"])
def update_country_information(request):
    """Update country tax and profit information"""
    try:
        data = json.loads(request.body)
        country_code = data.get('country_code')
        region = data.get('region')
        
        if not country_code or not region:
            return JsonResponse({'success': False, 'error': 'Country code and region are required'}, status=400)
        
        country_obj = Country.objects.get(country_code=country_code)
        country_info = CountryInfo.objects.get(country=country_obj, region=region)
        
        # Update tax and profit fields
        country_info.export_sales_tax = data.get('export_sales_tax')
        country_info.export_other_tax = data.get('export_other_tax')
        country_info.country_profit = data.get('country_profit')
        country_info.country_revenue_tax = data.get('country_revenue_tax')
        country_info.import_tax = data.get('import_tax')
        country_info.other_tax = data.get('other_tax')
        country_info.country_import_profit = data.get('country_import_profit')
        country_info.save()
        
        return JsonResponse({'success': True, 'message': 'Country information updated successfully'})
    except Country.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Country not found'}, status=404)
    except CountryInfo.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Country information not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def save_branch_costs(request):
    """Save branch costs information"""
    try:
        data = json.loads(request.body)
        airport_code = data.get('airport_code')
        
        if not airport_code:
            return JsonResponse({'success': False, 'error': 'Airport code is required'}, status=400)
        
        airport_obj = Airport.objects.get(iata_code=airport_code)
        branch_info = BranchInfo.objects.get(airport=airport_obj)
        
        # Update expense fields
        branch_info.marketing_expenses = data.get('marketing_expenses')
        branch_info.payroll = data.get('payroll')
        branch_info.rent_expenses = data.get('rent_expenses')
        branch_info.utilities_expenses = data.get('utilities_expenses')
        branch_info.office_supplies = data.get('office_supplies')
        branch_info.other_expenses = data.get('other_expenses')
        branch_info.save()
        
        return JsonResponse({'success': True, 'message': 'Branch costs saved successfully'})
    except Airport.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Airport not found'}, status=404)
    except BranchInfo.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Branch information not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
