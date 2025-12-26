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

from django.shortcuts import render, redirect
from .forms import AircraftForm, AirportForm
from .models import Aircraft, Airport


def home(request):
	from .models import Airport, Aircraft
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
				from django.http import JsonResponse
				return JsonResponse({'success': True})
			return redirect('home')
	else:
		form = AirportForm()
	return render(request, 'add_airport.html', {'form': form, 'airports': airports})
