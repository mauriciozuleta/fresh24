import requests
import csv
from io import StringIO
from typing import Optional, Tuple

def get_airport_coordinates_and_altitude(iata_code: str) -> Optional[Tuple[float, float, float, str]]:
    """
    Fetch airport latitude, longitude, altitude (in feet), name, city, and country using OpenFlights data.
    Args:
        iata_code (str): The 3-letter IATA airport code.
    Returns:
        (latitude, longitude, altitude_ft, airport_name, city, country) if found, else None.
    """
    iata = iata_code.strip().upper()
    if not iata or len(iata) != 3:
        return None

    API_URL = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat"
    try:
        resp = requests.get(API_URL, timeout=10)
        if resp.ok:
            reader = csv.reader(StringIO(resp.text))
            for fields in reader:
                if len(fields) > 8 and fields[4].strip('"').upper() == iata:
                    try:
                        airport_name = fields[1].strip('"') if len(fields) > 1 else None
                        city = fields[2].strip('"') if len(fields) > 2 else None
                        country = fields[3].strip('"') if len(fields) > 3 else None
                        latitude = float(fields[6]) if fields[6] else None
                        longitude = float(fields[7]) if fields[7] else None
                        altitude_ft = float(fields[8]) if fields[8] and fields[8] != '\\N' else None
                        if latitude is not None and longitude is not None and altitude_ft is not None and airport_name and city and country:
                            return latitude, longitude, altitude_ft, airport_name, city, country
                    except (ValueError, IndexError):
                        continue
    except Exception:
        pass
    return None
