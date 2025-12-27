"""
High-Performance Route Generation Module

This module generates flight routes by iterating over airports, aircraft, and charter providers.
Architecture:
    Layer 1: Data Loading - Load all DB data once into memory
    Layer 2: Pure Computation - All calculations in pure Python (GPU-ready)
    Layer 3: Bulk Database Operations - Bulk create/update routes

Performance optimizations:
    - No ORM calls inside loops
    - Precomputed lookup dictionaries
    - Bulk database operations
    - Distance caching
    - GPU-friendly pure computation functions
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Set
import os
import django

# Django setup (only if not already configured)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'financialsim.settings')
django.setup()

from django.db import transaction
from main.models import Airport, Aircraft, CharterProvider, Route


# =============================================================================
# DATA CLASSES (for type safety and clarity)
# =============================================================================

@dataclass
class AirportData:
    """Lightweight airport data for computation."""
    id: int
    iata_code: str
    latitude: Optional[float]
    longitude: Optional[float]
    altitude_ft: Optional[int]
    fuel_cost_gl: float
    airport_fee: float


@dataclass
class AircraftData:
    """Lightweight aircraft data for computation."""
    id: int
    short_name: str
    cruise_speed: float
    max_payload_lbs: float
    fuel_burn_gal: float
    mtow_kg: float


@dataclass
class ProviderData:
    """Lightweight provider data for computation."""
    id: int
    name: str
    aircraft_id: int
    block_hour_cost: float
    service_type: str  # 'charter' or 'acmi'


@dataclass
class RouteMetrics:
    """Computed route metrics."""
    leg: str
    distance_nm: float
    aircraft_id: int
    provider_id: int
    flight_time: float
    adjusted_flight_time: float
    max_payload: float
    service_type: str
    block_hours_cost: float
    route_fuel_gls: float
    fuel_cost: float
    overflight_fee: float
    overflight_cost: float
    airport_fees_cost: float
    total_flight_cost: float


# =============================================================================
# LAYER 1: DATA LOADING
# =============================================================================

def load_airports() -> Dict[str, AirportData]:
    """
    Load all airports into a dictionary keyed by IATA code.
    
    Returns:
        Dict mapping IATA code to AirportData
    """
    airports = {}
    for airport in Airport.objects.all():
        airports[airport.iata_code] = AirportData(
            id=airport.id,
            iata_code=airport.iata_code,
            latitude=airport.latitude,
            longitude=airport.longitude,
            altitude_ft=airport.altitude_ft,
            fuel_cost_gl=float(airport.fuel_cost_gl or 0),
            airport_fee=float(airport.airport_fee or 0),
        )
    return airports


def load_aircraft() -> Dict[int, AircraftData]:
    """
    Load all aircraft into a dictionary keyed by ID.
    
    Returns:
        Dict mapping aircraft ID to AircraftData
    """
    aircraft_dict = {}
    for ac in Aircraft.objects.all():
        aircraft_dict[ac.id] = AircraftData(
            id=ac.id,
            short_name=ac.short_name,
            cruise_speed=float(ac.cruise_speed or 0),
            max_payload_lbs=float(ac.max_payload_lbs or 0),
            fuel_burn_gal=float(ac.fuel_burn_gal or 0),
            mtow_kg=float(ac.mtow_kg or 0),
        )
    return aircraft_dict


def load_providers() -> Tuple[List[ProviderData], Dict[int, List[ProviderData]]]:
    """
    Load all charter providers and create a lookup by aircraft ID.
    
    Returns:
        Tuple of (all providers list, dict mapping aircraft_id to list of providers)
    """
    providers = []
    providers_by_aircraft: Dict[int, List[ProviderData]] = {}
    
    valid_types = {'charter', 'acmi'}
    
    for provider in CharterProvider.objects.select_related('aircraft').all():
        if provider.type not in valid_types:
            continue
            
        pd = ProviderData(
            id=provider.id,
            name=provider.name,
            aircraft_id=provider.aircraft_id,
            block_hour_cost=float(provider.block_hour_cost or 0),
            service_type=provider.type,
        )
        providers.append(pd)
        
        if provider.aircraft_id not in providers_by_aircraft:
            providers_by_aircraft[provider.aircraft_id] = []
        providers_by_aircraft[provider.aircraft_id].append(pd)
    
    return providers, providers_by_aircraft


def load_existing_route_keys() -> Set[str]:
    """
    Load all existing route unique keys for deduplication.
    
    Returns:
        Set of route keys in format "LEG|aircraft_id|provider_id"
    """
    existing = set()
    for route in Route.objects.values_list('leg', 'aircraft_type_id', 'provider_id'):
        key = f"{route[0]}|{route[1]}|{route[2]}"
        existing.add(key)
    return existing


def load_all_data() -> Tuple[
    Dict[str, AirportData],
    Dict[int, AircraftData],
    List[ProviderData],
    Dict[int, List[ProviderData]],
    Set[str]
]:
    """
    Load all required data from the database in a single pass.
    
    Returns:
        Tuple of (airports_dict, aircraft_dict, providers_list, providers_by_aircraft, existing_route_keys)
    """
    airports = load_airports()
    aircraft = load_aircraft()
    providers, providers_by_aircraft = load_providers()
    existing_keys = load_existing_route_keys()
    
    return airports, aircraft, providers, providers_by_aircraft, existing_keys


# =============================================================================
# LAYER 2: PURE COMPUTATION (GPU-READY)
# =============================================================================

def calculate_distance_haversine(
    lat1: float, lon1: float,
    lat2: float, lon2: float
) -> float:
    """
    Calculate great-circle distance between two points using Haversine formula.
    
    This is a pure function with no I/O - can be vectorized with NumPy/CuPy.
    
    Args:
        lat1, lon1: Coordinates of first point (degrees)
        lat2, lon2: Coordinates of second point (degrees)
    
    Returns:
        Distance in nautical miles
    """
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    delta_lat = lat2_rad - lat1_rad
    delta_lon = lon2_rad - lon1_rad
    
    a = (math.sin(delta_lat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    EARTH_RADIUS_NM = 3440.065
    return round(EARTH_RADIUS_NM * c, 2)


def precompute_distances(
    airports: Dict[str, AirportData]
) -> Dict[Tuple[str, str], float]:
    """
    Precompute all pairwise distances between airports.
    
    Args:
        airports: Dictionary of airport data
    
    Returns:
        Dict mapping (from_iata, to_iata) to distance in nautical miles
    """
    distances: Dict[Tuple[str, str], float] = {}
    airport_list = list(airports.values())
    
    for i, from_ap in enumerate(airport_list):
        if from_ap.latitude is None or from_ap.longitude is None:
            continue
            
        for to_ap in airport_list[i+1:]:
            if to_ap.latitude is None or to_ap.longitude is None:
                continue
            if from_ap.iata_code == to_ap.iata_code:
                continue
                
            dist = calculate_distance_haversine(
                from_ap.latitude, from_ap.longitude,
                to_ap.latitude, to_ap.longitude
            )
            
            # Store both directions (symmetric)
            distances[(from_ap.iata_code, to_ap.iata_code)] = dist
            distances[(to_ap.iata_code, from_ap.iata_code)] = dist
    
    return distances


def get_payload_factor(altitude_ft: Optional[int]) -> float:
    """
    Calculate payload reduction factor based on departure airport altitude.
    
    This is a pure function - can be vectorized with NumPy/CuPy using np.select.
    
    Args:
        altitude_ft: Airport altitude in feet
    
    Returns:
        Payload reduction factor (0.0 to 0.16)
    """
    if altitude_ft is None or altitude_ft < 4000:
        return 0.0
    elif altitude_ft < 5000:
        return 0.02
    elif altitude_ft < 6000:
        return 0.05
    elif altitude_ft < 7500:
        return 0.10
    elif altitude_ft < 9000:
        return 0.12
    else:
        return 0.16


def calculate_adjusted_flight_time(flight_time: float) -> float:
    """
    Round flight time up to next 0.5 hour increment.
    
    This is a pure function - can be vectorized.
    
    Args:
        flight_time: Raw flight time in hours
    
    Returns:
        Adjusted flight time rounded to 0.5 increments
    """
    if flight_time == int(flight_time):
        return float(int(flight_time))
    elif flight_time % 1 <= 0.5:
        return float(int(flight_time)) + 0.5
    else:
        return float(int(flight_time) + 1)


def compute_route_metrics(
    from_iata: str,
    to_iata: str,
    distance_nm: float,
    aircraft: AircraftData,
    provider: ProviderData,
    from_airport: AirportData,
) -> RouteMetrics:
    """
    Compute all route metrics for a single route.
    
    This is a pure function with no I/O - can be parallelized or GPU-accelerated.
    
    Args:
        from_iata: Departure airport IATA code
        to_iata: Arrival airport IATA code
        distance_nm: Route distance in nautical miles
        aircraft: Aircraft data
        provider: Provider data
        from_airport: Departure airport data
    
    Returns:
        RouteMetrics with all computed values
    """
    # Flight time calculations
    flight_time = distance_nm / aircraft.cruise_speed if aircraft.cruise_speed > 0 else 0.0
    adjusted_flight_time = calculate_adjusted_flight_time(flight_time)
    
    # Payload calculation with altitude adjustment
    payload_factor = get_payload_factor(from_airport.altitude_ft)
    max_payload = aircraft.max_payload_lbs * (1.0 - payload_factor)
    
    # Cost calculations based on service type
    OVERFLIGHT_FEE_RATE = 0.3
    
    if provider.service_type == 'charter':
        # Charter: all-inclusive block hour rate
        block_hours_cost = adjusted_flight_time * provider.block_hour_cost
        block_hours_cost = round(block_hours_cost / 500) * 500  # Round to nearest 500
        route_fuel_gls = 0.0
        fuel_cost = 0.0
        overflight_cost = 0.0
        airport_fees_cost = 0.0
        total_flight_cost = block_hours_cost
    else:
        # ACMI: separate fuel, overflight, and airport fees
        block_hours_cost = adjusted_flight_time * provider.block_hour_cost
        route_fuel_gls = aircraft.fuel_burn_gal * adjusted_flight_time
        fuel_cost = from_airport.fuel_cost_gl * route_fuel_gls
        overflight_cost = distance_nm * OVERFLIGHT_FEE_RATE
        airport_fees_cost = aircraft.mtow_kg * from_airport.airport_fee
        total_flight_cost = block_hours_cost + fuel_cost + overflight_cost + airport_fees_cost
    
    return RouteMetrics(
        leg=f"{from_iata} - {to_iata}",
        distance_nm=distance_nm,
        aircraft_id=aircraft.id,
        provider_id=provider.id,
        flight_time=flight_time,
        adjusted_flight_time=adjusted_flight_time,
        max_payload=max_payload,
        service_type=provider.service_type,
        block_hours_cost=block_hours_cost,
        route_fuel_gls=route_fuel_gls,
        fuel_cost=fuel_cost,
        overflight_fee=OVERFLIGHT_FEE_RATE,
        overflight_cost=overflight_cost,
        airport_fees_cost=airport_fees_cost,
        total_flight_cost=total_flight_cost,
    )


def generate_all_route_metrics(
    airports: Dict[str, AirportData],
    aircraft: Dict[int, AircraftData],
    providers_by_aircraft: Dict[int, List[ProviderData]],
    distances: Dict[Tuple[str, str], float],
    existing_keys: Set[str],
    skip_existing: bool = True,
) -> List[RouteMetrics]:
    """
    Generate route metrics for all valid airport-aircraft-provider combinations.
    
    This is the main computation loop - no database calls.
    
    Args:
        airports: Dictionary of airport data
        aircraft: Dictionary of aircraft data
        providers_by_aircraft: Providers grouped by aircraft ID
        distances: Precomputed distances
        existing_keys: Set of existing route keys to skip
        skip_existing: Whether to skip routes that already exist
    
    Returns:
        List of RouteMetrics for all new routes
    """
    routes: List[RouteMetrics] = []
    airport_codes = list(airports.keys())
    
    for from_iata in airport_codes:
        from_airport = airports[from_iata]
        
        for to_iata in airport_codes:
            if from_iata == to_iata:
                continue
            
            # Get precomputed distance
            distance_nm = distances.get((from_iata, to_iata))
            if not distance_nm:
                continue
            
            # Generate routes for each aircraft and its providers
            for ac_id, ac_data in aircraft.items():
                providers = providers_by_aircraft.get(ac_id, [])
                
                for provider in providers:
                    # Check if route already exists
                    route_key = f"{from_iata} - {to_iata}|{ac_id}|{provider.id}"
                    if skip_existing and route_key in existing_keys:
                        continue
                    
                    # Compute metrics
                    metrics = compute_route_metrics(
                        from_iata=from_iata,
                        to_iata=to_iata,
                        distance_nm=distance_nm,
                        aircraft=ac_data,
                        provider=provider,
                        from_airport=from_airport,
                    )
                    routes.append(metrics)
    
    return routes


# =============================================================================
# LAYER 3: BULK DATABASE OPERATIONS
# =============================================================================

def create_route_objects(
    routes: List[RouteMetrics],
    aircraft: Dict[int, AircraftData],
) -> List[Route]:
    """
    Convert RouteMetrics to Django Route model instances.
    
    Args:
        routes: List of computed route metrics
        aircraft: Aircraft dictionary for FK lookups
    
    Returns:
        List of Route model instances (not yet saved)
    """
    route_objects = []
    
    for r in routes:
        route = Route(
            leg=r.leg,
            distance=r.distance_nm,
            aircraft_type_id=r.aircraft_id,
            provider_id=r.provider_id,
            flight_time=r.flight_time,
            adjusted_flight_time=r.adjusted_flight_time,
            max_payload=r.max_payload,
            service_type=r.service_type,
            block_hours_cost=Decimal(str(round(r.block_hours_cost, 2))),
            route_fuel_gls=r.route_fuel_gls,
            fuel_cost=Decimal(str(round(r.fuel_cost, 2))),
            overflight_fee=Decimal(str(round(r.overflight_fee, 2))),
            overflight_cost=Decimal(str(round(r.overflight_cost, 2))),
            airport_fees_cost=Decimal(str(round(r.airport_fees_cost, 2))),
            total_flight_cost=Decimal(str(round(r.total_flight_cost, 2))),
        )
        route_objects.append(route)
    
    return route_objects


def save_routes_bulk(
    route_objects: List[Route],
    batch_size: int = 1000,
) -> int:
    """
    Bulk insert routes into the database.
    
    Args:
        route_objects: List of Route model instances
        batch_size: Number of routes per batch
    
    Returns:
        Number of routes created
    """
    if not route_objects:
        return 0
    
    with transaction.atomic():
        Route.objects.bulk_create(route_objects, batch_size=batch_size)
    
    return len(route_objects)


def regenerate_all_routes(batch_size: int = 1000) -> int:
    """
    Delete all existing routes and regenerate from scratch.
    
    Use this for full refresh when data has changed significantly.
    
    Args:
        batch_size: Number of routes per bulk insert batch
    
    Returns:
        Number of routes created
    """
    with transaction.atomic():
        Route.objects.all().delete()
    
    # Load data
    airports, aircraft, providers, providers_by_aircraft, _ = load_all_data()
    
    # Precompute distances
    distances = precompute_distances(airports)
    
    # Generate route metrics (don't skip existing since we deleted all)
    route_metrics = generate_all_route_metrics(
        airports=airports,
        aircraft=aircraft,
        providers_by_aircraft=providers_by_aircraft,
        distances=distances,
        existing_keys=set(),
        skip_existing=False,
    )
    
    # Create and save routes
    route_objects = create_route_objects(route_metrics, aircraft)
    return save_routes_bulk(route_objects, batch_size=batch_size)


# =============================================================================
# PUBLIC API (Backward Compatible)
# =============================================================================

def generate_routes_list() -> int:
    """
    Generate and update the list of available routes.
    
    Adds new routes for any missing airport-aircraft-provider combinations.
    Skips existing routes for performance.
    
    Returns:
        Number of new routes created
    """
    # Load all data
    airports, aircraft, providers, providers_by_aircraft, existing_keys = load_all_data()
    
    # Precompute distances
    distances = precompute_distances(airports)
    
    # Generate only new route metrics
    route_metrics = generate_all_route_metrics(
        airports=airports,
        aircraft=aircraft,
        providers_by_aircraft=providers_by_aircraft,
        distances=distances,
        existing_keys=existing_keys,
        skip_existing=True,
    )
    
    if not route_metrics:
        return 0
    
    # Create and save routes
    route_objects = create_route_objects(route_metrics, aircraft)
    return save_routes_bulk(route_objects)


def update_routes_on_change() -> int:
    """
    Update routes after any airport, aircraft, or charter provider change.
    
    This is the main entry point called by views after data modifications.
    
    Returns:
        Number of new routes created
    """
    return generate_routes_list()


def calculate_route_on_the_fly(departure_code: str, arrival_code: str) -> int:
    """
    Generate routes for a specific airport pair or for new airports.
    
    If either airport is new (has no routes), generates all routes for that airport.
    Otherwise, generates only the requested route.
    
    Args:
        departure_code: IATA code of departure airport
        arrival_code: IATA code of arrival airport
    
    Returns:
        Number of routes created
    """
    # Load all data
    airports, aircraft, providers, providers_by_aircraft, existing_keys = load_all_data()
    
    # Verify airports exist
    if departure_code not in airports or arrival_code not in airports:
        return 0
    
    # Check if either airport is new (no existing routes)
    dep_has_routes = any(departure_code in key for key in existing_keys)
    arr_has_routes = any(arrival_code in key for key in existing_keys)
    
    # Determine which airport pairs to process
    if not dep_has_routes or not arr_has_routes:
        # Generate all routes for new airport(s)
        new_codes = set()
        if not dep_has_routes:
            new_codes.add(departure_code)
        if not arr_has_routes:
            new_codes.add(arrival_code)
        
        pairs = set()
        for new_code in new_codes:
            for iata in airports.keys():
                if iata != new_code:
                    pairs.add((new_code, iata))
                    pairs.add((iata, new_code))
    else:
        pairs = {(departure_code, arrival_code)}
    
    # Filter distances to only needed pairs
    all_distances = precompute_distances(airports)
    distances = {k: v for k, v in all_distances.items() if k in pairs}
    
    # Generate route metrics for the pairs
    routes: List[RouteMetrics] = []
    for from_iata, to_iata in pairs:
        from_airport = airports[from_iata]
        distance_nm = distances.get((from_iata, to_iata))
        if not distance_nm:
            continue
        
        for ac_id, ac_data in aircraft.items():
            for provider in providers_by_aircraft.get(ac_id, []):
                route_key = f"{from_iata} - {to_iata}|{ac_id}|{provider.id}"
                if route_key in existing_keys:
                    continue
                
                metrics = compute_route_metrics(
                    from_iata=from_iata,
                    to_iata=to_iata,
                    distance_nm=distance_nm,
                    aircraft=ac_data,
                    provider=provider,
                    from_airport=from_airport,
                )
                routes.append(metrics)
    
    if not routes:
        return 0
    
    route_objects = create_route_objects(routes, aircraft)
    return save_routes_bulk(route_objects)


# =============================================================================
# GPU-READY VECTORIZED FUNCTIONS (for future NumPy/CuPy implementation)
# =============================================================================

def compute_distances_vectorized_numpy(
    lats1, lons1, lats2, lons2
):
    """
    Vectorized distance calculation using NumPy.
    
    To enable: pip install numpy
    To use GPU: replace 'import numpy as np' with 'import cupy as np'
    
    Args:
        lats1, lons1: Arrays of origin coordinates (degrees)
        lats2, lons2: Arrays of destination coordinates (degrees)
    
    Returns:
        Array of distances in nautical miles
    """
    try:
        import numpy as np
    except ImportError:
        raise ImportError("NumPy required for vectorized computation. Install with: pip install numpy")
    
    EARTH_RADIUS_NM = 3440.065
    
    lat1_rad = np.radians(lats1)
    lon1_rad = np.radians(lons1)
    lat2_rad = np.radians(lats2)
    lon2_rad = np.radians(lons2)
    
    delta_lat = lat2_rad - lat1_rad
    delta_lon = lon2_rad - lon1_rad
    
    a = (np.sin(delta_lat / 2) ** 2 + 
         np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(delta_lon / 2) ** 2)
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    
    return np.round(EARTH_RADIUS_NM * c, 2)


def get_payload_factors_vectorized_numpy(altitudes):
    """
    Vectorized payload factor calculation using NumPy.
    
    Args:
        altitudes: Array of altitudes in feet
    
    Returns:
        Array of payload factors
    """
    try:
        import numpy as np
    except ImportError:
        raise ImportError("NumPy required for vectorized computation. Install with: pip install numpy")
    
    altitudes = np.asarray(altitudes, dtype=float)
    
    conditions = [
        altitudes < 4000,
        (altitudes >= 4000) & (altitudes < 5000),
        (altitudes >= 5000) & (altitudes < 6000),
        (altitudes >= 6000) & (altitudes < 7500),
        (altitudes >= 7500) & (altitudes < 9000),
        altitudes >= 9000,
    ]
    
    choices = [0.0, 0.02, 0.05, 0.10, 0.12, 0.16]
    
    return np.select(conditions, choices, default=0.0)
