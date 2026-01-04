from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .models import Supplier

@csrf_exempt
def edit_supplier(request):
    if request.method == 'POST':
        try:
            supplier_id = request.POST.get('supplier_id')
            if not supplier_id:
                return JsonResponse({'success': False, 'error': 'Missing supplier_id'})
            supplier = Supplier.objects.get(id=supplier_id)
            supplier.product_name = request.POST.get('product_name', supplier.product_name)
            supplier.supplier_name = request.POST.get('supplier_name', supplier.supplier_name)
            supplier.country = request.POST.get('country', supplier.country)
            supplier.location = request.POST.get('location', supplier.location)
            supplier.assigned_branch = request.POST.get('assigned_branch', supplier.assigned_branch)
            supplier.crop_area = request.POST.get('crop_area', supplier.crop_area)
            supplier.crop_yield = request.POST.get('crop_yield', supplier.crop_yield)
            supplier.delivery = request.POST.get('delivery', supplier.delivery)
            supplier.delivery_time = request.POST.get('delivery_time', supplier.delivery_time)
            supplier.ready_for_shelf_days = request.POST.get('ready_for_shelf_days', supplier.ready_for_shelf_days)
            supplier.save()
            return JsonResponse({'success': True, 'message': 'Supplier updated successfully'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid request method'})
