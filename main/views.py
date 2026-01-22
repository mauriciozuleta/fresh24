from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.http import JsonResponse
import importlib
import os
from pathlib import Path
from threading import Thread


def _run_supermarket_scrape_job(country_id: int, module_name: str, query: str, slug: str) -> None:
	"""Background worker: run scraper and write CSV for a supermarket query.

	This mirrors the synchronous logic previously in scrape_supermarket_api,
	but is executed in a separate thread so the HTTP request can return
	immediately and the scrape continues even if the user changes tabs.
	"""
	from datetime import datetime
	import csv
	from django.conf import settings
	from .models import Country
	from financialsim.market_tools.market_diagnosis import _get_country_scrapers

	try:
		country = Country.objects.get(id=country_id)
	except Country.DoesNotExist:
		print(f"DEBUG: background scrape aborted, country id {country_id} not found", flush=True)
		return

	# Find scraper function for this country/module
	scrapers = _get_country_scrapers(country)
	scraper_func = None
	display_name = None
	for dname, func in scrapers:
		if func.__module__.split('.')[-1] == module_name:
			scraper_func = func
			display_name = dname
			break
	if not scraper_func:
		print(f"DEBUG: background scrape aborted, scraper {module_name} not found for country {country}", flush=True)
		return

	print(f"DEBUG: [bg] starting scrape for {module_name} query={query}", flush=True)
	try:
		results = scraper_func(query)
	except Exception as exc:
		print(f"DEBUG: [bg] scraper failed for {module_name} query={query}: {exc}", flush=True)
		return
	print(f"DEBUG: [bg] scraper returned {len(results)} raw items for {display_name}", flush=True)

	# Normalize/enrich results (same logic as before)
	rows = []
	sxm_module = None
	if module_name == 'sxm_scrapper':
		try:
			from financialsim.market_tools import sxm_scrapper as _sxm
			sxm_module = _sxm
			print("DEBUG: [bg] using sxm_scrapper enrichment logic", flush=True)
		except Exception as e:
			print(f"DEBUG: [bg] failed to import sxm_scrapper for enrichment: {e}", flush=True)

	for item in results:
		name = item.get('name', '')
		price = item.get('price', '')
		if module_name == 'sxm_scrapper' and sxm_module is not None:
			# Start with weight and the URL from the listing, as in CLI
			description = item.get('weight')
			product_page_url = item.get('url')
			try:
				if (not description or not str(description).strip()):
					if (not product_page_url) and name:
						product_page_url = sxm_module.find_product_page_url(name) or product_page_url
					if product_page_url:
						description = sxm_module.get_product_weight(product_page_url) or description
			except Exception as e:
				print(f"DEBUG: [bg] sxm_scrapper enrichment failed for {name}: {e}", flush=True)
			description = description or 'N/A'
			url = product_page_url or 'N/A'
		else:
			# Generic normalization for other scrapers
			description = item.get('description') or item.get('weight') or 'N/A'
			url = item.get('url') or item.get('URL') or 'N/A'

		rows.append({
			'name': name,
			'price': price,
			'description': description,
			'url': url,
		})

	# Save CSV mirroring the CLI behavior and clean up older ones
	try:
		tools_dir = Path(settings.BASE_DIR) / 'financialsim' / 'market_tools'
		tools_dir.mkdir(parents=True, exist_ok=True)
		date_str = datetime.now().strftime('%m-%d-%Y')
		csv_path = tools_dir / f"{module_name}_{slug}_{date_str}.csv"
		with csv_path.open('w', newline='', encoding='utf-8') as csvfile:
			writer = csv.DictWriter(csvfile, fieldnames=['Name', 'Price', 'Description', 'URL'])
			writer.writeheader()
			for row in rows:
				writer.writerow({
					'Name': row.get('name', ''),
					'Price': row.get('price', ''),
					'Description': row.get('description', ''),
					'URL': row.get('url', ''),
				})
		pattern = f"{module_name}_{slug}_*.csv"
		matches = list(tools_dir.glob(pattern))
		if len(matches) > 1:
			sorted_files = sorted(matches, key=lambda p: p.stat().st_mtime)
			for old in sorted_files[:-1]:
				try:
					os.remove(old)
				except Exception:
					pass
	except Exception as exc:
		print(f"DEBUG: [bg] failed to write CSV for {module_name} {slug}: {exc}", flush=True)


@require_GET
def shopndrop_categories_api(request):
	"""Return navbar-based categories for the sxm_shopndrop scraper.

	The response groups subcategories under their top-level navbar label so
	that the UI can build a primary "Category" dropdown and a secondary
	"Subcategory" dropdown for ShopNDrop.

	Schema:

	    {
	        "categories": [
	            {"top": "Fruits & Vegetables", "subcategories": ["Apple", ...]},
	            ...
	        ]
	    }
	"""
	try:
		from financialsim.market_tools import sxm_shopndrop
	except Exception as exc:
		return JsonResponse({'error': f'Failed to import sxm_shopndrop: {exc}', 'categories': []}, status=500)

	try:
		categories = sxm_shopndrop.get_nav_categories()
	except Exception as exc:
		return JsonResponse({'error': f'Failed to build ShopNDrop navbar categories: {exc}', 'categories': []}, status=500)

	return JsonResponse({'categories': categories})

@require_GET
def available_supermarkets_api(request):
	"""Return a list of available supermarkets (display name and module name) for a given country code."""
	country_code = request.GET.get('country_code') or request.GET.get('country')
	if not country_code:
		return JsonResponse({'supermarkets': []})
	try:
		country = Country.objects.get(country_code=country_code)
	except Country.DoesNotExist:
		return JsonResponse({'supermarkets': []})
	from financialsim.market_tools.market_diagnosis import _get_country_scrapers
	scrapers = _get_country_scrapers(country)
	# Each scraper: (display_name, function)
	supermarkets = []
	# Map known scrapers to their homepage URLs for user reference
	SCRAPER_URLS = {
		'sxm_scrapper': 'https://www.sxmleshalles.com',
		'sxm_shopndrop': 'https://www.shopndropgrocerysxm.com',
		# Add more mappings as needed
	}
	for display_name, func in scrapers:
		module_name = func.__module__.split('.')[-1]
		url = SCRAPER_URLS.get(module_name, '')
		supermarkets.append({'display_name': display_name, 'module_name': module_name, 'url': url})
	return JsonResponse({'supermarkets': supermarkets})


@csrf_exempt
@require_POST
def scrape_supermarket_api(request):
	"""Start a supermarket scrape in the background for a given query.

	The actual scraping and CSV writing are done in a background thread so
	that the request can return immediately and the job is not cancelled if
	the user changes tabs or navigates away.
	"""
	import json
	data = json.loads(request.body.decode('utf-8'))
	country_code = data.get('country_code')
	module_name = data.get('module_name')
	query = data.get('query')
	if not (country_code and module_name and query):
		return JsonResponse({'error': 'Missing required fields'}, status=400)
	try:
		country = Country.objects.get(country_code=country_code)
	except Country.DoesNotExist:
		return JsonResponse({'error': 'Invalid country code'}, status=400)

	# Optional: verify that a scraper exists for this module/country
	from financialsim.market_tools.market_diagnosis import _get_country_scrapers
	scrapers = _get_country_scrapers(country)
	if not any(func.__module__.split('.')[-1] == module_name for _dname, func in scrapers):
		return JsonResponse({'error': 'Scraper not found for this country'}, status=404)

	slug = (query or '').strip().lower().replace(' ', '-')
	print(f"DEBUG: scheduling background scrape for {module_name} query={query} slug={slug}", flush=True)

	thread = Thread(
		target=_run_supermarket_scrape_job,
		args=(country.id, module_name, query, slug),
		daemon=True,
	)
	thread.start()

	return JsonResponse({
		'ok': True,
		'query': query,
		'module_name': module_name,
		'category': slug,
	})


@require_GET
def scrape_summary_api(request):
	"""Summarize existing scraper CSV files in financialsim/market_tools.

	Returns a JSON object mapping supermarket domains to the list of
	unique categories that have raw data available.
	"""
	base_dir = Path(settings.BASE_DIR)
	tools_dir = base_dir / 'financialsim' / 'market_tools'

	# Reuse the same mapping we use for available_supermarkets_api
	SCRAPER_URLS = {
		'sxm_scrapper': 'https://www.sxmleshalles.com',
		'sxm_shopndrop': 'https://www.shopndropgrocerysxm.com',
	}

	# Invert mapping: module_name -> domain (without protocol/trailing slash)
	module_to_domain = {}
	for module, url in SCRAPER_URLS.items():
		clean = url.replace('http://', '').replace('https://', '').rstrip('/')
		module_to_domain[module] = clean

	summary = {}
	if tools_dir.exists():
		for entry in tools_dir.iterdir():
			if not entry.is_file() or not entry.name.endswith('.csv'):
				continue
			stem = entry.stem  # e.g. 'sxm_scrapper_beef_01-20-2026'
			parts = stem.split('_')
			if len(parts) < 3:
				continue
			# Heuristic: first two parts form the module (e.g. 'sxm_scrapper'),
			# the next part is the category; the rest is typically the date.
			module_name = '_'.join(parts[0:2])
			category = parts[2]
			domain = module_to_domain.get(module_name)
			if not domain:
				continue
			cats = summary.setdefault(domain, set())
			cats.add(category)

	# Convert sets to sorted lists for JSON serialization
	serializable = {domain: sorted(list(categories)) for domain, categories in summary.items()}
	return JsonResponse({'summary': serializable})


@require_GET
def scrape_results_api(request):
	"""Return detailed CSV records for a given scraper module and category.

	Looks up CSV files in financialsim/market_tools with names like
	"sxm_scrapper_beef_01-20-2026.csv", picks the most recent by date,
	and returns all records (excluding the header) along with basic
	metadata for UI display.
	"""
	module_name = request.GET.get('module_name')
	category = request.GET.get('category')
	if not module_name or not category:
		return JsonResponse({'error': 'module_name and category are required'}, status=400)

	from django.conf import settings
	from datetime import datetime
	import csv

	base_dir = Path(settings.BASE_DIR)
	tools_dir = base_dir / 'financialsim' / 'market_tools'
	if not tools_dir.exists():
		return JsonResponse({'records': [], 'total': 0, 'category': category, 'domain': '', 'date': ''})

	matches = []  # (Path, datetime or None, date_str)
	for entry in tools_dir.iterdir():
		if not entry.is_file() or not entry.name.endswith('.csv'):
			continue
		stem = entry.stem  # e.g. 'sxm_scrapper_beef_01-20-2026'
		parts = stem.split('_')
		if len(parts) < 4:
			continue
		file_module = '_'.join(parts[0:2])
		file_category = parts[2]
		if file_module != module_name or file_category.lower() != category.lower():
			continue
		date_str = '_'.join(parts[3:])
		try:
			parsed_dt = datetime.strptime(date_str, '%m-%d-%Y')
		except ValueError:
			parsed_dt = None
		matches.append((entry, parsed_dt, date_str))

	if not matches:
		return JsonResponse({'records': [], 'total': 0, 'category': category, 'domain': '', 'date': ''})

	def _sort_key(item):
		_efile, edt, _ds = item
		from datetime import datetime as _dt
		return edt or _dt.min

	latest_file, latest_dt, latest_date_str = sorted(matches, key=_sort_key)[-1]

	# Map scrapers to their homepages to derive the display domain
	SCRAPER_URLS = {
		'sxm_scrapper': 'https://www.sxmleshalles.com',
		'sxm_shopndrop': 'https://www.shopndropgrocerysxm.com',
	}
	full_url = SCRAPER_URLS.get(module_name, '')
	domain = full_url.replace('http://', '').replace('https://', '').rstrip('/') if full_url else ''

	records = []
	try:
		with latest_file.open('r', encoding='utf-8') as f:
			reader = csv.DictReader(f)
			for row in reader:
				records.append({
					'name': row.get('Name', ''),
					'price': row.get('Price', ''),
					'description': row.get('Description', ''),
					'url': row.get('URL', ''),
				})
	except Exception as exc:
		return JsonResponse({'error': f'Failed to read CSV: {exc}'}, status=500)

	total = len(records)

	return JsonResponse({
		'records': records,
		'total': total,
		'category': category,
		'domain': domain,
		'date': latest_date_str,
	})

# --- API endpoint to get saved price comparison data for a country ---
@require_GET
def get_saved_price_comparison_api(request):
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
			'last_updated_date': obj.last_updated_date.strftime('%Y-%m-%d %H:%M') if obj.last_updated_date else None
		})
	return JsonResponse({'results': results})
from django.utils import timezone
from .models import ProductPriceComparison
# --- API endpoint to save product price comparison data ---
from django.views.decorators.csrf import csrf_exempt
@csrf_exempt
def save_price_comparison_api(request):
	"""Accepts POST with a list of product price updates, updates/creates ProductPriceComparison records."""
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
				obj, created = ProductPriceComparison.objects.get_or_create(
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
			except Exception as e:
				results.append({'product_code': product_code, 'success': False, 'error': str(e)})
		return JsonResponse({'results': results})
	except Exception as e:
		return JsonResponse({'error': str(e)}, status=500)
from django.views.decorators.http import require_GET
from .models import Country

@require_GET
def countries_api(request):
	countries = Country.objects.all().order_by('name')
	data = []
	for c in countries:
		data.append({
			'name': c.name,
			'code': c.country_code,
			'country_code': c.country_code,
			'currency': c.currency,
			'currency_code': c.currency_code,
			'region': c.region
		})
	return JsonResponse({'countries': data})
from django.views.decorators.http import require_GET
@require_GET
def supplier_details_api(request):
	from .models import Supplier
	pname = request.GET.get('product_name')
	sname = request.GET.get('supplier_name')
	if not pname or not sname:
		return JsonResponse({'error': 'Missing product_name or supplier_name'}, status=400)
	try:
		supplier = Supplier.objects.get(product_name=pname, supplier_name=sname)
	except Supplier.DoesNotExist:
		return JsonResponse({'error': 'Supplier not found'}, status=404)
	# Optionally, fetch airports for the country (for edit form dropdown)
	# Fetch airports using the airports_by_country API endpoint
	import requests
	from django.conf import settings
	airports = []
	try:
		# Build the full URL to the airports_by_country endpoint
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
# from django.views.decorators.http import require_GET
from django.views.decorators.http import require_GET
# Returns details for a given product name: suppliers, branches, yields
@require_GET
def supply_chain_details_api(request):
	from .models import Supplier
	pname = request.GET.get('product_name')
	if not pname:
		return JsonResponse({'suppliers': [], 'branches': [], 'yields': []})
	qs = Supplier.objects.filter(product_name=pname)
	suppliers = list(qs.values_list('supplier_name', flat=True))
	branches = list(qs.values_list('assigned_branch', flat=True).distinct())
	yields = []
	for s in qs:
		try:
			y = float(s.crop_yield)
		except Exception:
			y = 0.0
		yields.append(y)
	return JsonResponse({'suppliers': suppliers, 'branches': branches, 'yields': yields})
from django.db.models import Count, Sum
def supply_chain_api(request):
	# Returns supply chain summary for each product
	from .models import Supplier
	# Get all suppliers grouped by product_name
	summary = {}
	for s in Supplier.objects.all():
		pname = s.product_name
		if pname not in summary:
			summary[pname] = {
				'product_name': pname,
				'suppliers': set(),
				'branches': set(),
				'total_yield': 0.0,
			}
		summary[pname]['suppliers'].add(s.supplier_name)
		summary[pname]['branches'].add(s.assigned_branch)
		try:
			y = float(s.crop_yield)
		except Exception:
			y = 0.0
		summary[pname]['total_yield'] += y
	# Format for JSON
	result = []
	for v in summary.values():
		result.append({
			'product_name': v['product_name'],
			'num_suppliers': len(v['suppliers']),
			'num_branches': len([b for b in v['branches'] if b]),
			'total_yield': v['total_yield'],
		})
	return JsonResponse({'supply_chain': result})

from .models import Supplier
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

@csrf_exempt
def add_supplier(request):
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
				crop_yield=crop_yield
			)
			return JsonResponse({'success': True, 'message': 'Supplier added to supply chain'})
		except Exception as e:
			return JsonResponse({'success': False, 'error': str(e)})
	return JsonResponse({'success': False, 'error': 'Invalid request method'})
from .models import Route, Country
from operational_functions.routes_utils import calculate_route_on_the_fly, generate_routes_list, update_routes_on_change
from django.views.decorators.csrf import csrf_exempt
@csrf_exempt
def route_records_api(request):
	"""API endpoint to fetch all Route records for a given departure and arrival airport."""
	if request.method != 'POST':
		return JsonResponse({'error': 'POST required'}, status=405)
	import json
	try:
		data = json.loads(request.body.decode('utf-8'))
		departure = data.get('departure')
		arrival = data.get('arrival')
		if not departure or not arrival:
			return JsonResponse({'error': 'Both departure and arrival required'}, status=400)
		# Find all matching Route records (leg = 'DEP-ARR')
		leg = f"{departure} - {arrival}"
		routes = Route.objects.filter(leg=leg)
		results = []
		if not routes.exists():
			calculate_route_on_the_fly(departure, arrival)
			routes = Route.objects.filter(leg=leg)
		for r in routes:
			results.append({
				'id': r.id,
				'leg': r.leg,
				'distance': r.distance,
				'aircraft_type': str(r.aircraft_type),
				'provider': str(r.provider),
				'flight_time': r.flight_time,
				'adjusted_flight_time': r.adjusted_flight_time,
				'max_payload': r.max_payload,
				'service_type': r.service_type,
				'block_hours_cost': float(r.block_hours_cost),
				'route_fuel_gls': r.route_fuel_gls,
				'fuel_cost': float(r.fuel_cost),
				'overflight_fee': float(r.overflight_fee),
				'overflight_cost': float(r.overflight_cost),
				'airport_fees_cost': float(r.airport_fees_cost),
				'total_flight_cost': float(r.total_flight_cost),
			})
		return JsonResponse({'routes': results})
	except Exception as e:
		return JsonResponse({'error': str(e)}, status=500)
# --- Airport list API for Routes tab ---
from django.http import JsonResponse
from .models import Airport

def airport_list_api(request):
	airports = Airport.objects.all().order_by('iata_code')
	data = [
		{
			'code': a.iata_code, 
			'name': a.name,
			'iata_code': a.iata_code,
			'city': a.city,
			'country': a.country,
			'latitude': a.latitude,
			'longitude': a.longitude
		}
		for a in airports
	]
	return JsonResponse({'airports': data})
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, redirect, get_object_or_404
from .forms import AircraftForm, AirportForm, CharterProviderForm
from .models import Aircraft, Airport, CharterProvider, Product

# --- DELETE ENDPOINTS ---
@csrf_exempt
def delete_charter_provider(request, pk):
	if request.method == 'POST':
		try:
			provider = CharterProvider.objects.get(pk=pk)
			provider.delete()
			return JsonResponse({'success': True})
		except CharterProvider.DoesNotExist:
			return JsonResponse({'success': False, 'error': 'Provider not found'}, status=404)
	return HttpResponseNotAllowed(['POST'])

def edit_charter_provider(request, pk):
	try:
		provider = CharterProvider.objects.get(pk=pk)
	except CharterProvider.DoesNotExist:
		return JsonResponse({'success': False, 'error': 'Provider not found'}, status=404)
	
	if request.method == 'POST':
		form = CharterProviderForm(request.POST, instance=provider)
		if form.is_valid():
			form.save()
			# Update routes after provider changes
			update_routes_on_change()
			if request.headers.get('x-requested-with') == 'XMLHttpRequest':
				return JsonResponse({'success': True})
		if request.headers.get('x-requested-with') == 'XMLHttpRequest':
			return JsonResponse({'success': False, 'errors': form.errors}, status=400)
	else:
		form = CharterProviderForm(instance=provider)
	
	# Return JSON with form data for AJAX requests
	if request.headers.get('x-requested-with') == 'XMLHttpRequest':
		form_data = {
			'id': provider.id,
			'name': provider.name,
			'country': provider.country.id if provider.country else None,
			'main_base': provider.main_base.id if provider.main_base else None,
			'aircraft': provider.aircraft.id if provider.aircraft else None,
			'block_hour_cost': str(provider.block_hour_cost),
			'type': provider.type
		}
		return JsonResponse({'success': True, 'data': form_data})
	
	providers = CharterProvider.objects.all().order_by('name')
	return render(request, 'mode.html', {'form': form, 'providers': providers, 'editing': True, 'editing_id': pk})

@csrf_exempt
def delete_airport(request, pk):
	if request.method == 'POST':
		try:
			airport = Airport.objects.get(pk=pk)
			airport.delete()
			return JsonResponse({'success': True})
		except Airport.DoesNotExist:
			return JsonResponse({'success': False, 'error': 'Airport not found'}, status=404)
	return HttpResponseNotAllowed(['POST'])

@csrf_exempt
def delete_aircraft(request, pk):
	if request.method == 'POST':
		try:
			aircraft = Aircraft.objects.get(pk=pk)
			aircraft.delete()
			return JsonResponse({'success': True})
		except Aircraft.DoesNotExist:
			return JsonResponse({'success': False, 'error': 'Aircraft not found'}, status=404)
	return HttpResponseNotAllowed(['POST'])

def mode_tab(request):
	providers = CharterProvider.objects.all().order_by('name')
	if request.method == 'POST':
		form = CharterProviderForm(request.POST)
		if form.is_valid():
			form.save()
			# Update routes after provider changes
			update_routes_on_change()
			if request.headers.get('x-requested-with') == 'XMLHttpRequest':
				return JsonResponse({'success': True})
		# If invalid, return errors
		if request.headers.get('x-requested-with') == 'XMLHttpRequest':
			return JsonResponse({'success': False, 'errors': form.errors}, status=400)
	else:
		form = CharterProviderForm()
	return render(request, 'mode.html', {'form': form, 'providers': providers})

def edit_aircraft(request, pk):
	aircraft = Aircraft.objects.get(pk=pk)
	if request.method == 'POST':
		form = AircraftForm(request.POST, instance=aircraft)
		if form.is_valid():
			form.save()
			# Update routes after aircraft edits
			update_routes_on_change()
			if request.headers.get('x-requested-with') == 'XMLHttpRequest':
				return JsonResponse({'success': True})
			return redirect('home')
		# If invalid, return errors for AJAX
		if request.headers.get('x-requested-with') == 'XMLHttpRequest':
			return JsonResponse({'success': False, 'errors': form.errors}, status=400)
	else:
		form = AircraftForm(instance=aircraft)
	return render(request, 'add_aircraft.html', {'form': form, 'edit_mode': True, 'aircraft_id': pk})

def edit_airport(request, pk):
	airport = Airport.objects.get(pk=pk)
	if request.method == 'POST':
		form = AirportForm(request.POST, instance=airport)
		if form.is_valid():
			form.save()
			# Update routes after airport edits
			update_routes_on_change()
			if request.headers.get('x-requested-with') == 'XMLHttpRequest':
				return JsonResponse({'success': True})
			return redirect('home')
		# If invalid, return errors for AJAX
		if request.headers.get('x-requested-with') == 'XMLHttpRequest':
			return JsonResponse({'success': False, 'errors': form.errors}, status=400)
	else:
		form = AirportForm(instance=airport)
	return render(request, 'add_airport.html', {'form': form, 'edit_mode': True, 'airport_id': pk})

def home(request):
	# Populate routes if empty on initial page load
	if not Route.objects.exists():
		generate_routes_list()
	airports = Airport.objects.all().order_by('country', 'city', 'name')
	aircraft_list = Aircraft.objects.all().order_by('manufacturer', 'model', 'short_name')
	return render(request, 'home.html', {'airports': airports, 'aircraft_list': aircraft_list})


def add_aircraft(request):
	if request.method == 'POST':
		form = AircraftForm(request.POST)
		if form.is_valid():
			form.save()
			# Update routes after adding aircraft
			update_routes_on_change()
			if request.headers.get('x-requested-with') == 'XMLHttpRequest':
				return JsonResponse({'success': True})
			return redirect('home')
		# If invalid, return errors for AJAX
		if request.headers.get('x-requested-with') == 'XMLHttpRequest':
			return JsonResponse({'success': False, 'errors': form.errors}, status=400)
	else:
		form = AircraftForm()
	return render(request, 'add_aircraft.html', {'form': form})


def regions_api(request):
	"""API endpoint to fetch all unique regions from Country table."""
	from .models import Country
	regions = Country.objects.values_list('region', flat=True).distinct().order_by('region')
	return JsonResponse({'regions': list(regions)})


def region_core_data_tab(request):
	"""Render the Region Core Data tab content as a template.

	This is loaded dynamically by the front-end via fetch + DOMParser,
	so it only needs to return the inner tab markup and scripts.
	"""
	return render(request, 'region_core_data.html')


def user_management_tab(request):
	"""Render the User Management (Commercial Structure Management) tab content."""
	return render(request, 'user_management.html')


def branch_information_tab(request):
	"""Render the Branch Information tab content."""
	return render(request, 'branch_information.html')

def add_airport(request):
	airports = Airport.objects.all().order_by('country', 'city', 'name')
	if request.method == 'POST':
		form = AirportForm(request.POST)
		if form.is_valid():
			form.save()
			# Update routes after adding airport
			update_routes_on_change()
			if request.headers.get('x-requested-with') == 'XMLHttpRequest':
				return JsonResponse({'success': True})
			return redirect('home')
	else:
		form = AirportForm()
	return render(request, 'add_airport.html', {'form': form, 'airports': airports})
from django.http import JsonResponse
from django.conf import settings
from pathlib import Path
from .models import Product, Country, BranchInfo, Airport, ProductDiagnosis
from financialsim.market_tools.exchange_rate import get_exchange_rate
from financialsim.market_tools.market_diagnosis import (
	run_market_diagnosis_for_country,
	start_market_diagnosis_job,
	is_market_diagnosis_running,
)
import logging

logger = logging.getLogger(__name__)


def products_api(request):
	"""Return imported products plus any existing market diagnosis data.

	The "country" (or country_code) parameter selects the country of diagnosis:
	- Products from that country are excluded (only imports).
	- If ProductDiagnosis rows exist for that country name + product_code,
	  their fields are attached to the JSON so the Import tab can show
	  supermarket, local cost, price margin, availability, and updated date.
	"""

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

	# Pre-load any existing diagnosis rows for this country + product set
	diagnosis_map = {}
	if country and products:
		codes = [p.product_code for p in products]
		diag_qs = ProductDiagnosis.objects.filter(
			country_of_diagnosis=country.name,
			product_code__in=codes,
		)
		diagnosis_map = {d.product_code: d for d in diag_qs}

	data = []
	for p in products:
		diag = diagnosis_map.get(p.product_code)
		data.append({
			'product_id': p.id,
			'product_code': p.product_code,
			'product_type': p.product_type,
			'name': p.name,
			'country_name': p.country.name if p.country else '',
			'country_code': p.country.country_code if p.country else '',
			'trade_unit': p.trade_unit,
			'fca_cost_per_wu': float(p.fca_cost_per_wu),
			'updated_at': p.updated_at.isoformat() if hasattr(p, 'updated_at') and p.updated_at else '',
			'packaging': p.packaging,
			'currency': p.currency,
			# Diagnosis fields
			'supermarket_name': diag.supermarket_name if diag else None,
			'local_cost': float(diag.local_cost) if diag and diag.local_cost is not None else None,
			'price_margin': float(diag.price_margin) if diag and diag.price_margin is not None else None,
			'availability': diag.availability if diag else 0,
			'updated_date': diag.updated.isoformat() if diag and diag.updated else '',
		})
	return JsonResponse({'products': data})


def exchange_rate_api(request):
	"""Return exchange rate between two currencies using exchange_rate utility.

	Expected query params:
	- from: source currency code (e.g. EUR)
	- to: target currency code (e.g. USD), defaults to USD
	"""
	from_currency = request.GET.get('from') or request.GET.get('source')
	to_currency = request.GET.get('to') or 'USD'
	if not from_currency:
		return JsonResponse({'error': 'Missing from currency'}, status=400)
	try:
		rate = get_exchange_rate(from_currency, to_currency)
	except Exception as e:  # pragma: no cover - simple error passthrough
		return JsonResponse({'error': str(e)}, status=500)
	return JsonResponse({'rate': rate, 'from': from_currency.upper(), 'to': to_currency.upper()})


def country_has_retail_scraper_api(request):
	"""Return whether the selected country has any retail price scraper."""
	country_code = request.GET.get('country') or request.GET.get('country_code')
	if not country_code:
		return JsonResponse({'has_scraper': False})

	try:
		country = Country.objects.get(country_code=country_code)
	except Country.DoesNotExist:
		return JsonResponse({'has_scraper': False})

	# Get all airport IATA codes linked to this country via BranchInfo
	airport_codes = set(
		BranchInfo.objects.filter(country=country)
		.values_list('airport__iata_code', flat=True)
	)

	# Fallback: also include airports whose country text matches the country name
	if not airport_codes:
		airport_codes.update(
			Airport.objects.filter(country__icontains=country.name)
			.values_list('iata_code', flat=True)
		)

	if not airport_codes:
		return JsonResponse({'has_scraper': False})

	# Discover scraper files by IATA prefix in financialsim/market_tools (recursively)
	scraper_dir = Path(settings.BASE_DIR) / 'financialsim' / 'market_tools'
	codes_with_scrapers = set()
	if scraper_dir.exists():
		for py_file in scraper_dir.rglob('*.py'):
			name = py_file.name
			if name.startswith('__'):
				continue
			prefix = name.split('_', 1)[0]
			if len(prefix) == 3:
				codes_with_scrapers.add(prefix.upper())

	has_scraper = any((code or '').upper() in codes_with_scrapers for code in airport_codes)
	return JsonResponse({'has_scraper': bool(has_scraper)})


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
		# If a job is already running for this country, just report status.
		if is_market_diagnosis_running(country):
			# Fall through to status computation below
			processed = None
		else:
			started = start_market_diagnosis_job(country)
			if started:
				processed = 0
			else:
				processed = None
	except Exception as exc:  # pragma: no cover - runtime/scraper/OpenAI failures
		logger.exception("Market diagnosis failed for country %s: %s", country.name, exc)
		return JsonResponse({'error': 'Market diagnosis failed'}, status=500)

	# Compute simple summary stats for status indicator in the UI
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
			# Ignore product_code from POST, generate it here
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

			# Map product_type to initials
			type_initials = {
				'Produce': 'PR',
				'Meats': 'ME',
				'Other Perishable': 'OP',
				'Dry Goods': 'DG',
				'Technology': 'TE',
				'Other': 'OT',
			}
			prefix = type_initials.get(product_type, 'XX')
			# Find the highest sequence for this prefix
			from django.db.models import Max
			max_code = Product.objects.filter(product_code__startswith=prefix).aggregate(Max('product_code'))['product_code__max']
			if max_code:
				# Extract the numeric part
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
				other_info=other_info
			)

			# Integrate USDA code assignment
			try:
				from financialsim.market_tools.usda_pricing import get_usda_product
				usda_info = get_usda_product(name)
				if usda_info:
					# Update product_code and other fields if mapping found
					product.product_code = usda_info.get("product_code", product.product_code)
					product.other_info = (product.other_info or "") + f" | USDA: {usda_info.get('other_info', '')}"
					product.save()
			except Exception as e:
				# Log error, but don't block product creation
				print(f"USDA code assignment failed: {e}")
			return JsonResponse({'success': True, 'message': 'Product added successfully', 'product_code': product_code})
		except Exception as e:
			return JsonResponse({'success': False, 'error': str(e)})
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
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid request method'})
