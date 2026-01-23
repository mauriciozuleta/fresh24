import logging
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_GET

from financialsim.market_tools.exchange_rate import get_exchange_rate
from financialsim.market_tools.market_diagnosis import (
    is_market_diagnosis_running,
    start_market_diagnosis_job,
)

from .models import Country, Product, ProductDiagnosis

logger = logging.getLogger(__name__)


def products_api(request):
    """Return imported products plus any existing market diagnosis data."""
    country_code = request.GET.get('country_code') or request.GET.get('country')
    country = None
    if country_code:
        try:
            country = Country.objects.get(country_code=country_code)
        except Country.DoesNotExist:
            country = None

    qs = Product.objects.select_related('country').all()
    if country_code:
        qs = qs.exclude(country__country_code=country_code)
    products = list(qs.order_by('product_code'))

    diagnosis_map = {}
    if country and products:
        codes = [p.product_code for p in products]
        diag_qs = ProductDiagnosis.objects.filter(
            country_of_diagnosis=country.name,
            product_code__in=codes,
        )
        diagnosis_map = {d.product_code: d for d in diag_qs}

    data = []
    for product in products:
        diag = diagnosis_map.get(product.product_code)
        data.append({
            'product_id': product.id,
            'product_code': product.product_code,
            'product_type': product.product_type,
            'name': product.name,
            'country_name': product.country.name if product.country else '',
            'country_code': product.country.country_code if product.country else '',
            'trade_unit': product.trade_unit,
            'fca_cost_per_wu': float(product.fca_cost_per_wu),
            'updated_at': product.updated_at.isoformat() if getattr(product, 'updated_at', None) else '',
            'packaging': product.packaging,
            'currency': product.currency,
            'supermarket_name': diag.supermarket_name if diag else None,
            'local_cost': float(diag.local_cost) if diag and diag.local_cost is not None else None,
            'price_margin': float(diag.price_margin) if diag and diag.price_margin is not None else None,
            'availability': diag.availability if diag else 0,
            'updated_date': diag.updated.isoformat() if diag and diag.updated else '',
        })
    return JsonResponse({'products': data})


def exchange_rate_api(request):
    """Return exchange rate between two currencies using exchange_rate utility."""
    from_currency = request.GET.get('from') or request.GET.get('source')
    to_currency = request.GET.get('to') or 'USD'
    if not from_currency:
        return JsonResponse({'error': 'Missing from currency'}, status=400)
    try:
        rate = get_exchange_rate(from_currency, to_currency)
    except Exception as exc:
        return JsonResponse({'error': str(exc)}, status=500)
    return JsonResponse({'rate': rate, 'from': from_currency.upper(), 'to': to_currency.upper()})


def run_market_diagnosis_api(request):
    """Trigger market diagnosis for all imported products into a given country."""
    if request.method not in ('GET', 'POST'):
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    country_code = (
        request.GET.get('country')
        or request.GET.get('country_code')
        or request.POST.get('country')
        or request.POST.get('country_code')
    )
    if not country_code:
        return JsonResponse({'error': 'Missing country code'}, status=400)

    try:
        country = Country.objects.get(country_code=country_code)
    except Country.DoesNotExist:
        return JsonResponse({'error': 'Invalid country code'}, status=400)

    try:
        if is_market_diagnosis_running(country):
            processed = None
        else:
            started = start_market_diagnosis_job(country)
            processed = 0 if started else None
    except Exception as exc:
        logger.exception("Market diagnosis failed for country %s: %s", country.name, exc)
        return JsonResponse({'error': 'Market diagnosis failed'}, status=500)

    imports_qs = Product.objects.exclude(country=country)
    total_products = imports_qs.count()
    product_codes = list(imports_qs.values_list('product_code', flat=True))
    if product_codes:
        matched_products = ProductDiagnosis.objects.filter(
            country_of_diagnosis=country.name,
            product_code__in=product_codes,
            availability__gt=0,
        ).count()
    else:
        matched_products = 0

    is_running = is_market_diagnosis_running(country)

    return JsonResponse({
        'ok': True,
        'country_code': country.country_code,
        'country_name': country.name,
        'processed_count': processed,
        'total_products': total_products,
        'matched_products': matched_products,
        'is_running': is_running,
    })


def edit_product_form(request, product_code):
    product = get_object_or_404(Product, product_code=product_code)
    countries = Country.objects.all().order_by('name')
    context = {
        'form': True,
        'edit_mode': True,
        'product_id': product.id,
        'product': product,
        'countries': countries,
    }
    return render(request, 'add_product.html', context)


def add_product_form(request):
    countries = Country.objects.all().order_by('name')
    context = {
        'form': True,
        'edit_mode': False,
        'countries': countries,
    }
    return render(request, 'add_product.html', context)


def add_product(request):
    if request.method == 'POST':
        try:
            product_type = request.POST.get('product_type')
            name = request.POST.get('name')
            country_id = request.POST.get('country_id')
            trade_unit = request.POST.get('trade_unit')
            fca_cost_per_wu = request.POST.get('fca_cost_per_wu')
            currency = request.POST.get('currency')
            packaging = request.POST.get('packaging')
            packaging_weight = request.POST.get('packaging_weight')
            packaging_cost = request.POST.get('packaging_cost')
            units_per_pack = request.POST.get('units_per_pack')
            other_info = request.POST.get('other_info', '')

            country = Country.objects.get(id=country_id)

            type_initials = {
                'Produce': 'PR',
                'Meats': 'ME',
                'Other Perishable': 'OP',
                'Dry Goods': 'DG',
                'Technology': 'TE',
                'Other': 'OT',
            }
            prefix = type_initials.get(product_type, 'XX')
            from django.db.models import Max

            max_code = Product.objects.filter(product_code__startswith=prefix).aggregate(Max('product_code'))['product_code__max']
            if max_code:
                try:
                    seq = int(max_code[len(prefix):]) + 1
                except Exception:
                    seq = 1
            else:
                seq = 1
            product_code = f"{prefix}{seq:03d}"

            product = Product.objects.create(
                product_code=product_code,
                product_type=product_type,
                name=name,
                country=country,
                trade_unit=trade_unit,
                fca_cost_per_wu=fca_cost_per_wu,
                currency=currency,
                packaging=packaging,
                packaging_weight=packaging_weight,
                packaging_cost=packaging_cost,
                units_per_pack=units_per_pack,
                other_info=other_info,
            )

            try:
                from financialsim.market_tools.usda_pricing import get_usda_product

                usda_info = get_usda_product(name)
                if usda_info:
                    product.product_code = usda_info.get("product_code", product.product_code)
                    product.other_info = (product.other_info or "") + f" | USDA: {usda_info.get('other_info', '')}"
                    product.save()
            except Exception as exc:
                print(f"USDA code assignment failed: {exc}")
            return JsonResponse({'success': True, 'message': 'Product added successfully', 'product_code': product_code})
        except Exception as exc:
            return JsonResponse({'success': False, 'error': str(exc)})
    return JsonResponse({'success': False, 'error': 'Invalid request method'})


def edit_product(request, pk):
    if request.method == 'POST':
        try:
            product = get_object_or_404(Product, id=pk)

            product.product_type = request.POST.get('product_type')
            product.name = request.POST.get('name')
            product.country_id = request.POST.get('country_id')
            product.trade_unit = request.POST.get('trade_unit')
            product.fca_cost_per_wu = request.POST.get('fca_cost_per_wu')
            product.currency = request.POST.get('currency')
            product.packaging = request.POST.get('packaging')
            product.packaging_weight = request.POST.get('packaging_weight')
            product.packaging_cost = request.POST.get('packaging_cost')
            product.units_per_pack = request.POST.get('units_per_pack')
            product.other_info = request.POST.get('other_info', '')

            product.save()
            return JsonResponse({'success': True, 'message': 'Product updated successfully'})
        except Exception as exc:
            return JsonResponse({'success': False, 'error': str(exc)})
    return JsonResponse({'success': False, 'error': 'Invalid request method'})
