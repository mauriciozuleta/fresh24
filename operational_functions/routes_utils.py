def calculate_route_on_the_fly(departure_code, arrival_code):
    """
    Calculate and SAVE route data for all aircraft/providers for a given departure and arrival IATA code.
    Returns nothing; records are saved to DB.
    """
    from main.models import Airport, Aircraft, CharterProvider, Route
    try:
        from_airport = Airport.objects.get(iata_code=departure_code)
        to_airport = Airport.objects.get(iata_code=arrival_code)
    except Airport.DoesNotExist:
        return
    if from_airport == to_airport:
        return
    distance_nm = calculate_distance(from_airport.iata_code, to_airport.iata_code)
    if not distance_nm:
        return
    aircrafts = list(Aircraft.objects.all())
    charter_types = ['charter', 'acmi']
    def get_payload_factor(altitude):
        if altitude is None:
            return 0
        if altitude < 4000:
            return 0
        elif 4000 <= altitude < 5000:
            return 0.02
        elif 5000 <= altitude < 6000:
            return 0.05
        elif 6000 <= altitude < 7500:
            return 0.10
        elif 7500 <= altitude < 9000:
            return 0.12
        elif altitude >= 9000:
            return 0.16
        return 0
    for aircraft in aircrafts:
        flight_time = distance_nm / aircraft.cruise_speed if aircraft.cruise_speed else 0
        adjusted_flight_time = (int(flight_time) if flight_time == int(flight_time) else (int(flight_time) + 0.5 if flight_time % 1 <= 0.5 else int(flight_time) + 1))
        payload_factor = get_payload_factor(from_airport.altitude_ft)
        max_payload = aircraft.max_payload_lbs * (1 - payload_factor)
        for provider in CharterProvider.objects.filter(aircraft=aircraft, type__in=charter_types):
            service_type = provider.type
            provider_block_hour_cost = float(provider.block_hour_cost)
            if service_type == 'charter':
                block_hours_cost = adjusted_flight_time * provider_block_hour_cost
                block_hours_cost = round(block_hours_cost / 500) * 500
                route_fuel_gls = 0
                fuel_cost = 0
                overflight_fee = 0.3
                overflight_cost = 0
                airport_fees_cost = 0
                total_flight_cost = block_hours_cost
            elif service_type == 'acmi':
                block_hours_cost = adjusted_flight_time * provider_block_hour_cost
                route_fuel_gls = aircraft.fuel_burn_gal * adjusted_flight_time
                fuel_cost = from_airport.fuel_cost_gl * route_fuel_gls
                overflight_fee = 0.3
                overflight_cost = distance_nm * overflight_fee
                airport_fees_cost = aircraft.mtow_kg * from_airport.airport_fee
                total_flight_cost = block_hours_cost + fuel_cost + overflight_cost + airport_fees_cost
            Route.objects.create(
                leg=f"{departure_code} - {arrival_code}",
                distance=distance_nm,
                aircraft_type=aircraft,
                provider=provider,
                flight_time=flight_time,
                adjusted_flight_time=adjusted_flight_time,
                max_payload=max_payload,
                service_type=service_type,
                block_hours_cost=block_hours_cost,
                route_fuel_gls=route_fuel_gls,
                fuel_cost=fuel_cost,
                overflight_fee=overflight_fee,
                overflight_cost=overflight_cost,
                airport_fees_cost=airport_fees_cost,
                total_flight_cost=total_flight_cost
            )
"""
This module will handle the logic for generating and updating the list of available routes
by iterating over airports, aircrafts, and service types. It will provide functions to be called
whenever an airport, aircraft, or service provider is added, deleted, or updated.

Functions to implement:
- generate_routes_list(): Generates the current list of routes
- update_routes_on_change(): Updates the routes list when related data changes

You can provide the pseudo code and any files to refactor next.
"""

# Placeholder for route generation logic


import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'financialsim.settings')
django.setup()

from main.models import Airport, Aircraft, CharterProvider, Route
from django.db import transaction
from user_imported_data.flight_distances import calculate_distance

def generate_routes_list():
    """
    Generate and update the list of available routes by iterating airports, aircraft, and charter types.
    This function should be called whenever an airport, aircraft, or charter provider is added/updated/deleted.
    """

    airports = list(Airport.objects.all())
    aircrafts = list(Aircraft.objects.all())
    charter_types = ['charter', 'acmi']

    # Altitude gradient table
    def get_payload_factor(altitude):
        if altitude is None:
            return 0
        if altitude < 4000:
            return 0
        elif 4000 <= altitude < 5000:
            return 0.02
        elif 5000 <= altitude < 6000:
            return 0.05
        elif 6000 <= altitude < 7500:
            return 0.10
        elif 7500 <= altitude < 9000:
            return 0.12
        elif altitude >= 9000:
            return 0.16
        return 0

    routes_created = 0
    with transaction.atomic():
        for from_airport in airports:
            for to_airport in airports:
                if from_airport == to_airport:
                    continue
                distance_nm = calculate_distance(from_airport.iata_code, to_airport.iata_code)
                if not distance_nm:
                    continue
                leg = f"{from_airport.iata_code} - {to_airport.iata_code}"
                for aircraft in aircrafts:
                    # Calculate flight time and adjusted flight time
                    flight_time = distance_nm / aircraft.cruise_speed if aircraft.cruise_speed else 0
                    # Adjusted: round up to next 0.5
                    adjusted_flight_time = (int(flight_time) if flight_time == int(flight_time) else (int(flight_time) + 0.5 if flight_time % 1 <= 0.5 else int(flight_time) + 1))
                    # Payload adjustment for altitude
                    payload_factor = get_payload_factor(from_airport.altitude_ft)
                    max_payload = aircraft.max_payload_lbs * (1 - payload_factor)
                    # For each provider for this aircraft and service type
                    for provider in CharterProvider.objects.filter(aircraft=aircraft, type__in=charter_types):
                        service_type = provider.type
                        provider_block_hour_cost = float(provider.block_hour_cost)
                        if service_type == 'charter':
                            block_hours_cost = adjusted_flight_time * provider_block_hour_cost
                            block_hours_cost = round(block_hours_cost / 500) * 500
                            route_fuel_gls = 0
                            fuel_cost = 0
                            overflight_fee = 0.3
                            overflight_cost = 0
                            airport_fees_cost = 0
                            total_flight_cost = block_hours_cost
                        elif service_type == 'acmi':
                            block_hours_cost = adjusted_flight_time * provider_block_hour_cost
                            route_fuel_gls = aircraft.fuel_burn_gal * adjusted_flight_time
                            fuel_cost = from_airport.fuel_cost_gl * route_fuel_gls
                            overflight_fee = 0.3
                            overflight_cost = distance_nm * overflight_fee
                            airport_fees_cost = aircraft.mtow_kg * from_airport.airport_fee
                            total_flight_cost = block_hours_cost + fuel_cost + overflight_cost + airport_fees_cost

                        Route.objects.update_or_create(
                            leg=leg,
                            distance=distance_nm,
                            aircraft_type=aircraft,
                            provider=provider,
                            flight_time=flight_time,
                            adjusted_flight_time=adjusted_flight_time,
                            max_payload=max_payload,
                            service_type=service_type,
                            block_hours_cost=block_hours_cost,
                            route_fuel_gls=route_fuel_gls,
                            fuel_cost=fuel_cost,
                            overflight_fee=overflight_fee,
                            overflight_cost=overflight_cost,
                            airport_fees_cost=airport_fees_cost,
                            total_flight_cost=total_flight_cost
                        )
                        routes_created += 1
    return routes_created



def update_routes_on_change():
    """
    Call this function after any airport, aircraft, or charter provider is added/updated/deleted.
    """
    return generate_routes_list()
