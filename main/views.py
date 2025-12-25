
from django.shortcuts import render, redirect
from .forms import AircraftForm, AirportForm
from .models import Aircraft, Airport


def home(request):
	return render(request, 'home.html')


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
	return render(request, 'add_airport.html', {'form': form})
