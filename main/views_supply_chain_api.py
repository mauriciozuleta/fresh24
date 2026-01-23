import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET

from .models import Supplier


@require_GET
def supplier_details_api(request):
    """Return supplier details plus airports list for editing forms."""
    pname = request.GET.get('product_name')
    sname = request.GET.get('supplier_name')
    if not pname or not sname:
        return JsonResponse({'error': 'Missing product_name or supplier_name'}, status=400)
    try:
        supplier = Supplier.objects.get(product_name=pname, supplier_name=sname)
    except Supplier.DoesNotExist:
        return JsonResponse({'error': 'Supplier not found'}, status=404)

    airports = []
    try:
        host = getattr(settings, 'HOST', 'http://localhost:8000')
        url = f"{host}/api/airports-by-country/?country={supplier.country}"
        resp = requests.get(url, timeout=5)
        if resp.ok:
            airports = resp.json().get('airports', [])
    except Exception:
        pass

    return JsonResponse({
        'id': supplier.id,
        'product_name': supplier.product_name,
        'supplier_name': supplier.supplier_name,
        'country': supplier.country,
        'location': supplier.location,
        'assigned_branch': supplier.assigned_branch,
        'crop_area': supplier.crop_area,
        'crop_yield': supplier.crop_yield,
        'delivery': supplier.delivery,
        'delivery_time': supplier.delivery_time,
        'ready_for_shelf_days': supplier.ready_for_shelf_days,
        'airports': airports,
        'product_type': getattr(supplier, 'product_type', ''),
    })


@require_GET
def supply_chain_details_api(request):
    """Return suppliers, branches, and yields for a given product."""
    pname = request.GET.get('product_name')
    if not pname:
        return JsonResponse({'suppliers': [], 'branches': [], 'yields': []})

    qs = Supplier.objects.filter(product_name=pname)
    suppliers = list(qs.values_list('supplier_name', flat=True))
    branches = list(qs.values_list('assigned_branch', flat=True).distinct())
    yields = []
    for supplier in qs:
        try:
            value = float(supplier.crop_yield)
        except Exception:
            value = 0.0
        yields.append(value)
    return JsonResponse({'suppliers': suppliers, 'branches': branches, 'yields': yields})


@csrf_exempt
def supply_chain_api(request):
    """Return supply chain summary grouped by product name."""
    summary = {}
    for supplier in Supplier.objects.all():
        pname = supplier.product_name
        if pname not in summary:
            summary[pname] = {
                'product_name': pname,
                'suppliers': set(),
                'branches': set(),
                'total_yield': 0.0,
            }
        summary[pname]['suppliers'].add(supplier.supplier_name)
        summary[pname]['branches'].add(supplier.assigned_branch)
        try:
            value = float(supplier.crop_yield)
        except Exception:
            value = 0.0
        summary[pname]['total_yield'] += value

    result = []
    for item in summary.values():
        result.append({
            'product_name': item['product_name'],
            'num_suppliers': len(item['suppliers']),
            'num_branches': len([branch for branch in item['branches'] if branch]),
            'total_yield': item['total_yield'],
        })
    return JsonResponse({'supply_chain': result})


@csrf_exempt
def add_supplier(request):
    """Create a supplier entry for a product."""
    if request.method == 'POST':
        try:
            product_name = request.POST.get('product_name')
            supplier_name = request.POST.get('supplier_name')
            country = request.POST.get('country')
            location = request.POST.get('location')
            assigned_branch = request.POST.get('assigned_branch')
            crop_area = request.POST.get('crop_area')
            crop_yield = request.POST.get('crop_yield')
            Supplier.objects.create(
                product_name=product_name,
                supplier_name=supplier_name,
                country=country,
                location=location,
                assigned_branch=assigned_branch,
                crop_area=crop_area,
                crop_yield=crop_yield,
            )
            return JsonResponse({'success': True, 'message': 'Supplier added to supply chain'})
        except Exception as exc:
            return JsonResponse({'success': False, 'error': str(exc)})
    return JsonResponse({'success': False, 'error': 'Invalid request method'})
