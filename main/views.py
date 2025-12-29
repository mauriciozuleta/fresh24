from .models import Route
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
		{'code': a.iata_code, 'name': a.name}
		for a in airports
	]
	return JsonResponse({'airports': data})
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, redirect
from .forms import AircraftForm, AirportForm, CharterProviderForm
from .models import Aircraft, Airport, CharterProvider

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
