from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

from django.utils import timezone
from .models import Country, ProductPriceComparison


@require_GET
def get_saved_price_comparison_api(request):
	"""Return saved price comparison rows for a given country code."""
	country_code = request.GET.get('country_code')
	if not country_code:
		return JsonResponse({'results': []})
	qs = ProductPriceComparison.objects.filter(prices_in_country=country_code)
	results = []
	for obj in qs:
		results.append({
			'product_code': obj.product_code,
			'product_name': obj.product_name,
			'trade_unit': obj.trade_unit,
			'packaging': obj.packaging,
			'currency': obj.currency,
			'last_updated_price': float(obj.last_updated_price) if obj.last_updated_price is not None else None,
			'last_updated_date': obj.last_updated_date.strftime('%Y-%m-%d %H:%M') if obj.last_updated_date else None,
		})
	return JsonResponse({'results': results})


@csrf_exempt
def save_price_comparison_api(request):
	"""Upsert price comparison rows for a list of product updates."""
	import json
	if request.method != 'POST':
		return JsonResponse({'error': 'POST required'}, status=405)
	try:
		data = json.loads(request.body.decode('utf-8'))
		updates = data.get('updates', [])
		country_code = data.get('country_code')
		results = []
		for upd in updates:
			product_code = upd.get('product_code')
			product_name = upd.get('product_name')
			trade_unit = upd.get('trade_unit')
			packaging = upd.get('packaging')
			currency = upd.get('currency')
			new_price = upd.get('new_price')
			if not (product_code and new_price is not None and country_code):
				results.append({'product_code': product_code, 'success': False, 'error': 'Missing required fields'})
				continue
			try:
				obj, _created = ProductPriceComparison.objects.get_or_create(
					product_code=product_code,
					prices_in_country=country_code,
					defaults={
						'product_name': product_name,
						'trade_unit': trade_unit,
						'packaging': packaging,
						'currency': currency,
					}
				)
				obj.new_price = new_price
				obj.last_updated_price = new_price
				obj.last_updated_date = timezone.now()
				obj.product_name = product_name or obj.product_name
				obj.trade_unit = trade_unit or obj.trade_unit
				obj.packaging = packaging or obj.packaging
				obj.currency = currency or obj.currency
				obj.prices_in_country = country_code
				obj.save()
				results.append({'product_code': product_code, 'success': True})
			except Exception as exc:
				results.append({'product_code': product_code, 'success': False, 'error': str(exc)})
		return JsonResponse({'results': results})
	except Exception as exc:
		return JsonResponse({'error': str(exc)}, status=500)


@require_GET
def countries_api(request):
	"""List countries with basic fields for dropdowns."""
	countries = Country.objects.all().order_by('name')
	data = []
	for country in countries:
		data.append({
			'name': country.name,
			'code': country.country_code,
			'country_code': country.country_code,
			'currency': country.currency,
			'currency_code': country.currency_code,
			'region': country.region,
		})
	return JsonResponse({'countries': data})


