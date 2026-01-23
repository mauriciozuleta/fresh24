import json

from django.http import HttpResponseNotAllowed, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.csrf import csrf_exempt

from operational_functions.routes_utils import (
    calculate_route_on_the_fly,
    generate_routes_list,
    update_routes_on_change,
)
from .forms import AircraftForm, AirportForm, CharterProviderForm
from .models import Aircraft, Airport, CharterProvider, Country, Route


@csrf_exempt
def route_records_api(request):
    """Fetch Route records for a given departure and arrival airport."""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
        departure = data.get('departure')
        arrival = data.get('arrival')
        if not departure or not arrival:
            return JsonResponse({'error': 'Both departure and arrival required'}, status=400)
        leg = f"{departure} - {arrival}"
        routes = Route.objects.filter(leg=leg)
        results = []
        if not routes.exists():
            calculate_route_on_the_fly(departure, arrival)
            routes = Route.objects.filter(leg=leg)
        for route in routes:
            results.append({
                'id': route.id,
                'leg': route.leg,
                'distance': route.distance,
                'aircraft_type': str(route.aircraft_type),
                'provider': str(route.provider),
                'flight_time': route.flight_time,
                'adjusted_flight_time': route.adjusted_flight_time,
                'max_payload': route.max_payload,
                'service_type': route.service_type,
                'block_hours_cost': float(route.block_hours_cost),
                'route_fuel_gls': route.route_fuel_gls,
                'fuel_cost': float(route.fuel_cost),
                'overflight_fee': float(route.overflight_fee),
                'overflight_cost': float(route.overflight_cost),
                'airport_fees_cost': float(route.airport_fees_cost),
                'total_flight_cost': float(route.total_flight_cost),
            })
        return JsonResponse({'routes': results})
    except Exception as exc:
        return JsonResponse({'error': str(exc)}, status=500)


def airport_list_api(request):
    airports = Airport.objects.all().order_by('iata_code')
    data = [
        {
            'code': airport.iata_code,
            'name': airport.name,
            'iata_code': airport.iata_code,
            'city': airport.city,
            'country': airport.country,
            'latitude': airport.latitude,
            'longitude': airport.longitude,
        }
        for airport in airports
    ]
    return JsonResponse({'airports': data})


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
            update_routes_on_change()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'errors': form.errors}, status=400)
    else:
        form = CharterProviderForm(instance=provider)

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        form_data = {
            'id': provider.id,
            'name': provider.name,
            'country': provider.country.id if provider.country else None,
            'main_base': provider.main_base.id if provider.main_base else None,
            'aircraft': provider.aircraft.id if provider.aircraft else None,
            'block_hour_cost': str(provider.block_hour_cost),
            'type': provider.type,
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
            update_routes_on_change()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
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
            update_routes_on_change()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            return redirect('home')
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
            update_routes_on_change()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            return redirect('home')
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'errors': form.errors}, status=400)
    else:
        form = AirportForm(instance=airport)
    return render(request, 'add_airport.html', {'form': form, 'edit_mode': True, 'airport_id': pk})


def home(request):
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
            update_routes_on_change()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            return redirect('home')
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'errors': form.errors}, status=400)
    else:
        form = AircraftForm()
    return render(request, 'add_aircraft.html', {'form': form})


def regions_api(request):
    regions = Country.objects.values_list('region', flat=True).distinct().order_by('region')
    return JsonResponse({'regions': list(regions)})


def region_core_data_tab(request):
    return render(request, 'region_core_data.html')


def user_management_tab(request):
    return render(request, 'user_management.html')


def branch_information_tab(request):
    return render(request, 'branch_information.html')


def add_airport(request):
    airports = Airport.objects.all().order_by('country', 'city', 'name')
    if request.method == 'POST':
        form = AirportForm(request.POST)
        if form.is_valid():
            form.save()
            update_routes_on_change()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            return redirect('home')
    else:
        form = AirportForm()
    return render(request, 'add_airport.html', {'form': form, 'airports': airports})
