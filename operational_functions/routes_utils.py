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
    charter_types = [c[0] for c in CharterProvider.TYPE_CHOICES]

    routes_created = 0
    with transaction.atomic():
        for from_airport in airports:
            for to_airport in airports:
                if from_airport == to_airport:
                    continue
                distance_nm = calculate_distance(from_airport.iata_code, to_airport.iata_code)
                if not distance_nm:
                    continue
                for aircraft in aircrafts:
                    for charter_type in charter_types:
                        # Placeholder: Replace with actual calculations for all required fields
                        # (flight time, adjusted time, payload, costs, etc.)
                        # Use logic from add_route.html and flight_distances.py
                        flight_time_hr = distance_nm / aircraft.cruise_speed if aircraft.cruise_speed else 0
                        adjusted_flight_time_hr = round((flight_time_hr * 2 + 0.99) // 1) / 2  # round up to next 0.5
                        max_payload_lbs = aircraft.max_payload_lbs
                        block_hour_cost = getattr(aircraft, 'acmi_cost', 0) * adjusted_flight_time_hr
                        fuel_burn_lbs = aircraft.fuel_burn_lbs * flight_time_hr
                        fuel_cost = 0  # Placeholder, requires airport fuel cost
                        overflight_cost = distance_nm * 0.2
                        airport_fees = from_airport.airport_fee + to_airport.airport_fee
                        total_leg_cost = block_hour_cost + fuel_cost + overflight_cost + airport_fees
                        details = {
                            'from': from_airport.iata_code,
                            'to': to_airport.iata_code,
                            'distance_nm': distance_nm,
                            'flight_time_hr': flight_time_hr,
                            'adjusted_flight_time_hr': adjusted_flight_time_hr,
                            'max_payload_lbs': max_payload_lbs,
                            'block_hour_cost': block_hour_cost,
                            'fuel_burn_lbs': fuel_burn_lbs,
                            'fuel_cost': fuel_cost,
                            'overflight_cost': overflight_cost,
                            'airport_fees': airport_fees,
                            'total_leg_cost': total_leg_cost,
                        }
                        Route.objects.update_or_create(
                            aircraft=aircraft,
                            from_airport=from_airport,
                            to_airport=to_airport,
                            charter_type=charter_type,
                            defaults={
                                'distance_nm': distance_nm,
                                'flight_time_hr': flight_time_hr,
                                'adjusted_flight_time_hr': adjusted_flight_time_hr,
                                'max_payload_lbs': max_payload_lbs,
                                'block_hour_cost': block_hour_cost,
                                'fuel_burn_lbs': fuel_burn_lbs,
                                'fuel_cost': fuel_cost,
                                'overflight_cost': overflight_cost,
                                'airport_fees': airport_fees,
                                'total_leg_cost': total_leg_cost,
                                'details': details,
                            }
                        )
                        routes_created += 1
    return routes_created



def update_routes_on_change():
    """
    Call this function after any airport, aircraft, or charter provider is added/updated/deleted.
    """
    return generate_routes_list()
