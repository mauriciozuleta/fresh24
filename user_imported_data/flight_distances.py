import math
import requests
import csv
from io import StringIO

# OpenFlights data source
API_URL = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat"

def get_airport_coordinates(iata_code):
    response = requests.get(API_URL)
    if response.status_code != 200:
        return None

    reader = csv.reader(StringIO(response.text))
    for fields in reader:
        if len(fields) > 7 and fields[4].strip('"') == iata_code:
            try:
                lat = float(fields[6])
                lon = float(fields[7])
                return lat, lon
            except (ValueError, IndexError):
                continue
    return None

def calculate_distance(origin_iata, destination_iata):
    coords1 = get_airport_coordinates(origin_iata)
    coords2 = get_airport_coordinates(destination_iata)

    if not coords1 or not coords2:
        return None

    lat1, lon1 = map(math.radians, coords1)
    lat2, lon2 = map(math.radians, coords2)

    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    a = math.sin(delta_lat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    earth_radius_nm = 3440.065
    return round(earth_radius_nm * c, 2)

def extract_route_distances(route):
    distances = {}

    if route.origin and route.destination:
        distances['OD'] = calculate_distance(route.origin, route.destination)

    if route.destination and route.leg_3:
        distances['D-L3'] = calculate_distance(route.destination, route.leg_3)
    if route.leg_3 and route.leg_4:
        distances['L3-L4'] = calculate_distance(route.leg_3, route.leg_4)
    if route.leg_4 and route.leg_5:
        distances['L4-L5'] = calculate_distance(route.leg_4, route.leg_5)
    if route.leg_5 and route.leg_6:
        distances['L5-L6'] = calculate_distance(route.leg_5, route.leg_6)

    clean_values = [d for d in distances.values() if d is not None]
    distances['Total'] = round(sum(clean_values), 2)

    return distances

def estimate_flight_times(distances, average_speed_knots=480):
    flight_times = {}

    for leg, dist in distances.items():
        if leg == 'Total' or dist is None:
            continue
        time_hr = dist / average_speed_knots
        flight_times[leg] = round(time_hr, 2)

    flight_times['Total'] = round(sum(flight_times.values()), 2)
    return flight_times

def calculate_fuel_burn(flight_times, aircraft):
    if not flight_times or 'Total' not in flight_times:
        return None

    burn_rate = aircraft.fuel_burn_lbs
    total_time = flight_times['Total']

    fuel_burn_total = burn_rate * total_time
    return round(fuel_burn_total, 2)