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
			return redirect('home')
	else:
		form = AircraftForm(instance=aircraft)
	return render(request, 'add_aircraft.html', {'form': form, 'edit_mode': True, 'aircraft_id': pk})

def edit_airport(request, pk):
	airport = Airport.objects.get(pk=pk)
	if request.method == 'POST':
		form = AirportForm(request.POST, instance=airport)
		if form.is_valid():
			form.save()
			return redirect('home')
	else:
		form = AirportForm(instance=airport)
	return render(request, 'add_airport.html', {'form': form, 'edit_mode': True, 'airport_id': pk})

def home(request):
	airports = Airport.objects.all().order_by('country', 'city', 'name')
	aircraft_list = Aircraft.objects.all().order_by('manufacturer', 'model', 'short_name')
	return render(request, 'home.html', {'airports': airports, 'aircraft_list': aircraft_list})


def add_aircraft(request):
	if request.method == 'POST':
		form = AircraftForm(request.POST)
		if form.is_valid():
			form.save()
			return redirect('home')
	else:
		form = AircraftForm()
	return render(request, 'add_aircraft.html', {'form': form})


def add_airport(request):
	airports = Airport.objects.all().order_by('country', 'city', 'name')
	if request.method == 'POST':
		form = AirportForm(request.POST)
		if form.is_valid():
			form.save()
			if request.headers.get('x-requested-with') == 'XMLHttpRequest':
				return JsonResponse({'success': True})
			return redirect('home')
	else:
		form = AirportForm()
	return render(request, 'add_airport.html', {'form': form, 'airports': airports})
